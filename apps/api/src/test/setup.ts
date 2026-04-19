import { execSync } from "child_process";
import { afterAll, beforeAll } from "vitest";
import { prisma } from "../prisma";

beforeAll(async () => {
  // Apply any pending migrations and seed default data
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npx prisma db seed", { stdio: "inherit" });
  await prisma.$connect();
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
});

export async function clearTickets() {
  await prisma.comment.deleteMany();
  await prisma.timeTracking.deleteMany();
  await prisma.ticketFile.deleteMany();
  await prisma.ticket.deleteMany();
}

export async function clearSessions() {
  await prisma.session.deleteMany();
}
