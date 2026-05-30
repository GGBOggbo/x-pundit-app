import { describe, it, expect, afterAll } from "vitest";
import { getDb, initDb } from "@/lib/db/index";
import path from "path";
import fs from "fs";

const TEST_DB_PATH = path.resolve(__dirname, "../.data/test-db.test.db");

describe("db connection", () => {
  afterAll(() => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("should create database file on initDb", () => {
    initDb(TEST_DB_PATH);
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  it("should create users table", () => {
    const db = initDb(TEST_DB_PATH);
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).all();
    expect(result).toHaveLength(1);
  });

  it("should create history table", () => {
    const db = initDb(TEST_DB_PATH);
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='history'"
    ).all();
    expect(result).toHaveLength(1);
  });

  it("getDb should return the same instance", () => {
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it("getDb should initialize required tables without layout side effects", () => {
    const db = getDb();
    const result = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).all();
    expect(result).toHaveLength(1);
  });
});
