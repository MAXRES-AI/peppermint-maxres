import "dotenv/config";
import fs from "fs";

import { exec } from "child_process";
import { buildApp } from "./app";
import { track } from "./lib/hog";
import { getEmails } from "./lib/imap";
import { prisma } from "./prisma";

const logFilePath = "./logs.log";
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

const start = async () => {
  try {
    await new Promise<void>((resolve, reject) => {
      exec("npx prisma migrate deploy", (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        console.log(stdout);
        console.error(stderr);

        exec("npx prisma generate", (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          console.log(stdout);
          console.error(stderr);
        });

        exec("npx prisma db seed", (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          console.log(stdout);
          console.error(stderr);
          resolve();
        });
      });
    });

    await prisma.$connect();

    const server = await buildApp();

    // Pipe fastify logs to file
    (server as any).log = {
      info: (msg: string) => logStream.write(`[info] ${msg}\n`),
      error: (msg: string) => logStream.write(`[error] ${msg}\n`),
    };

    const port = 5003;

    server.listen(
      { port: Number(port), host: "0.0.0.0" },
      async (err, address) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }

        const client = track();
        client.capture({ event: "server_started", distinctId: "uuid" });
        client.shutdownAsync();
        console.info(`Server listening on ${address}`);
      }
    );

    setInterval(() => getEmails(), 10000);
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
