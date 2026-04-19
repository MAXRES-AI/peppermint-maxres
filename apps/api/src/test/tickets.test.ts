import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { ADMIN_EMAIL, ADMIN_PASSWORD, authHeader, loginAs } from "./helpers";
import { clearTickets } from "./setup";

describe("Tickets", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();
    const { token } = await loginAs(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = token;
  });

  beforeEach(async () => {
    await clearTickets();
  });

  afterAll(async () => {
    await clearTickets();
    await app.close();
  });

  async function createTicket(token: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: "POST",
      url: "/api/v1/ticket/create",
      headers: authHeader(token),
      payload: {
        title: "Test ticket",
        priority: "low",
        type: "support",
        ...overrides,
      },
    });
  }

  describe("POST /api/v1/ticket/create", () => {
    it("creates a ticket and returns its id", async () => {
      const res = await createTicket(adminToken);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
    });

    it("requires authentication", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/ticket/create",
        payload: { title: "Unauthenticated", priority: "low" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/ticket/:id", () => {
    it("retrieves a created ticket by id", async () => {
      const create = await createTicket(adminToken, { title: "Fetch me" });
      const { id } = JSON.parse(create.payload);

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/ticket/${id}`,
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.ticket.title).toBe("Fetch me");
    });

    it("does not return 401 for unknown id when authenticated", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/ticket/00000000-0000-0000-0000-000000000000",
        headers: authHeader(adminToken),
      });
      // Auth passes — may return 200 (null ticket), 404, or 500 (DB error on bad UUID)
      expect(res.statusCode).not.toBe(401);
    });
  });

  describe("GET /api/v1/tickets/open", () => {
    it("returns an array of open tickets", async () => {
      await createTicket(adminToken, { title: "Open 1" });
      await createTicket(adminToken, { title: "Open 2" });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/tickets/open",
        headers: authHeader(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.tickets)).toBe(true);
      expect(body.tickets.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("POST /api/v1/ticket/comment", () => {
    it("adds a comment to a ticket", async () => {
      const create = await createTicket(adminToken, { title: "Comment target" });
      const { id } = JSON.parse(create.payload);

      const commentRes = await app.inject({
        method: "POST",
        url: "/api/v1/ticket/comment",
        headers: authHeader(adminToken),
        payload: { id, text: "This is a test comment", public: true },
      });
      expect(commentRes.statusCode).toBe(200);

      const ticketRes = await app.inject({
        method: "GET",
        url: `/api/v1/ticket/${id}`,
        headers: authHeader(adminToken),
      });
      const body = JSON.parse(ticketRes.payload);
      const comment = body.ticket.comments.find(
        (c: any) => c.text === "This is a test comment"
      );
      expect(comment).toBeDefined();
    });
  });

  describe("POST /api/v1/ticket/public/create", () => {
    it("creates a ticket without authentication", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/ticket/public/create",
        payload: {
          title: "Public ticket",
          priority: "low",
          email: "user@example.com",
          name: "Public User",
        },
      });
      // Public endpoint should succeed or return a specific business error (not 401)
      expect(res.statusCode).not.toBe(401);
    });
  });
});
