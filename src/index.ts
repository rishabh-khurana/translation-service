import Koa, { type Context } from "koa";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";
import { db } from "./db";
import { users } from "./db/schema";
import type {
  RegisterRequestBody,
  RegisterResponse,
  LoginRequestBody,
  LoginResponse,
} from "./types/api";
import {
  error,
  validateCredentials,
  generateToken,
  authSuccess,
} from "./utils/response";

interface RegisterContext extends Context {
  request: Context["request"] & { body: RegisterRequestBody };
  body: RegisterResponse;
}

interface LoginContext extends Context {
  request: Context["request"] & { body: LoginRequestBody };
  body: LoginResponse;
}

const app = new Koa();
const router = new Router<unknown, RegisterContext | LoginContext>();

app.use(errorHandler);
app.use(cors());
// Parses JSON/form request bodies into ctx.request.body
// Without this: POST /translate { "text": "hello" } → ctx.request.body = undefined
// With this: ctx.request.body = { text: "hello" }
// Reason: Koa provides minimal core - body parsing is opt-in (see koa-bodyparser docs)
app.use(bodyParser());

router.get("/health", (ctx) => {
  ctx.body = { status: "ok", timestamp: new Date().toISOString() };
});

router.post("/auth/register", async (ctx: RegisterContext) => {
  const { email, password } = ctx.request.body;

  // Validate credentials using reusable utility
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    ctx.status = 400;
    ctx.body = validation.response;
    return;
  }

  // Hash the password before saving
  const passwordHash = await bcrypt.hash(password, 10);

  /** Throws an Error if same email exists */
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
    })
    .returning();

  // Generate token using reusable utility
  const token = generateToken(user.id, user.email);

  // Return auth success using reusable utility
  ctx.body = authSuccess(token, { id: user.id, email: user.email });
});

router.post("/auth/login", async (ctx: LoginContext) => {
  const { email, password } = ctx.request.body;

  // Validate credentials using reusable utility
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    ctx.status = 400;
    ctx.body = validation.response;
    return;
  }

  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    ctx.status = 401;
    ctx.body = error("Invalid email or password", 401);
    return;
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    ctx.status = 401;
    ctx.body = error("Invalid email or password", 401);
    return;
  }

  // Generate token using reusable utility
  const token = generateToken(user.id, user.email);

  // Return auth success using reusable utility
  ctx.body = authSuccess(token, { id: user.id, email: user.email });
});

// kicks of the translation method
// string match for an exiting string that has already been translated
// returns a process Id for the translation
router.post("/translate", (ctx) => {
  const { headers } = ctx.request;
  // TODO: implement the translation service to do the translation
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
