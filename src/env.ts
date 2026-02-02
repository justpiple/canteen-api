import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development")
    .transform((val) => val ?? "development"),

  DATABASE_URL: z.url(),
  DATABASE_SCHEMA: z.string().optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
