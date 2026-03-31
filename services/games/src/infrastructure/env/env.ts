import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number(),
  RABBITMQ_URL: z.url(),
  KEYCLOAK_URL: z.url(),
  KEYCLOAK_REALM: z.string(),
  KEYCLOAK_CLIENT_ID: z.string(),
  JWT_JWKS_URI: z.string(),
  JWT_ISSUER: z.string(),
  BETTING_PHASE_DURATION_MS: z.coerce.number()
});

export type Env = z.infer<typeof envSchema>;
