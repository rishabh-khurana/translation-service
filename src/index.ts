import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app = new Koa();
const router = new Router();

app.use(errorHandler);
app.use(cors());
// Parses JSON/form request bodies into ctx.request.body
// Without this: POST /translate { "text": "hello" } → ctx.request.body = undefined
// With this: ctx.request.body = { text: "hello" }
// Reason: Koa provides minimal core - body parsing is opt-in (see koa-bodyparser docs)
app.use(bodyParser());

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
