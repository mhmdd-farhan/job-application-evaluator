import { Context, Hono } from "hono";
import prisma from "../services/prisma";
import { sendMessage } from "../queues/publisher";


const evaluateRouter = new Hono();

evaluateRouter.post("/", async (c: Context) => {
    try {
        const {
            title,
            cvId,
            submissionId
        } = await c.req.json();

        if (
            !title ||
            !cvId ||
            !submissionId
        ) {
            return c.json({ error: "Miss required fields" }, 401);
        }

        const job = await prisma.job.create({
            data: {
                cv_id: cvId,
                submission_id: submissionId,
                status: "processing"
            }
        });

        await sendMessage({
            cvId: job.cv_id,
            jobId: job.id,
            submissionId: job.submission_id,
            title
        });

        return c.json({
            id: job.id,
            status: job.status
        }, 201)
    } catch (error: Error | any) {
        return c.json({ error: `Error while evaluate: ${error.message}` }, 500);
    }
})

export default evaluateRouter;