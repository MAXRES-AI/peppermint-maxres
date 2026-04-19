import { FastifyInstance } from "fastify";

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
  };
}

export async function loginAs(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });
  return JSON.parse(res.payload);
}

export function authHeader(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

// Default admin seeded by prisma/seed.js
export const ADMIN_EMAIL = "admin@admin.com";
export const ADMIN_PASSWORD = "1234";
