# 用户认证 + 后端历史记录 设计文档

> 日期: 2026-05-06
> 项目: x-pundit-app
> 级别: L（大改）

---

## 背景与目标

当前 x-pundit-app 的历史记录存在 localStorage 里，换浏览器/清缓存就丢失。本次要加用户认证和后端存储，为远期商业化铺路。

**核心决策（用户确认）：**
- 核心目的：为商业化铺路（远期，时间不确定）
- 历史页复杂度：简单列表
- 旧数据迁移：登录后自动把 localStorage 历史导入后端
- 未登录体验：免登录可用，历史不保存，引导登录
- 部署环境：本地
- 技术方案：NextAuth v5 + SQLite + Drizzle

---

## 方案选型

选定方案 A：NextAuth v5 Credentials Provider + Drizzle ORM + better-sqlite3。

**为什么不用其他方案：**
- 纯手写 JWT：安全细节多，后续加 OAuth 要重写
- Supabase：引入外部服务依赖，和本地 SQLite 不匹配

**为什么这个方案：**
- Next.js 生态标准，文档多，未来加 OAuth/付费是增量改动
- Drizzle 轻量类型安全，SQLite 零配置
- 所有数据在一个 `.db` 文件里，本地部署简单

---

## 数据模型

两张表，放在 `lib/db/schema.ts`。

### users

```ts
users {
  id: text (UUID, PK)
  email: text (unique, not null)
  passwordHash: text (not null)   // bcryptjs 哈希，salt rounds = 10
  createdAt: integer (unix ms)
}
```

### history

```ts
history {
  id: text (UUID, PK)
  userId: text (FK -> users.id, not null)
  content: text (not null)              // 完整原文
  contentPreview: text (not null)       // 前 50 字摘要
  personaId: text (not null)
  personaName: text (not null)
  personaEmoji: text (not null)
  commentCount: integer (not null)
  comments: text (not null)             // JSON: GeneratedComment[]
  analysis: text (not null)             // JSON: ContentAnalysis
  createdAt: integer (unix ms)
}
```

**设计考量：**
- comments 和 analysis 用 JSON text 存，不拆子表。这个阶段不需要按评论/分析维度查询，整存整取最简单
- 预留 userId 字段，未来做付费/额度控制直接基于这个关联
- 不做软删除，直接物理删除

---

## 认证流程

### 注册 `POST /api/auth/register`

```
用户输入邮箱 + 密码 + 确认密码
  -> 校验：邮箱格式、密码 >= 8 位、两次一致、邮箱不重复
  -> bcrypt hash 密码 (salt rounds = 10)
  -> 插入 users 表
  -> 自动创建 session（登录态）
  -> 返回成功
```

### 登录 `POST /api/auth/signin`（NextAuth Credentials Provider）

```
用户输入邮箱 + 密码
  -> 查 users 表
  -> bcrypt compare
  -> 创建 session
  -> 返回成功
```

### 登出 `POST /api/auth/signout`（NextAuth 内置）

### Session 获取 `GET /api/auth/session`（NextAuth 内置）

### 安全措施

- 密码永远不存明文，bcrypt salt rounds = 10
- Session 用 JWT 存在 httpOnly cookie 里，不暴露给 JS
- 注册/登录接口加基础限频（同一 IP 60 秒内最多 10 次请求）
- 不做邮箱验证、不忘记密码（Not Doing）

### 登录后迁移

登录成功后，自动检测 localStorage 里有没有历史记录。有则调用 `POST /api/history/migrate` 批量导入后端，然后清掉 localStorage。

---

## 历史记录 API

所有 `/api/history/*` 需要登录，未登录返回 401。

### 新增 `POST /api/history`

主页生成成功后调用。

```
请求: { content, personaId, personaName, personaEmoji, comments, analysis }
后端自动填充: userId (从 session), id (UUID), createdAt, contentPreview
响应: { id, createdAt }
```

### 迁移 `POST /api/history/migrate`

登录时一次性调用。

```
请求: { items: HistoryItem[] }    // localStorage 里的所有历史
后端逐条插入，保留原 createdAt，跳过重复（以 content + personaId + createdAt 组合去重）
响应: { imported: number, skipped: number }
```

### 列表 `GET /api/history?page=1&pageSize=20`

```
按 createdAt 降序，分页
响应: { items: HistoryItem[], total: number, hasMore: boolean }
```

### 单条详情 `GET /api/history/[id]`

```
校验: 该条记录属于当前用户，否则 403
响应: HistoryItem 完整对象
```

### 删除单条 `DELETE /api/history/[id]`

```
校验: 属于当前用户
响应: { ok: true }
```

### 清空全部 `DELETE /api/history`

```
删除当前用户所有历史
响应: { deleted: number }
```

---

## 页面与交互

### 主页 `/` 改动

Header 三种状态：

| 元素 | 未登录 | 已登录 |
|------|--------|--------|
| "今日剩余 20 次" | 保持硬编码 | 保持硬编码 |
| "历史记录" | 点击弹出提示"登录后可保存历史"+ 登录链接 | 点击跳转 `/history` |
| "登录" | 点击跳转 `/login` | 变为 "退出" |

生成后保存逻辑：
- 未登录：不保存，结果正常展示
- 已登录：`handleGenerate` 成功后调 `POST /api/history` 保存到后端

现有的 `HistoryDrawer`（抽屉）删除，历史记录全部走 `/history` 独立页面。

### 登录页 `/login`

- 居中卡片布局，暗色主题风格统一
- 邮箱输入框 + 密码输入框 + "登录"按钮
- "没有账号？注册" 链接跳转 `/register`
- 错误行内提示（邮箱不存在 / 密码错误）
- 登录成功后：执行 localStorage 迁移 -> 跳回主页

### 注册页 `/register`

- 同样的居中卡片布局
- 邮箱 + 密码 + 确认密码 + "注册"按钮
- "已有账号？登录" 链接跳转 `/login`
- 错误行内提示
- 注册成功后：自动登录 -> 执行迁移 -> 跳回主页

### 历史页 `/history`

- 未登录自动跳转 `/login?redirect=/history`
- 顶部：标题 "历史记录" + 总条数 + "清空全部"按钮（二次确认弹窗）
- 列表按时间降序，每条卡片：
  - 相对时间（"5 分钟前" / "昨天"）
  - 推文摘要（contentPreview）
  - 人格 emoji + 名称 + 评论数
  - 点击展开：完整原文 + 评论列表（CommentCard readOnly，只有复制按钮）
  - "删除"按钮
- 底部："加载更多"按钮（分页）
- 空状态："还没有生成记录，去试试 ->" 链接回主页

---

## 文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `lib/db/index.ts` | Drizzle + better-sqlite3 连接，单例 |
| `lib/db/schema.ts` | users + history 表定义 |
| `lib/auth.ts` | NextAuth v5 配置（Credentials Provider + session strategy） |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth 路由 handler |
| `app/api/auth/register/route.ts` | 注册 API |
| `app/api/history/route.ts` | GET 列表 + POST 新增 + DELETE 清空 + POST migrate |
| `app/api/history/[id]/route.ts` | GET 详情 + DELETE 单条 |
| `app/login/page.tsx` | 登录页 |
| `app/register/page.tsx` | 注册页 |
| `app/history/page.tsx` | 历史记录页 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `app/page.tsx` | Header 认证状态、删除 HistoryDrawer、生成后保存逻辑改为调后端 API |
| `types/index.ts` | HistoryItem 加 `userId` 字段 |
| `lib/history.ts` | 删除 localStorage 函数，替换为后端 API 调用封装（`fetchHistoryList`、`createHistoryItem`、`deleteHistoryItem`、`clearAllHistory`、`migrateLocalHistory`） |
| `.gitignore` | 排除 `.data/` |
| `package.json` | 新增依赖 |

### 删除代码

- `HistoryDrawer` 组件（从 `page.tsx` 移除）
- localStorage 读写逻辑（从 `lib/history.ts` 移除）

### 新增依赖

```
drizzle-orm better-sqlite3 next-auth@beta bcryptjs
```

```
devDeps: drizzle-kit @types/better-sqlite3 @types/bcryptjs
```

---

## Not Doing 清单

本期明确不做：
- 用量计次 / 额度系统（Header "今日剩余 20 次" 保持硬编码）
- OAuth 第三方登录（Google / GitHub）
- 邮箱验证
- 忘记密码 / 重置密码
- 历史记录搜索 / 筛选 / 收藏 / 标签
- 历史记录导出
- "评论倾向" 接入生成逻辑
- 评论在历史页中继续润色（readOnly）
- 多语言登录/注册页 UI

---

## 监控标准

| 项目 | 值 |
|------|-----|
| 监控周期 | 首批真实用户使用后 1 个完整业务日 |
| 绝对兜底线（错误率） | API 错误率 > 5% -> 无条件回滚 |
| 绝对兜底线（延迟） | P99 > 3000ms -> 无条件回滚 |
| 相对告警线（错误率） | 相对基线上升 > 100% 持续 > 5 分钟 |
| 相对告警线（延迟） | P99 相对基线上升 > 200% 持续 > 5 分钟 |
| 基线采集窗口 | 上线后前 10 分钟 |

---

## Feature 拆分

```
Phase 1: Foundation
  Feature 1: SQLite + Drizzle 建库建表
  Feature 2: 用户认证（注册 / 登录 / 登出 / Session）

Phase 2: Core
  Feature 3: 历史 API（CRUD + 迁移，含认证守卫）
  Feature 4: 历史记录页面（独立 /history 路由）
  Feature 5: 主页集成（Header 认证状态 + 生成后自动保存 + 删除抽屉）
```

---

## 成本预估

| 项目 | 预估 |
|------|------|
| Feature 数 | 5 |
| 平均 task 数/Feature | 6 |
| subagent 调用 | 5 x 6 x 3 = 90 |
| Opus 调用（审查） | 5 x 1.5 = 8 |
| 规划轮次 | 1 |
| 总预估调用 | ~99 |
