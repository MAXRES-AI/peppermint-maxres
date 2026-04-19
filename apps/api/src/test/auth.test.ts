import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { ADMIN_EMAIL, ADMIN_PASSWORD, authHeader, loginAs } from "./helpers";

describe("Auth", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns a token for valid credentials", async () => {
      const result = await loginAs(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(ADMIN_EMAIL);
      expect(result.user.isAdmin).toBe(true);
    });

    it("returns 401 for wrong password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: ADMIN_EMAIL, password: "wrongpassword" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for unknown email", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "nobody@example.com", password: "password" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("Protected routes", () => {
    it("returns 401 when no Authorization header is sent", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for a malformed token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
        headers: authHeader("notavalidtoken"),
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for an expired/tampered token", async () => {
      // A structurally valid JWT with wrong signature
      const fakeToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
        headers: authHeader(fakeToken),
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 200 with a valid token", async () => {
      const { token } = await loginAs(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
        headers: authHeader(token),
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/v1/auth/profile", () => {
    it("returns profile for authenticated user", async () => {
      const { token } = await loginAs(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/profile",
        headers: authHeader(token),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user?.email).toBe(ADMIN_EMAIL);
    });
  });
});
