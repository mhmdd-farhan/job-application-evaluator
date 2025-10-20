import { PDFParse } from "pdf-parse";
import fs from 'fs'
import path from "path";
import dotenv from "dotenv";
import chromaClient from "../services/chroma";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
dotenv.config();

const caseStudyData = fs.readFileSync(path.join(__dirname, '../public/case-study-brief.pdf'));
const jobDescData = fs.readFileSync(path.join(__dirname, '../public/job-desc.pdf'));
const scoringRubricData = fs.readFileSync(path.join(__dirname, '../public/scoring-rubric.pdf'));

async function uploadGroundThruth(caseStudy: Buffer, jobDesc: Buffer, scoringRubric: Buffer) {
    try {
        // Parser
        const caseStudyParser = new PDFParse({ data: caseStudy });
        const jobDescParser = new PDFParse({ data: jobDesc });
        const scoringRubricParser = new PDFParse({ data: scoringRubric });
        // parse to text
        const parsedCaseStudy = await caseStudyParser.getText();
        const parsedJobDesc = await jobDescParser.getText();
        const parsedScoringRubric = await scoringRubricParser.getText();

        console.log("case study: ", parsedCaseStudy.text)
        console.log("job desc: ", parsedJobDesc.text)
        console.log("scoring rubric: ", parsedScoringRubric.text)

        const embeddingFunction = new OpenAIEmbeddingFunction({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small",
        });

        const roundThruthCollection = await chromaClient.createCollection({
            name: "round_thruth",
            embeddingFunction
        });

        await roundThruthCollection.add({
            ids: ["cs-1", "jd-2", "sr-3"],
            documents: [
                parsedCaseStudy.text,
                parsedJobDesc.text,
                parsedScoringRubric.text
            ]
        })

        console.log("Round thruth strore successfully");
    } catch (error: any) {
        console.error(error.message)
    }
}



uploadGroundThruth(caseStudyData, jobDescData, scoringRubricData);