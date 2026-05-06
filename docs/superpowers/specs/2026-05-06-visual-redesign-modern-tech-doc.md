# 变更 Spec：视觉风格改造 — Modern Technical Documentation 风

> Day 2 M 级变更 | 2026-05-06

---

## 改什么

将 x-pundit-app 当前深色赛博朋克风（#050816 深蓝黑底 + 紫/蓝渐变）替换为 **Modern Technical Documentation** 风格，借鉴 vLLM Recipes 的视觉语言：

| 维度 | 当前 | 改为 |
|------|------|------|
| **背景** | #050816 深蓝黑 + radial-gradient | #FFFFFF 纯白 |
| **卡片** | #0F172A 深色 + 1px border | #FFFFFF 白底 + 细边框 + 微阴影 |
| **文字** | #F8FAFC 亮白 | #1F2937 深灰黑 |
| **强调色** | #6366F1 紫 + #2563EB 蓝 | #2563EB 蓝 + #7C3AED 紫（保留，但使用场景减少） |
| **字体** | System UI | Inter (英文) + PingFang SC / Noto Sans SC (中文) |
| **边框** | 1px solid #1F2937 | 1px solid #E2E8F0（slate-200） |
| **按钮** | 渐变紫蓝 | 实色蓝/紫，无渐变，hover 微暗 |
| **标签/徽章** | 暗底亮字 | 浅底深字，pill 形状 |
| **代码块/文本区** | 暗底 | 浅灰底（#F8FAFC） |
| **整体感觉** | 暗夜赛博朋克 | 干净、专业、留白充足的文档风 |

## 为什么改

1. 当前深色风适合酷炫 SaaS，但 x-pundit 核心使用场景是"快速粘贴推文→生成评论"，信息密度高，深色背景长时间阅读疲劳
2. Modern Technical Documentation 风更适合开发者工具类产品，视觉上更克制、更专业
3. 浅色主题对比度更高，评论内容可读性更好

## 影响哪些现有 Feature

| 文件 | 改动类型 |
|---|---|
| `app/globals.css` | **全面改写** — Design Tokens + 所有组件样式 |
| `app/page.tsx` | **微调** — 删除内联 style 中的硬编码颜色，改为 CSS 变量 |
| `app/components/PersonaPickerModal.tsx` | **不改** — 样式全在 CSS，自动跟随 |
| `app/globals.css` 中的 auth/history 样式 | **改** — 统一新风格 |
| `__tests__/ui-spec.test.ts` | **改** — 更新 design tokens 测试值 |

**不改的：**
- 所有组件 JSX 结构不变
- 所有交互逻辑不变
- types / config / api / lib 不碰

## 对 Not Doing 清单的影响

无。纯视觉层，不改产品方向。

## 验收标准（5 条）

1. **Design Tokens 全部翻新**：背景白、文字黑、边框 slate-200、保留蓝紫强调色
2. **所有组件视觉统一**：card / button / tag / badge / textarea / select / modal / drawer / auth 全部跟随新风格，无残留深色
3. **对比度合规**：所有文字与背景的对比度 ≥ 4.5:1（WCAG AA）
4. **内联样式清零**：page.tsx 和 ResultPanel 中的 `style={{ color: "#xxx" }}` 全部迁移到 CSS class
5. **所有测试通过**：tokens 测试更新为新值，其余测试不受影响

## 回归测试范围

`ui-spec.test.ts`（tokens 测试值更新）+ 全量回归确认无破坏

## 监控标准（M 级简化）

- 监控周期：部署后冒烟验证 10 分钟
- 回滚阈值：主页生成 API 错误率 >5% 无条件回滚
