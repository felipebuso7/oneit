import { describe, expect, it } from "vitest";
import { hasSameOrigin } from "./same-origin";

function request(origin?: string, host?: string, forwarded?: string, url = "http://localhost:3100/api/executions") {
  const headers = new Headers();
  if (origin !== undefined) headers.set("origin", origin);
  if (host !== undefined) headers.set("host", host);
  if (forwarded !== undefined) headers.set("x-forwarded-host", forwarded);
  return new Request(url, { method: "POST", headers });
}
describe("same-origin cookie mutation guard", () => {
  it("accepts the incoming loopback host when Next normalizes the URL", () => {
    expect(hasSameOrigin(request("http://127.0.0.1:3100", "127.0.0.1:3100"))).toBe(true);
  });
  it("accepts the actual HTTPS authority", () => {
    expect(hasSameOrigin(request("https://servicia.test", "servicia.test", undefined, "https://internal.test/api/executions"))).toBe(true);
  });
  it("falls back to the request URL only when Host is absent", () => {
    expect(hasSameOrigin(request("http://localhost:3100"))).toBe(true);
  });
  it.each([
    [undefined, "localhost:3100"], ["null", "localhost:3100"],
    ["https://external.test", "localhost:3100"], ["http://localhost:3101", "localhost:3100"],
    ["https://localhost:3100", "localhost:3100"], ["http://localhost:3100/path", "localhost:3100"],
    ["http://localhost:3100", "user@localhost:3100"], ["http://localhost:3100", "localhost:3100/path"],
  ])("rejects missing, foreign or malformed authorities (%s, %s)", (origin, host) => {
    expect(hasSameOrigin(request(origin, host))).toBe(false);
  });
  it("does not authorize an external origin through forwarded-host", () => {
    expect(hasSameOrigin(request("https://external.test", "localhost:3100", "external.test"))).toBe(false);
  });
});
