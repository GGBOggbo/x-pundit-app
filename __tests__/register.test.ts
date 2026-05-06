import { describe, it, expect } from "vitest";

// 校验逻辑的单元测试（不依赖 HTTP 请求）
function validateRegisterInput(body: {
  email?: string;
  password?: string;
  confirmPassword?: string;
}): { valid: boolean; error?: string } {
  if (!body.email?.trim()) return { valid: false, error: "邮箱不能为空" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) return { valid: false, error: "邮箱格式不正确" };

  if (!body.password) return { valid: false, error: "密码不能为空" };
  if (body.password.length < 8) return { valid: false, error: "密码至少 8 位" };

  if (body.password !== body.confirmPassword) return { valid: false, error: "两次密码不一致" };

  return { valid: true };
}

describe("register input validation", () => {
  it("should reject empty email", () => {
    expect(validateRegisterInput({ email: "", password: "12345678", confirmPassword: "12345678" }).valid).toBe(false);
  });

  it("should reject invalid email format", () => {
    expect(validateRegisterInput({ email: "notanemail", password: "12345678", confirmPassword: "12345678" }).valid).toBe(false);
  });

  it("should reject password shorter than 8 chars", () => {
    expect(validateRegisterInput({ email: "a@b.com", password: "1234567", confirmPassword: "1234567" }).valid).toBe(false);
  });

  it("should reject mismatched passwords", () => {
    expect(validateRegisterInput({ email: "a@b.com", password: "12345678", confirmPassword: "different" }).valid).toBe(false);
  });

  it("should accept valid input", () => {
    expect(validateRegisterInput({ email: "a@b.com", password: "12345678", confirmPassword: "12345678" }).valid).toBe(true);
  });
});
