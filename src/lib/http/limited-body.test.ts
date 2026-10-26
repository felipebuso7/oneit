import { describe, expect, it } from "vitest";
import { readLimitedBody } from "./limited-body";

describe("bounded JSON request body", () => {
  it("reads UTF-8 at the byte limit", async () => {
    expect(await readLimitedBody(new Request("https://servicia.test", { method: "POST", body: "ação" }), 6)).toBe("ação");
  });
  it("rejects over the limit even without content-length", async () => {
    expect(await readLimitedBody(new Request("https://servicia.test", { method: "POST", body: "ação" }), 5)).toBeNull();
  });
});
