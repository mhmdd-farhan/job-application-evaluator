import { Hono } from 'hono'
import { cors } from 'hono/cors'
import dotenv from 'dotenv'
import uploadRouter from './routes/upload';
import { startWorker } from './queues/worker';
import evaluateRouter from './routes/evaluate';
import resultRouter from './routes/result';

dotenv.config();

const app = new Hono();

startWorker().catch(console.error)

app.use("*", cors());

app.get('/', (c) => {
  return c.text('Welcome to candidate evaluator!')
})

app.route("/upload", uploadRouter);
app.route("/evaluate", evaluateRouter);
app.route("/result/:id", resultRouter);

export default app
