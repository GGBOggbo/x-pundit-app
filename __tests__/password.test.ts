import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password utils", () => {
  it("should hash a password and return different string", async () => {
    const hash = await hashPassword("mypassword123");
    expect(hash).not.toBe("mypassword123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should verify correct password", async () => {
    const hash = await hashPassword("mypassword123");
    const result = await verifyPassword("mypassword123", hash);
    expect(result).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("mypassword123");
    const result = await verifyPassword("wrongpassword", hash);
    expect(result).toBe(false);
  });

  it("should generate different hashes for same password", async () => {
    const hash1 = await hashPassword("mypassword123");
    const hash2 = await hashPassword("mypassword123");
    expect(hash1).not.toBe(hash2);
  });
});
