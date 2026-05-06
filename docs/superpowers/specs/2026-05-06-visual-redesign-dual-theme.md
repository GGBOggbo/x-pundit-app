# 变更 Spec：视觉风格改造 — 双主题（深色 vLLM zinc + 浅色 Modern Tech Doc）

> Day 2 M 级变更 | 2026-05-06

---

## 改什么

将 x-pundit-app 当前单一深色主题改为**双主题系统**，支持深色/浅色切换：

1. **深色主题**：借鉴 vLLM Recipes 的 zinc 系配色（`#09090b` 中性深黑 + blue-500 强调 + 蓝色发光选中态）
2. **浅色主题**：Modern Technical Documentation 风（白底 + slate 边框 + 高对比度）
3. **主题切换**：Header 右侧添加 ☀/🌙 切换按钮，状态存 localStorage

### 当前 vs 深色 vs 浅色 对照

| 维度 | 当前 | 深色 (vLLM zinc) | 浅色 (Modern Tech Doc) |
|------|------|---|---|
| **背景** | #050816 蓝黑 + 渐变 | #09090b zinc-950 | #FFFFFF |
| **卡片** | #0F172A 深蓝 | #09090b + border-zinc-800 | #FFFFFF + border-slate-200 + shadow |
| **文字** | #F8FAFC | zinc-100/200/400/500 | #1F2937/475569/94A3B8 |
| **强调色** | #6366F1 indigo | blue-500 (#3b82f6) | blue-600 (#2563eb) |
| **边框** | #1F2937 | zinc-800 (#27272a) | #E2E8F0 (slate-200) |
| **按钮** | 紫蓝渐变 | 实色 blue-500 | 实色 blue-600 |
| **选中态** | border-hi 变色 | **蓝色外发光** box-shadow | 蓝色边框 + 浅蓝底 |
| **标签** | 暗底亮字 | zinc-800/60 pill | 浅色底深字 pill |
| **代码区** | #111827 | #0c0c0e (更深) | #F8FAFC (浅灰) |
| **警告框** | 无 | orange-950/20 橙色系 | red-50 + red 边框 |
| **字体** | System UI | Inter + Noto Sans SC | Inter + Noto Sans SC |

## 为什么改

1. 不同用户偏好不同，深色/浅色双主题是开发者工具标配
2. vLLM Recipes 的 zinc 系深色比当前蓝黑更中性、更专业
3. 浅色主题适合白天/长时间阅读，深色适合夜间
4. 当前紫蓝渐变风格偏"SaaS 营销页"，不够工具感

## 影响哪些现有 Feature

| 文件 | 改动类型 |
|---|---|
| `app/globals.css` | **全面改写** — 双主题 CSS 变量 + `[data-theme="light"]` 选择器 + 所有组件样式 |
| `app/page.tsx` | **微调** — 添加主题切换状态 + 删除内联 style |
| `app/components/ThemeToggle.tsx` | **新建** — 主题切换按钮组件 |
| `__tests__/ui-spec.test.ts` | **改** — 更新 tokens 测试为双主题验证 |

**不改的：**
- 所有组件 JSX 结构不变（除添加 ThemeToggle）
- 所有交互逻辑不变
- types / config / api / lib 不碰
- PersonaPickerModal — 样式全在 CSS，自动跟随

## 对 Not Doing 清单的影响

无。纯视觉层，不改产品方向。

## 验收标准（5 条）

1. **双主题 Design Tokens**：`:root` 定义深色默认，`[data-theme="light"]` 覆盖为浅色，所有组件通过 CSS 变量自动切换
2. **所有组件双主题兼容**：card / button / tag / badge / textarea / select / modal / drawer / auth / history 无残留硬编码颜色
3. **主题切换功能**：Header 右侧 ☀/🌙 按钮可切换，状态持久化到 localStorage，刷新后恢复
4. **内联样式清零**：page.tsx 中所有 `style={{ color: "#xxx" }}` 迁移到 CSS class
5. **所有测试通过**：tokens 测试覆盖双主题，其余测试不受影响

## 回归测试范围

`ui-spec.test.ts` + `ui-behavior.test.ts` + 全量回归确认

## 监控标准（M 级简化）

- 监控周期：部署后冒烟验证 10 分钟
- 回滚阈值：主页生成 API 错误率 >5% 无条件回滚
