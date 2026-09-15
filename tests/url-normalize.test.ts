import { describe, it, expect } from "vitest";
import { validateAndNormalizeUrl, normalizeUrlForComparison, extractDomain } from "@/lib/urls/normalize";

describe("validateAndNormalizeUrl", () => {
  it("rejects empty input", () => {
    expect(validateAndNormalizeUrl("").valid).toBe(false);
    expect(validateAndNormalizeUrl("   ").valid).toBe(false);
  });

  it("adds https:// when no scheme is given", () => {
    const result = validateAndNormalizeUrl("example.com/page");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("https://example.com/page");
  });

  it("preserves an explicit http:// scheme", () => {
    const result = validateAndNormalizeUrl("http://example.com");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("http://example.com/");
  });

  it("rejects non-http(s) protocols", () => {
    expect(validateAndNormalizeUrl("javascript:alert(1)").valid).toBe(false);
    expect(validateAndNormalizeUrl("ftp://example.com").valid).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(validateAndNormalizeUrl("http://").valid).toBe(false);
  });
});

describe("normalizeUrlForComparison", () => {
  it("treats trailing slash on a bare path as equivalent", () => {
    expect(normalizeUrlForComparison("https://example.com/page/")).toBe(
      normalizeUrlForComparison("https://example.com/page")
    );
  });

  it("is case-insensitive on the host", () => {
    expect(normalizeUrlForComparison("https://Example.COM/page")).toBe(
      normalizeUrlForComparison("https://example.com/page")
    );
  });

  it("treats http and https as equivalent", () => {
    expect(normalizeUrlForComparison("http://example.com/page")).toBe(
      normalizeUrlForComparison("https://example.com/page")
    );
  });

  it("strips known tracking parameters", () => {
    expect(normalizeUrlForComparison("https://example.com/page?utm_source=x&id=5")).toBe(
      normalizeUrlForComparison("https://example.com/page?id=5")
    );
  });

  it("does not merge URLs whose meaningful query params differ", () => {
    expect(normalizeUrlForComparison("https://example.com/page?id=1")).not.toBe(
      normalizeUrlForComparison("https://example.com/page?id=2")
    );
  });

  it("ignores query parameter order", () => {
    expect(normalizeUrlForComparison("https://example.com/page?a=1&b=2")).toBe(
      normalizeUrlForComparison("https://example.com/page?b=2&a=1")
    );
  });

  it("ignores the fragment", () => {
    expect(normalizeUrlForComparison("https://example.com/page#section")).toBe(
      normalizeUrlForComparison("https://example.com/page")
    );
  });
});

describe("extractDomain", () => {
  it("strips a leading www.", () => {
    expect(extractDomain("https://www.example.com/page")).toBe("example.com");
  });

  it("returns null for invalid URLs", () => {
    expect(extractDomain("not a url")).toBeNull();
  });
});
