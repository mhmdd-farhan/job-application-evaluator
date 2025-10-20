import amqp from "amqplib"
import prisma from "../services/prisma";

interface MessagePayload {
    cvId: string;
    submissionId: string;
    jobId: string;
    title: string;
}

export async function sendMessage({
    cvId,
    submissionId,
    jobId,
    title
}: MessagePayload) {
    const queue = "cv_evaluation_queue";
    const amqpUrl = process.env.AMQP_URL as string;
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();

    channel.assertQueue(queue, {
        durable: true
    });

    const cv = await prisma.cv.findFirst({
        where: {
            id: cvId
        }
    });
    const projectSubmission = await prisma.submission.findFirst({
        where: {
            id: submissionId
        }
    })

    const msg = {
        cv: cv?.description,
        submission: projectSubmission?.description,
        jobId,
        title
    }

    const msgString = JSON.stringify(msg)

    channel.sendToQueue(queue, Buffer.from(msgString));
    console.log(" [x] Sent %s", msgString);

    await channel.close();
    await connection.close();
}