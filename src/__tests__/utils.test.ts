import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("should handle conditional classes", () => {
    expect(cn("px-4", false && "py-2")).toBe("px-4");
  });

  it("should handle undefined and null", () => {
    expect(cn("px-4", undefined, null)).toBe("px-4");
  });

  it("should handle empty strings", () => {
    expect(cn("px-4", "")).toBe("px-4");
  });
});
