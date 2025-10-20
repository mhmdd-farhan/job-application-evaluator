import { Context, Hono } from "hono";
import prisma from "../services/prisma";

const resultRouter = new Hono();

resultRouter.get("/", async (c: Context) => {
    try {
        const jobId = c.req.param("id");

        const job = await prisma.job.findUnique({
            where: {
                id: jobId
            }
        });

        return c.json(job, 200);
    } catch (error: Error | any) {
        return c.json({ error: `Error to get result: ${error.message}` }, 500);
    }
})

export default resultRouter;