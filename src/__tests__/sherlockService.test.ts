import { searchUsername } from "@/services/sherlockService";

describe("Sherlock Service", () => {
  it("should return results for a username search", async () => {
    const results = await searchUsername("testuser");
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should return platform information", async () => {
    const results = await searchUsername("testuser");
    expect(results[0]).toHaveProperty("platform");
    expect(results[0]).toHaveProperty("url");
    expect(results[0]).toHaveProperty("found");
  });
});
