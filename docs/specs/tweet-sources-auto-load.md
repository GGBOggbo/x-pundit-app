# 变更 Spec：推文生成 STEP 1 自动加载历史记录

> 级别：M 级 | 日期：2026-05-09

## 改什么、为什么改

推文生成页 `/generate-tweets` 的 STEP 1 从"手动粘贴历史推文 textarea"改为"自动从 history 表加载用户已输入过的内容 + checkbox 勾选"。

**原因**：用户在评论生成器里已经输入过大量推文（存在 `history.content`），手动粘贴是重复劳动。

## 影响哪些现有 Feature

- **推文生成**（`/generate-tweets`）：STEP 1 交互方式改变，AI 管线不变
- **评论生成器**：不影响
- **历史记录页**：不影响
- **认证系统**：新增一个 `requireAuth()` 调用点，无逻辑变更

## 对 Not Doing 清单的影响

原 Not Doing 清单（来自 tweet-generation-mvp.md）：

- 不做 X API 集成 → **不突破**
- 不做自动发推 → **不突破**
- 不做推文持久化 → **不突破**（这次是从 history 表读，不是写新表）
- 不做付费/限额 → **不突破**

**结论：不突破任何 Not Doing 边界。**

## 验收标准（5 条）

1. 未登录进入 /generate-tweets → 跳转登录页
2. 登录后 STEP 1 自动显示历史内容 checkbox 列表，用户可勾选
3. 勾选 5+ 条后可点击生成，生成流程与原来一致
4. 无历史时 fallback 到手动粘贴 textarea
5. 所有现有测试通过

## 回归测试范围

- 跑 `npx vitest run` 全量测试
- 手动验证：评论生成器完整流程不受影响
