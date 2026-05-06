# Feature 2: 用户认证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现邮箱/密码注册、登录、登出、Session 管理，使用 NextAuth v5 Credentials Provider。

**Architecture:** NextAuth v5 配置在 `lib/auth.ts`，使用 JWT session strategy（存在 httpOnly cookie 中）。注册 API 单独在 `app/api/auth/register/route.ts`。密码用 bcryptjs 哈希。

**Tech Stack:** next-auth@beta, bcryptjs, @types/bcryptjs, drizzle-orm

---

### Task 1: 安装 NextAuth 和 bcryptjs

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

Run:
```bash
cd /data/project/x-pundit-app && npm install next-auth@beta bcryptjs && npm install -D @types/bcryptjs
```

Expected: 安装成功，`package.json` 出现 `next-auth` 和 `bcryptjs`。

- [ ] **Step 2: 在 .env.local 中添加 NextAuth secret**

在 `.env.local` 末尾追加：

```
AUTH_SECRET=x-pundit-dev-secret-change-in-prod
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.local
git commit -m "chore: add next-auth and bcryptjs dependencies"
```

---

### Task 2: 编写密码工具函数

**Files:**
- Create: `lib/password.ts`
- Test: `__tests__/password.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/password.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run __tests__/password.test.ts`
Expected: FAIL — `Cannot find module '@/lib/password'`

- [ ] **Step 3: 创建密码工具**

Create `lib/password.ts`:

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run __tests__/password.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/password.ts __tests__/password.test.ts
git commit -m "feat: add password hashing and verification utilities"
```

---

### Task 3: 编写 NextAuth 配置

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: 创建 auth 配置**

Create `lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "@/lib/db/index";
import { verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDb();
        const row = db
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(credentials.email as string) as
          | { id: string; email: string; password_hash: string }
          | undefined;

        if (!row) return null;

        const isValid = await verifyPassword(
          credentials.password as string,
          row.password_hash
        );

        if (!isValid) return null;

        return {
          id: row.id,
          email: row.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

注意：NextAuth v5 的 `session.user.id` 需要类型扩展。创建 `types/next-auth.d.ts`:

```ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
    };
  }
  interface User {
    id: string;
    email: string;
  }
}
```

- [ ] **Step 2: 创建 NextAuth 路由 handler**

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts app/api/auth/\[...nextauth\]/route.ts types/next-auth.d.ts
git commit -m "feat: add NextAuth v5 config with Credentials provider"
```

---

### Task 4: 编写注册 API

**Files:**
- Create: `app/api/auth/register/route.ts`
- Test: `__tests__/register.test.ts`

- [ ] **Step 1: 写失败测试 — 注册输入校验**

Create `__tests__/register.test.ts`:

```ts
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
```

- [ ] **Step 2: 运行测试确认通过（校验逻辑纯函数，先验证逻辑正确）**

Run: `npx vitest run __tests__/register.test.ts`
Expected: PASS

- [ ] **Step 3: 创建注册 API route**

Create `app/api/auth/register/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { hashPassword } from "@/lib/password";
import crypto from "crypto";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateRegisterInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const db = getDb();

    // 检查邮箱是否已注册
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(body.email.trim().toLowerCase()) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    // 创建用户
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password);
    const email = body.email.trim().toLowerCase();
    const now = Date.now();

    db.prepare(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
    ).run(id, email, passwordHash, now);

    return NextResponse.json({
      ok: true,
      user: { id, email },
    });
  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 运行全部测试确认无破坏**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/register/route.ts __tests__/register.test.ts
git commit -m "feat: add user registration API with validation"
```

---

### Task 5: 编写基础限频中间件

**Files:**
- Create: `lib/rate-limit.ts`
- Test: `__tests__/rate-limit.test.ts`

- [ ] **Step 1: 写失败测试**

Create `__tests__/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("should allow requests under limit", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("192.168.1.1")).toBe(true);
    }
  });

  it("should block requests over limit", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }
    expect(checkRateLimit("192.168.1.1")).toBe(false);
  });

  it("should track different IPs separately", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }
    expect(checkRateLimit("192.168.1.2")).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run __tests__/rate-limit.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建限频模块**

Create `lib/rate-limit.ts`:

```ts
const requests = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 60 秒
const MAX_REQUESTS = 10;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export function resetRateLimit(): void {
  requests.clear();
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run __tests__/rate-limit.test.ts`
Expected: PASS

- [ ] **Step 5: 在注册 API 中使用限频**

在 `app/api/auth/register/route.ts` 的 `POST` 函数开头添加：

```ts
import { checkRateLimit } from "@/lib/rate-limit";

// 在 POST 函数体的 try 块最前面添加：
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }
```

同样在 `lib/auth.ts` 的 Credentials authorize 函数中无法直接加（NextAuth 控制），但 NextAuth route handler 可以加中间件。在 `app/api/auth/[...nextauth]/route.ts` 中包装：

```ts
import { handlers } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest) => {
    if (req.method === "POST") {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
      }
    }
    return handler(req);
  };
}

export const POST = withRateLimit(handlers.POST);
export const GET = handlers.GET;
```

- [ ] **Step 6: Commit**

```bash
git add lib/rate-limit.ts __tests__/rate-limit.test.ts app/api/auth/register/route.ts app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat: add in-memory rate limiting for auth endpoints"
```

---

### Task 6: 编写获取当前用户的工具函数

**Files:**
- Create: `lib/session.ts`

- [ ] **Step 1: 创建 session 工具函数**

Create `lib/session.ts`:

```ts
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db/index";

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * 获取当前登录用户，未登录返回 null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
  };
}

/**
 * 获取当前登录用户，未登录抛错
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/session.ts
git commit -m "feat: add getCurrentUser and requireAuth session utilities"
```
