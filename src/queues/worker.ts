import amqp from "amqplib";
import chromaClient from "../services/chroma";
import aiClient from "../services/ai";
import prisma from "../services/prisma";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

interface MessageData {
    cv: string;
    submission: string;
    jobId: string;
    title: string;
}

export async function startWorker() {
    const queue = "cv_evaluation_queue";
    const amqpUrl = process.env.AMQP_URL as string;
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    console.log("🧠 Worker waiting for messages...");

    channel.consume(queue, async (msg) => {
        if (msg !== null) {
            const { cv, submission, jobId, title } = JSON.parse(msg.content.toString()) as MessageData;
            console.log("📥 Received:", { cv, submission });

            const embeddingFunction = new OpenAIEmbeddingFunction({
                apiKey: process.env.OPENAI_API_KEY,
                modelName: "text-embedding-3-small",
            });

            const groundThruthCollection = await chromaClient.getCollection({
                name: "round_thruth",
                embeddingFunction
            });
            const roundThruth = await groundThruthCollection.query({
                queryTexts: [title, cv, submission]
            })
            console.log("Round thruth", roundThruth.documents);

            const aiResponse = await aiClient.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `
                            You are an AI evaluator with 100% rate accuration. 
                            Evaluate the candidate's CV and project report based on the given ground truth 
                            (ground truth is the referenced document for the RAG system) text documents, 
                            including the scoring rubric:
                            ${roundThruth.documents[0]}. 

                            Provide detailed feedback and a score following each specific material or section 
                            in the ground truth scoring rubric document.

                            Then you must always return **only** a JSON string that follows this exact format 
                            (no explanation, no markdown, no extra text):

                            {
                                "result": {
                                    "cv_match_rate": <number>, 
                                    "cv_feedback": "<string>",
                                    "project_score": <number>,
                                    "project_feedback": "<string>",
                                    "overall_summary": "<string>"
                                }
                            }
                        `,
                    },
                    {
                        role: "user",
                        content: `
                            cv: ${cv},
                            projectSubmission: ${submission}
                        `
                    }
                ]
            });

            const result = aiResponse.choices[0].message.content;

            if (!result) {
                throw Error("There is something wromg with AI")
            }

            const updatedJob = await prisma.job.update({
                where: {
                    id: jobId
                },
                data: {
                    status: "completed",
                    result
                }
            })

            console.log(`✅ Done processing job ${updatedJob.id}`);

            channel.ack(msg);
        }
    });
}