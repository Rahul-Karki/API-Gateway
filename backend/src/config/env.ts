import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  COOKIE_DOMAIN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

type EnvShape = z.infer<typeof envSchema>;

function requireRedisConfig(env: EnvShape): void {
  const hasRedisUrl = Boolean(env.REDIS_URL && env.REDIS_URL.trim());
  const restToken = env.REDIS_REST_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && restToken);

  if (!hasRedisUrl && !hasUpstash) {
    throw new Error(
      "Redis configuration missing: set REDIS_URL or both UPSTASH_REDIS_REST_URL and REDIS_REST_TOKEN"
    );
  }
}

function validateCookieConfig(env: EnvShape): void {
  if (env.COOKIE_SAME_SITE === "none" && env.COOKIE_SECURE === "false") {
    throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true");
  }
}

function warnOptionalConfig(env: EnvShape): void {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email delivery will fail.");
  }

  if (!env.GOOGLE_CLIENT_ID) {
    console.warn("GOOGLE_CLIENT_ID is not set. Google login is disabled.");
  }
}

export function validateEnv(): void {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  requireRedisConfig(parsed.data);
  validateCookieConfig(parsed.data);
  warnOptionalConfig(parsed.data);
}
