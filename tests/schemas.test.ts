import { describe, it, expect } from "vitest";
import { resourceSchema, spaceSchema, settingsSchema } from "@/lib/validation/schemas";
import { makeResource, makeSpace } from "./factories";

describe("resourceSchema", () => {
  it("accepts a well-formed resource", () => {
    const result = resourceSchema.safeParse(makeResource());
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL value for url", () => {
    const result = resourceSchema.safeParse(makeResource({ url: "not-a-url" }));
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID id", () => {
    const result = resourceSchema.safeParse(makeResource({ id: "123" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid linkStatus enum value", () => {
    const raw = { ...makeResource(), linkStatus: "not-a-status" };
    const result = resourceSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("fills in defaults for optional fields when omitted", () => {
    const base = makeResource();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tags, favorite, ...rest } = base;
    const result = resourceSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.favorite).toBe(false);
    }
  });
});

describe("spaceSchema", () => {
  it("accepts a well-formed space", () => {
    expect(spaceSchema.safeParse(makeSpace()).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(spaceSchema.safeParse(makeSpace({ name: "" })).success).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("produces sane defaults from an empty object", () => {
    const result = settingsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe("system");
      expect(result.data.linkCheckTimeoutMs).toBeGreaterThanOrEqual(1000);
    }
  });

  it("rejects a timeout below the minimum", () => {
    expect(settingsSchema.safeParse({ linkCheckTimeoutMs: 100 }).success).toBe(false);
  });
});
