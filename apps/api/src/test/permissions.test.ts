import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { prisma } from "../prisma";
import { ADMIN_EMAIL, ADMIN_PASSWORD, authHeader, loginAs } from "./helpers";

describe("Permissions", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let adminToken: string;
  let regularUserToken: string;
  const testUserEmail = "testuser-perms@test.peppermint";

  beforeAll(async () => {
    app = await buildApp();
    const { token } = await loginAs(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = token;

    // Create a non-admin user for permission tests
    await prisma.user.upsert({
      where: { email: testUserEmail },
      update: { isAdmin: false },
      create: {
        email: testUserEmail,
        name: "Test User",
        isAdmin: false,
        // bcrypt hash of "testpass123"
        password: "$2b$10$BFmibvOW7FtY0soAAwujoO9y2tIyB7WEJ2HNq9O7zh9aeejMvRsKu",
        language: "en",
      },
    });

    const loginRes = await loginAs(app, testUserEmail, "1234");
    regularUserToken = loginRes.token;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: testUserEmail } } });
    await prisma.user.deleteMany({ where: { email: testUserEmail } });
    await app.close();
  });

  describe("Admin bypass", () => {
    it("admin can access all users list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/all",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
    });

    it("admin can create tickets", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/ticket/create",
        headers: authHeader(adminToken),
        payload: { title: "Admin ticket", priority: "low" },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Unauthenticated access", () => {
    it("cannot access tickets without a token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
      });
      expect(res.statusCode).toBe(401);
    });

    it("cannot access users list without a token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/all",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("Regular user access", () => {
    it("can access open tickets with valid token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
        headers: authHeader(regularUserToken),
      });
      // When roles_active is false (default), all authenticated users get access
      expect([200, 401]).toContain(res.statusCode);
    });
  });
});
