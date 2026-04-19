import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import multer from "fastify-multer";

import { checkToken } from "./lib/jwt";
import { registerRoutes } from "./routes";

export async function buildApp(): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });

  server.register(cors, {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });
  server.register(helmet, { contentSecurityPolicy: false });
  // fastify-multer's content parser is incompatible with Fastify 5.x when run
  // in the Vitest worker environment; skip it in tests (file upload routes are
  // excluded from the test suite and covered by manual QA).
  if (process.env.NODE_ENV !== "test") {
    server.register(multer.contentParser);
  }

  registerRoutes(server);

  server.get(
    "/",
    {
      schema: {
        tags: ["health"],
        description: "Health check endpoint",
        response: {
          200: {
            type: "object",
            properties: {
              healthy: { type: "boolean" },
            },
          },
        },
      },
    },
    async function (_request, response) {
      response.send({ healthy: true });
    }
  );

  server.addHook("preHandler", async function (request: any, reply: any) {
    try {
      if (request.url === "/" && request.method === "GET") {
        return true;
      }
      if (request.url === "/api/v1/auth/login" && request.method === "POST") {
        return true;
      }
      if (
        request.url === "/api/v1/ticket/public/create" &&
        request.method === "POST"
      ) {
        return true;
      }
      const bearer = request.headers.authorization!.split(" ")[1];
      checkToken(bearer);
    } catch (err) {
      reply.status(401).send({
        message: "Unauthorized",
        success: false,
      });
    }
  });

  await server.ready();
  return server;
}
