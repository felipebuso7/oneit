import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "../src/app/manifest";

type WorkerEvent = {
  request?: { method: string; mode: string; url: string };
  waitUntil?: (promise: Promise<unknown>) => void;
  respondWith?: (promise: Promise<Response>) => void;
};

function worker() {
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const fallback = new Response("offline fallback");
  const cache = { addAll: vi.fn().mockResolvedValue(undefined), match: vi.fn().mockResolvedValue(fallback) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(["servicia-public-offline-v4", "servicia-public-offline-v5", "other-app-cache"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const claim = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn().mockResolvedValue(new Response("live"));
  // Node Request needs absolute URLs; the worker uses an origin-relative public asset.
  class WorkerRequest { constructor(public url: string, public options: unknown) {} }
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { addEventListener: (name: string, handler: (event: WorkerEvent) => void) => { handlers[name] = handler; }, location: { origin: "https://servicia.test" }, clients: { claim } },
    caches, fetch, Request: WorkerRequest, Response, URL,
  });
  async function navigate() {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { method: "GET", mode: "navigate", url: "https://servicia.test/portal/field" }, respondWith: (value) => { response = value; } });
    return response;
  }
  return { handlers, cache, caches, fetch, claim, navigate, fallback };
}

describe("PWA public shell", () => {
  it("declares field start, standalone display and PNG installation icons", () => {
    const value = manifest();
    expect(value.start_url).toBe("/portal/field");
    expect(value.display).toBe("standalone");
    expect(value.icons?.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    expect(value.lang).toBe("pt-BR");
  });
  it("precaches only the public HTML and standalone script", async () => {
    const value = worker();
    let pending: Promise<unknown> | undefined;
    value.handlers.install({ waitUntil: (promise) => { pending = promise; } });
    await pending;
    expect(value.cache.addAll).toHaveBeenCalledTimes(1);
    expect(value.cache.addAll.mock.calls[0][0].map((request: { url: string }) => request.url)).toEqual(["/offline.html", "/offline-app.js"]);
  });
  it("removes only obsolete caches owned by this worker", async () => {
    const value = worker();
    let pending: Promise<unknown> | undefined;
    value.handlers.activate({ waitUntil: (promise) => { pending = promise; } });
    await pending;
    expect(value.caches.delete.mock.calls).toEqual([["servicia-public-offline-v4"]]);
    expect(value.claim).toHaveBeenCalledOnce();
  });
  it.each([
    { method: "POST", mode: "navigate", url: "https://servicia.test/portal/field" },
    { method: "POST", mode: "cors", url: "https://servicia.test/api/materials" },
    { method: "GET", mode: "cors", url: "https://servicia.test/portal/field?_rsc=123" },
    { method: "GET", mode: "navigate", url: "https://storage.test/evidence" },
  ])("does not intercept mutations, RSC or cross-origin requests: $method $url", (request) => {
    const value = worker();
    const respondWith = vi.fn();
    value.handlers.fetch({ request, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
    expect(value.fetch).not.toHaveBeenCalled();
  });
  it("returns live navigation without adding private responses to cache", async () => {
    const value = worker();
    expect(await (await value.navigate())?.text()).toBe("live");
    expect(value.caches.open).not.toHaveBeenCalled();
    expect(value.cache.addAll).not.toHaveBeenCalled();
  });
  it("does not disguise HTTP errors as offline success", async () => {
    const value = worker();
    value.fetch.mockResolvedValue(new Response("failure", { status: 503 }));
    expect((await value.navigate())?.status).toBe(503);
    expect(value.cache.match).not.toHaveBeenCalled();
  });
  it("falls back to public HTML only on network rejection", async () => {
    const value = worker();
    value.fetch.mockRejectedValue(new TypeError("Network unavailable"));
    expect(await value.navigate()).toBe(value.fallback);
    expect(value.cache.match).toHaveBeenCalledWith("/offline.html");
  });
  it("returns an explicit 503 if fallback storage was evicted", async () => {
    const value = worker();
    value.fetch.mockRejectedValue(new TypeError("Network unavailable"));
    value.cache.match.mockResolvedValue(undefined);
    expect((await value.navigate())?.status).toBe(503);
  });
  it("serves the public standalone script from its install cache", async () => {
    const value = worker();
    value.fetch.mockRejectedValue(new TypeError("offline"));
    let response: Promise<Response> | undefined;
    value.handlers.fetch({ request: { method: "GET", mode: "cors", url: "https://servicia.test/offline-app.js" }, respondWith: (promise) => { response = promise; } });
    expect(await response).toBe(value.fallback);
    expect(value.cache.match).toHaveBeenCalledWith("/offline-app.js");
    expect(value.fetch).not.toHaveBeenCalled();
  });
});
