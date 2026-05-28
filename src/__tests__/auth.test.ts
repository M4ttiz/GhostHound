import { generateAccessToken, verifyAccessToken, hashPassword, comparePassword } from "@/lib/auth";

describe("Authentication utilities", () => {
  describe("generateAccessToken", () => {
    it("should generate a valid JWT token", () => {
      const payload = { userId: "123", email: "test@example.com" };
      const token = generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify a valid token", () => {
      const payload = { userId: "123", email: "test@example.com" };
      const token = generateAccessToken(payload);
      const decoded = verifyAccessToken(token);
      expect(decoded).toEqual(payload);
    });

    it("should return null for invalid token", () => {
      const decoded = verifyAccessToken("invalid.token.here");
      expect(decoded).toBeNull();
    });
  });

  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "test123";
      const hashed = await hashPassword(password);
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe("comparePassword", () => {
    it("should compare passwords correctly", async () => {
      const password = "test123";
      const hashed = await hashPassword(password);
      const isValid = await comparePassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it("should return false for incorrect password", async () => {
      const password = "test123";
      const hashed = await hashPassword(password);
      const isValid = await comparePassword("wrongpassword", hashed);
      expect(isValid).toBe(false);
    });
  });
});
