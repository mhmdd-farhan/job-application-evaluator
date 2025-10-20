import { Context, Hono } from "hono";
import { PDFParse } from "pdf-parse";
import prisma from "../services/prisma";
import "pdf-parse/worker";

const uploadRouter = new Hono();

uploadRouter.post("/", async (c: Context) => {
    try {
        const body = await c.req.parseBody();
        const cv = body["cv"] as File;
        const projectSubmission = body["submission"] as File;

        if (!cv || !projectSubmission) {
            return c.json({ error: "Please attach cv and your project submission!" }, 401);
        }

        console.log("CV:", cv.name, cv.size, cv.type);
        console.log("Submission:", projectSubmission.name, projectSubmission.size, projectSubmission.type);

        const bufferedCv = Buffer.from(await cv.arrayBuffer());
        const bufferedProjectSubmission = Buffer.from(await projectSubmission.arrayBuffer());

        const cvParser = new PDFParse({ data: bufferedCv });
        const projectSubmissionParser = new PDFParse({ data: bufferedProjectSubmission });

        const textCv = await cvParser.getText();
        const textSubmission = await projectSubmissionParser.getText();

        const cleanTextCv = textCv.text.replace(/\0/g, "");
        const cleanTextSubmission = textSubmission.text.replace(/\0/g, "");

        const uploadedCv = await prisma.cv.create({
            data: {
                description: cleanTextCv
            },
            select: {
                id: true
            }
        });
        const uploadedProjectSubmission = await prisma.submission.create({
            data: {
                description: cleanTextSubmission
            },
            select: {
                id: true
            }
        });

        return c.json({
            message: "Your cv and project submission stored",
            cvId: uploadedCv.id,
            projectSubmissionId: uploadedProjectSubmission.id
        }, 201)
    } catch (error: Error | any) {
        console.log("Error", error.message)
        return c.json({
            error: `Error while processing file: ${error.message}`
        }, 500)
    }
});

export default uploadRouter;