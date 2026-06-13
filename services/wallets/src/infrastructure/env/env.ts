import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number(),
  RABBITMQ_URL: z.url(),
  JWT_JWKS_URI: z.string(),
  JWT_ISSUER: z.string()
});

export type Env = z.infer<typeof envSchema>;
