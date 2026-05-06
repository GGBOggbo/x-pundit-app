import { describe, it, expect } from "vitest";
import { users, history } from "@/lib/db/schema";
import { is } from "drizzle-orm";

describe("db schema", () => {
  it("should export users table", () => {
    expect(users).toBeDefined();
    // users 表应有这些列
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });

  it("should export history table", () => {
    expect(history).toBeDefined();
    expect(history.id).toBeDefined();
    expect(history.userId).toBeDefined();
    expect(history.content).toBeDefined();
    expect(history.contentPreview).toBeDefined();
    expect(history.personaId).toBeDefined();
    expect(history.personaName).toBeDefined();
    expect(history.personaEmoji).toBeDefined();
    expect(history.commentCount).toBeDefined();
    expect(history.comments).toBeDefined();
    expect(history.analysis).toBeDefined();
    expect(history.createdAt).toBeDefined();
  });

  it("users table should have unique email", () => {
    // drizzle schema 的 unique 约束在表级定义
    // 我们验证 schema 文件包含 .unique()
    const schemaSource = require("fs").readFileSync(
      require("path").resolve(__dirname, "../lib/db/schema.ts"),
      "utf-8"
    );
    expect(schemaSource).toContain("unique()");
  });
});
