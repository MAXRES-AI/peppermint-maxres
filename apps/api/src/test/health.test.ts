import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app";

describe("Health", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET / returns healthy", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toMatchObject({ healthy: true });
  });

  it("GET /api/v1/nonexistent returns 404 or 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/nonexistent" });
    expect([401, 404]).toContain(res.statusCode);
  });
});
