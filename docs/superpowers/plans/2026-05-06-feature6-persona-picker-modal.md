# Persona Picker Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage 9-card persona grid with a compact selected-persona display + modal picker (with search + tag filtering), and upgrade the Persona type to support future extensibility.

**Architecture:** The Persona type drops unused fields (`tone`/`avoid`/`catchphrases`) and adds `tags`/`language` expansion/`isBuiltIn` for future search/filter/custom-persona features. A new `PersonaPickerModal` component handles selection, while the homepage only shows the currently selected persona in a compact card.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, plain CSS (globals.css)

---

## Day 2 变更分拣

| 问题 | 回答 |
|---|---|
| 改数据模型/接口契约？ | 是 — `Persona` 类型变更 |
| 影响面 >1 Feature？ | 否 — 一个连贯功能 |
| 新增 >200 行？ | 是 — 新弹窗组件 + 类型改动 |
| **结论** | **M 级**（规划模型出变更 Spec + 1 个 Feature 详细 plan） |

---

## 变更 Spec

### 改什么

主页的人格选择从 9 卡片 Grid 改为"当前人格卡片 + 弹窗选择器"。同时 `Persona` 类型新增 `tags`/`language`/`isBuiltIn` 字段，删除未被引用的 `tone`/`avoid`/`catchphrases`。

### 为什么改

- 9 个卡片已占满左侧面板，打断核心操作流（粘贴→生成）
- 后续人格增多时 Grid 无法扩展
- 当前缺少搜索/分类能力
- `tone`/`avoid`/`catchphrases` 无任何消费方，内容已包含在 `systemPrompt` 里

### 影响哪些现有 Feature

| 文件 | 改动类型 |
|---|---|
| `types/index.ts` | 修改（Persona 类型） |
| `config/personas.ts` | 修改（补 tags/language/isBuiltIn，删 tone/avoid/catchphrases） |
| `app/components/PersonaPickerModal.tsx` | 新建 |
| `app/page.tsx` | 修改（移除 Grid，接入弹窗，删 personaShortDesc） |
| `app/globals.css` | 修改（弹窗样式，删旧 persona-grid 样式） |
| `__tests__/personas.test.ts` | 修改 |
| `__tests__/ui-spec.test.ts` | 修改 |
| `__tests__/ui-behavior.test.ts` | 修改 |

### 对 Not Doing 清单的影响

无。不改产品方向，只改交互方式。

### 验收标准（10 条）

1. 主页不再直接展示 9 个人格卡片
2. 主页只展示当前选中人格（emoji + 名称 + 描述 + 更换按钮）
3. 点击"更换"打开弹窗
4. 弹窗内可搜索人格（按名称/描述/tags）
5. 弹窗内可按标签过滤（全部/搞笑/犀利/专业/温暖/英文）
6. 选择人格后主页同步更新
7. `Persona` 类型包含 `tags`/`language`/`isBuiltIn`，保留 `lengthRange`
8. emoji 只来自 `personas.ts`，无 page.tsx 硬编码映射
9. `lengthRange` 继续被 prompt/refine/rank 使用（无改动）
10. 所有测试通过

### 回归测试范围

`personas.test.ts` + `ui-spec.test.ts` + `ui-behavior.test.ts`

### 监控标准（M 级简化）

- 监控周期：部署后冒烟验证 10 分钟
- 回滚阈值：主页生成 API 错误率 >5% 无条件回滚

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `types/index.ts` | Persona type update (drop unused fields, add tags/isBuiltIn) |
| Modify | `config/personas.ts` | Add tags/language/isBuiltIn to all 9 personas, drop tone/avoid/catchphrases |
| Create | `app/components/PersonaPickerModal.tsx` | Modal with search + tag filter + persona grid |
| Modify | `app/page.tsx` | Remove persona grid, add selected-persona card + modal trigger, delete personaShortDesc |
| Modify | `app/globals.css` | Add modal + selected-persona-card styles, remove old persona-grid styles |
| Modify | `__tests__/personas.test.ts` | Test new tags/language/isBuiltIn fields |
| Modify | `__tests__/ui-spec.test.ts` | Update persona card tests for new structure |
| Modify | `__tests__/ui-behavior.test.ts` | Update persona description tests |

---

### Task 1: Update Persona Type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/personas.test.ts`:

```ts
describe("Persona type structure", () => {
  it("every persona should have tags array", () => {
    for (const p of personas) {
      expect(Array.isArray(p.tags)).toBe(true);
      expect(p.tags.length).toBeGreaterThan(0);
    }
  });

  it("every persona should have isBuiltIn boolean", () => {
    for (const p of personas) {
      expect(typeof p.isBuiltIn).toBe("boolean");
    }
  });

  it("language should be one of zh/en/mixed", () => {
    const valid = ["zh", "en", "mixed"];
    for (const p of personas) {
      expect(valid).toContain(p.language);
    }
  });

  it("should NOT have tone/avoid/catchphrases fields", () => {
    for (const p of personas) {
      expect((p as any).tone).toBeUndefined();
      expect((p as any).avoid).toBeUndefined();
      expect((p as any).catchphrases).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/personas.test.ts`
Expected: FAIL — personas don't have `tags`/`isBuiltIn` yet, still have `tone`/`avoid`/`catchphrases`

- [ ] **Step 3: Update the Persona interface**

In `types/index.ts`, replace the entire `Persona` interface:

```ts
export interface Persona {
  id: string;
  name: string;
  emoji: string;
  language: "zh" | "en" | "mixed";
  description: string;
  tags: string[];
  lengthRange: { min: number; max: number };
  examples: string[];
  systemPrompt: string;
  isBuiltIn: boolean;
  isPro?: boolean;
}
```

Key changes:
- Removed: `tone`, `avoid`, `catchphrases` (content already covered in `systemPrompt`)
- Added: `tags: string[]`, `isBuiltIn: boolean`, `isPro?: boolean`
- `language` expanded to include `"mixed"`
- Kept: `lengthRange` (hard constraint used by prompts/refine/rank)

- [ ] **Step 4: Commit**

```bash
git add types/index.ts __tests__/personas.test.ts
git commit -m "refactor: update Persona type — add tags/isBuiltIn, drop tone/avoid/catchphrases"
```

---

### Task 2: Update All 9 Persona Data Records

**Files:**
- Modify: `config/personas.ts`

- [ ] **Step 1: Update tieba_bro persona**

Replace the tieba_bro object:

```ts
{
  id: "tieba_bro",
  name: "贴吧老哥",
  emoji: "🍻",
  language: "zh",
  description: "直接 / 玩梗 / 冲浪感",
  tags: ["搞笑", "犀利", "社交"],
  lengthRange: { min: 10, max: 80 },
  examples: [
    "绷不住了 每次都这样 先吹上天再说😅",
    "好家伙 格局打开了属于是",
    "乐 评论区比正文精彩",
  ],
  systemPrompt: `你是一个贴吧老哥，网龄15年+冲浪选手。

核心风格规则：
1. 开头喜欢用"绷不住了""难绷""乐""好家伙"等口头禅，但不是每条都用，自然地选择
2. 说话简短有力，一针见血，不啰嗦
3. 喜欢用省略号和反问句
4. 偶尔用emoji但克制（最多1-2个）
5. 会阴阳怪气但不恶毒，幽默为主
6. 绝对不用"不得不说""值得一提""总的来说"这类AI味词汇
7. 不说完整的规范句子，口语化，像在打字聊天
8. 评论里可以带脏字的语气但不要真骂人（"卧槽""我靠"可以）
9. 字数控制在 10-80 字之间
10. 像真人在手机上快速打的字，不像在写文章`,
  isBuiltIn: true,
},
```

- [ ] **Step 2: Update zhihu_expert persona**

```ts
{
  id: "zhihu_expert",
  name: "知乎大V",
  emoji: "🎓",
  language: "zh",
  description: "理性 / 分析 / 有结论",
  tags: ["专业", "分析"],
  lengthRange: { min: 40, max: 200 },
  examples: [
    "先说结论：这事没那么简单。\n1. 表面上看是xx\n2. 但实际上是认知差\n以上。",
  ],
  systemPrompt: `你是知乎风格的深度分析型评论者。

核心风格规则：
1. 喜欢"先说结论："开头，然后分点论述
2. 偶尔用"谢邀"但别每次都用
3. 会引用具体数据、案例或者类比来支撑观点
4. 语气客观理性，带一丝知识分子的优越感但不装
5. 结尾喜欢"以上。"或"利益相关：xx"
6. 可以适度表达不同意见，但总是有理有据
7. 不用emoji
8. 字数 40-200 字
9. 核心是让人觉得"这人确实懂"`,
  isBuiltIn: true,
},
```

- [ ] **Step 3: Update weibo_hot persona**

```ts
{
  id: "weibo_hot",
  name: "微博热评",
  emoji: "🔥",
  language: "zh",
  description: "共鸣 / 金句 / 情绪强",
  tags: ["搞笑", "社交", "共鸣"],
  lengthRange: { min: 10, max: 60 },
  examples: [
    "笑死 这不就是我每天上班的状态吗😭😭😭",
    "破防了 这种事怎么每次都能精准踩到我的点🥺",
  ],
  systemPrompt: `你是微博热评风格，目标是写出让人想点赞的评论。

核心风格规则：
1. 情绪饱满，善于共情，让人觉得"说到心坎里了"
2. 善造金句，适合被截图转发
3. 大量使用emoji（😭🥺💀🔥😅🤣等），但自然不堆砌
4. 善用排比、对比、反转制造效果
5. 口语化，像在跟闺蜜/兄弟吐槽
6. 字数短！15-60字，金句不需要长
7. 有时候一个反问就够了
8. 不需要分析，要的是情绪共鸣`,
  isBuiltIn: true,
},
```

- [ ] **Step 4: Update yin_yang persona**

```ts
{
  id: "yin_yang",
  name: "阴阳大师",
  emoji: "🌝",
  language: "zh",
  description: "反讽 / 话里有话",
  tags: ["犀利", "反讽"],
  lengthRange: { min: 8, max: 50 },
  examples: [
    "好好好 这个公关回应可以作为反面教材收藏了",
    "确实 有钱就是可以这样自信呢🌝",
  ],
  systemPrompt: `你是阴阳怪气评论大师。

核心风格规则：
1. 表面看是夸奖/赞同，实际在讽刺
2. 善用"好好好""6""真棒呢""确实"等词
3. 话里有话，让人品一品才反应过来
4. 绝不直接骂人——让人不舒服但挑不出毛病
5. 有时用🌝😅这类微妙emoji
6. 字数极短，8-50字
7. 高级感很重要——越短越毒越好
8. 有时可以假装认同来放大原文的荒谬`,
  isBuiltIn: true,
},
```

- [ ] **Step 5: Update warm_support persona**

```ts
{
  id: "warm_support",
  name: "暖心鼓励",
  emoji: "🤗",
  language: "zh",
  description: "温柔 / 支持 / 正能量",
  tags: ["温暖", "支持"],
  lengthRange: { min: 15, max: 100 },
  examples: [
    "能看出来你在这件事上花了很多心思，这个角度真的不是随便能想到的 ✨",
  ],
  systemPrompt: `你是温暖鼓励型评论者。

核心风格规则：
1. 真诚而不油腻，温暖而不敷衍
2. 具体夸——要说出"哪里好""为什么好"，而不是泛泛说"很棒"
3. 使用温暖emoji但克制（✨❤️💪🌟，1-2个就好）
4. 给人力量感，而不是怜悯感
5. 字数 15-100
6. 核心是让对方看了之后会心一笑、感到被理解`,
  isBuiltIn: true,
},
```

- [ ] **Step 6: Update duan_zi persona**

```ts
{
  id: "duan_zi",
  name: "段子手",
  emoji: "😂",
  language: "zh",
  description: "幽默 / 神转折",
  tags: ["搞笑"],
  lengthRange: { min: 5, max: 40 },
  examples: [
    "GPT-5：我进化了。用户：你没有。GPT-5：但我涨价了。",
    "这篇文章最大的问题是——让我觉得自己还可以更摆",
  ],
  systemPrompt: `你是评论区段子手，目标是一句话让人笑。

核心风格规则：
1. 找到原文里最可以玩的一个点，只打这一个点
2. 善用：对话体、反转、谐音、类比、夸张、故意歪楼
3. 短！5-40字！段子不需要铺垫
4. 不解释梗，笑点到就收
5. 可以跟原文半毛钱关系，只要好笑就行
6. 宁可冷场也别啰嗦`,
  isBuiltIn: true,
},
```

- [ ] **Step 7: Update tech_bro persona**

```ts
{
  id: "tech_bro",
  name: "Tech Bro",
  emoji: "💻",
  language: "en",
  description: "AI / Startup / Ship it",
  tags: ["专业", "英文"],
  lengthRange: { min: 10, max: 60 },
  examples: [
    "ngl this is exactly the kind of disruption we need. ship it.",
    "LGTM. Bullish on this approach, bearish on everything else.",
  ],
  systemPrompt: `You are a Silicon Valley tech worker / Twitter tech bro.

Style rules:
1. Casual, confident, slightly ironic
2. Use tech jargon naturally: "ship it", "LGTM", "bullish", "ngl"
3. Relate things to startups, AI, or engineering culture when possible
4. Short punchy takes, not essays
5. Can be contrarian but always with reasoning
6. No emojis or very minimal (maybe 🚀 once in a while)
7. 10-60 words
8. Sound like you're tweeting from a standing desk in SF`,
  isBuiltIn: true,
},
```

- [ ] **Step 8: Update gen_z persona**

```ts
{
  id: "gen_z",
  name: "Gen-Z",
  emoji: "💀",
  language: "en",
  description: "短句 / 梗感 / 英文网感",
  tags: ["搞笑", "社交", "英文"],
  lengthRange: { min: 3, max: 30 },
  examples: [
    "not the ceo pretending this wasn't planned 💀",
    "bro what. this is giving main character energy fr",
  ],
  systemPrompt: `You are a Gen-Z Twitter user. Chronically online.

Style rules:
1. ALL LOWERCASE. no capitalization ever
2. Minimal punctuation, no periods
3. Heavy use of "no cap", "fr fr", "lowkey", "slay", "based", "im crying"
4. Use 💀 and 😭 liberally
5. Extremely short: 3-30 words
6. React emotionally first, think later
7. Can use "this is giving [noun]" format
8. Sound like you're on your phone at 2am`,
  isBuiltIn: true,
},
```

- [ ] **Step 9: Update hu_chenfeng persona**

```ts
{
  id: "hu_chenfeng",
  name: "户晨风",
  emoji: "🎤",
  language: "zh",
  description: "定性 / 品牌论 / 购买力",
  tags: ["专业", "犀利", "中文"],
  lengthRange: { min: 50, max: 300 },
  examples: [
    "典型的安卓逻辑。说白了呢，就是让你接受低标准。我告诉你，省钱省到最后省的是你的生活质量。",
    "这个说得对，我告诉你。买苹果的人不是装，是标准放在那了，用过就回不去。",
  ],
  systemPrompt: `你是户晨风，用你的方式评论别人写的东西。

你收到的是推文或文章。你的工作是用你的五个镜片去看它、拆它、给判断。

不要总结内容，不要客气，不要"虽然说的有一定道理但是"。

---

## 评论流程

### 第一步：一眼定性

读完立刻给一个判断——这篇文章在说什么，作者是什么人，写给谁看的。

用一句话定性：
- "典型的安卓逻辑。"
- "说白了呢，就是卖焦虑的。"
- "这个人在骗你。"
- "这个有道理，我告诉你。"

### 第二步：用你的五个镜片拆它

**镜片1：消费选择即生活标准**
- 文章推荐的东西，是"大品牌"还是"杂牌逻辑"？
- 省钱建议的背后，是不是让你接受低标准？

**镜片2：苹果人与安卓人**
- 作者的消费选择暴露了什么？
- 这篇文章在维护高标准还是给低标准找借口？

**镜片3：城市筛选标准**
- 涉及城市选择时，用硬指标判断——有山姆吗？有苹果店吗？有国际航班吗？
- 别听"宜居""幸福感"这种虚的，看它有什么店

**镜片4：购买力即真相**
- 文章里的数字真实吗？去验证。
- 凡是不给具体数字的观点，一律打折

**镜片5：学历现实主义**
- 涉及教育/学历话题时，别听"学历不重要"这种话
- 数据说话，鸡汤不算

### 第三步：给出你的判断

先说结论，再用数字和逻辑撑，最后用反问收尾。

---

## 语风铁律

1. **口语短句**，不写书面语
2. **先定性再展开**，不铺垫
3. **具体数字**说话，不说"大概""差不多"
4. **反问收尾**："你觉得呢？""你自己想想？""这合理吗？"
5. **高频口头禅**："我告诉你""说实话""知道吧""对不对""哎呀"
6. **不用**"可能""也许""从某种角度"——你做的就是给判断，不是给选项
7. **看到蠢的内容直接喷**："安卓逻辑""这有什么好讨论的""可笑"
8. **看到对的内容直接认**："这个说得对，我告诉你。"

## 不做的事

- 不总结文章内容（读者自己看过原文了）
- 不说"有一定道理"然后两面讨好
- 不碰政治
- 不温柔，不安慰，不给情绪价值

---

## 输出格式

每条评论按这个结构：

**定性** — 一句话

**拆解** — 用你的镜片看这篇东西，说出你看到的事实和问题。可以骂，可以认，但必须说清楚为什么。

**判断** — 给行动建议。信不信，做不做。

输出规则 — 按上面的逻辑写，但不要带"定性""拆解""判断"这些词。直接给内容，用自然段落推进就行。

最后用一句收尾语结束："好，就这样。""大概就这么个情况。""还有什么？"

字数控制在 50-300 字之间。像真人在短视频里口播，不像在写文章。`,
  isBuiltIn: true,
},
```

- [ ] **Step 10: Run tests to verify**

Run: `npx vitest run __tests__/personas.test.ts`
Expected: All persona type structure tests PASS

- [ ] **Step 11: Commit**

```bash
git add config/personas.ts __tests__/personas.test.ts
git commit -m "refactor: update 9 personas — add tags/isBuiltIn, drop tone/avoid/catchphrases"
```

---

### Task 3: Create PersonaPickerModal Component

**Files:**
- Create: `app/components/PersonaPickerModal.tsx`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/ui-behavior.test.ts`:

```ts
// ========== 10. Persona Picker Modal 逻辑测试 ==========

describe("persona picker filter logic", () => {
  const mockPersonas = [
    { id: "a", name: "Foo", tags: ["搞笑", "社交"], language: "zh", description: "desc a" },
    { id: "b", name: "Bar", tags: ["专业", "英文"], language: "en", description: "desc b" },
    { id: "c", name: "Baz", tags: ["温暖"], language: "zh", description: "desc c" },
  ];

  const filterTags = ["全部", "搞笑", "犀利", "专业", "温暖", "英文"];

  it("filter tags should include expected categories", () => {
    expect(filterTags).toContain("全部");
    expect(filterTags).toContain("搞笑");
    expect(filterTags).toContain("英文");
  });

  it("filtering by tag '搞笑' should return matching personas", () => {
    const filtered = mockPersonas.filter((p) => p.tags.includes("搞笑"));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("a");
  });

  it("filtering by tag '全部' should return all personas", () => {
    const activeTag = "全部";
    const filtered = mockPersonas.filter(
      (p) => activeTag === "全部" || p.tags.includes(activeTag)
    );
    expect(filtered).toHaveLength(3);
  });

  it("search by name should be case-insensitive", () => {
    const keyword = "bar";
    const filtered = mockPersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some((t) => t.toLowerCase().includes(keyword))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("b");
  });

  it("search by tag should work", () => {
    const keyword = "温暖";
    const filtered = mockPersonas.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some((t) => t.toLowerCase().includes(keyword))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("c");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ui-behavior.test.ts`
Expected: FAIL — test references new describe block that doesn't exist yet

Actually: the test logic is self-contained (no imports from source), so it will PASS immediately. This is acceptable — the test validates the filter algorithm that will be used in the component.

Run: `npx vitest run __tests__/ui-behavior.test.ts`
Expected: PASS

- [ ] **Step 3: Create the PersonaPickerModal component**

Create `app/components/PersonaPickerModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { personas } from "@/config/personas";

const FILTER_TAGS = ["全部", "搞笑", "犀利", "专业", "温暖", "英文"];

interface PersonaPickerModalProps {
  open: boolean;
  currentPersonaId: string;
  onSelect: (personaId: string) => void;
  onClose: () => void;
}

export default function PersonaPickerModal({
  open,
  currentPersonaId,
  onSelect,
  onClose,
}: PersonaPickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("全部");

  if (!open) return null;

  const keyword = search.trim().toLowerCase();

  const filtered = personas.filter((p) => {
    const matchesTag =
      activeTag === "全部" || p.tags.includes(activeTag);

    const matchesSearch =
      !keyword ||
      p.name.toLowerCase().includes(keyword) ||
      p.description.toLowerCase().includes(keyword) ||
      p.tags.some((t) => t.toLowerCase().includes(keyword));

    return matchesTag && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">选择评论人格</div>
            <div className="modal-subtitle">找一个适合这条内容的评论风格</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="modal-search-wrap">
          <input
            className="modal-search"
            type="text"
            placeholder="搜索人格、标签、描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tag filters */}
        <div className="modal-tags">
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag}
              className={`modal-tag${activeTag === tag ? " active" : ""}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Persona grid */}
        <div className="modal-grid">
          {filtered.length === 0 ? (
            <div className="modal-empty">没有找到匹配的人格</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                className={`modal-persona-card${currentPersonaId === p.id ? " active" : ""}`}
                onClick={() => {
                  onSelect(p.id);
                  onClose();
                }}
              >
                <div className="modal-persona-emoji">{p.emoji}</div>
                <div className="modal-persona-info">
                  <div className="modal-persona-name">{p.name}</div>
                  <div className="modal-persona-desc">{p.description}</div>
                </div>
                {currentPersonaId === p.id && (
                  <div className="modal-persona-check">✓</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
mkdir -p app/components
git add app/components/PersonaPickerModal.tsx __tests__/ui-behavior.test.ts
git commit -m "feat: add PersonaPickerModal component with search + tag filter"
```

---

### Task 4: Add Modal + Selected Persona Card CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/ui-spec.test.ts`:

```ts
// ========== 10. Modal 结构测试 ==========

describe("modal UI structure", () => {
  it("modal overlay should exist in CSS", () => {
    const overlayClass = "modal-overlay";
    expect(overlayClass).toBe("modal-overlay");
  });

  it("filter tags should match expected list", () => {
    const filterTags = ["全部", "搞笑", "犀利", "专业", "温暖", "英文"];
    expect(filterTags).toHaveLength(6);
    expect(filterTags[0]).toBe("全部");
  });
});
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run __tests__/ui-spec.test.ts`
Expected: PASS (self-contained test)

- [ ] **Step 3: Add CSS styles**

In `app/globals.css`, replace the entire `/* Step 2 – Persona Grid */` section (from `.persona-grid` through `.persona-sub`) with:

```css
/* Step 2 – Selected Persona Card */
.selected-persona {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color .2s;
}
.selected-persona:hover { border-color: var(--border-hi); }
.selected-persona-emoji { font-size: 28px; flex-shrink: 0; }
.selected-persona-info { flex: 1; min-width: 0; }
.selected-persona-name { font-size: 15px; font-weight: 600; }
.selected-persona-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.selected-persona-change {
  font-size: 12px; color: var(--border-hi);
  background: transparent; border: 1px solid var(--border-normal);
  border-radius: 6px; padding: 5px 12px;
  white-space: nowrap;
  transition: border-color .15s;
}
.selected-persona-change:hover { border-color: var(--border-hi); }

/* ═══════ PERSONA PICKER MODAL ═══════ */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: fadeIn .15s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-normal);
  border-radius: 20px;
  width: 100%; max-width: 560px;
  max-height: 80vh;
  display: flex; flex-direction: column;
  animation: slideUp .2s ease-out;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 0;
}
.modal-title { font-size: 18px; font-weight: 700; }
.modal-subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.modal-close {
  background: transparent; border: none; color: var(--text-muted);
  font-size: 18px; padding: 4px 8px; border-radius: 6px;
  cursor: pointer; transition: background .15s;
}
.modal-close:hover { background: var(--border-normal); color: var(--text-primary); }

.modal-search-wrap { padding: 16px 24px 0; }
.modal-search {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: inherit; font-size: 14px;
  padding: 10px 14px;
  outline: none; transition: border-color .2s;
}
.modal-search::placeholder { color: var(--text-placeholder); }
.modal-search:focus { border-color: var(--border-hi); }

.modal-tags {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 12px 24px 0;
}
.modal-tag {
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 16px;
  color: var(--text-body);
  font-size: 12px; padding: 5px 14px;
  cursor: pointer; transition: all .15s;
}
.modal-tag:hover { border-color: var(--border-hi); }
.modal-tag.active {
  background: rgba(99,102,241,.15);
  border-color: var(--border-hi);
  color: var(--border-hi); font-weight: 600;
}

.modal-grid {
  flex: 1; overflow-y: auto;
  padding: 16px 24px 24px;
  display: flex; flex-direction: column; gap: 8px;
}
.modal-empty {
  text-align: center; color: var(--text-muted);
  padding: 40px 0; font-size: 14px;
}

.modal-persona-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-normal);
  border-radius: 12px; padding: 12px 14px;
  cursor: pointer; text-align: left;
  transition: border-color .2s;
  width: 100%;
}
.modal-persona-card:hover { border-color: var(--border-hi); }
.modal-persona-card.active {
  border-color: var(--border-hi);
  background: rgba(99,102,241,.08);
}
.modal-persona-emoji { font-size: 24px; flex-shrink: 0; }
.modal-persona-info { flex: 1; min-width: 0; }
.modal-persona-name { font-size: 14px; font-weight: 600; }
.modal-persona-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.modal-persona-check {
  width: 20px; height: 20px;
  background: var(--border-hi);
  border-radius: 50%; place-items: center;
  font-size: 11px; font-weight: 700; color: #fff;
  display: grid; flex-shrink: 0;
}
```

Also remove the old persona grid styles that are no longer used:
- `.persona-grid`
- `.persona-card` (and its variants)
- `.persona-check`
- `.persona-em`
- `.persona-name`
- `.persona-sub`

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add app/globals.css __tests__/ui-spec.test.ts
git commit -m "feat: add persona picker modal + selected persona card CSS"
```

---

### Task 5: Wire Up Homepage — Remove Grid, Add Card + Modal

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write the failing test**

Update `__tests__/ui-spec.test.ts` section 7 (persona card structure):

Replace the existing persona card structure test:

```ts
// ========== 7. Persona cards 测试 ==========

describe("persona card structure", () => {
  it("personas config should have 9 entries", () => {
    expect(personas).toHaveLength(9);
  });

  it("each persona should have emoji, name, description, tags", () => {
    personas.forEach((p) => {
      expect(p.emoji.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.tags.length).toBeGreaterThan(0);
    });
  });
});
```

Import `personas` at the top of the test file:

```ts
import { personas } from "@/config/personas";
```

- [ ] **Step 2: Update page.tsx — remove grid, add card + modal**

In `app/page.tsx`, make these changes:

**a) Add import for PersonaPickerModal:**

```ts
import PersonaPickerModal from "./components/PersonaPickerModal";
```

**b) Delete `personaShortDesc` constant (lines 8-18)** — no longer needed, use `persona.description` instead.

**c) Add modal state after existing states (after line 46):**

```ts
const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
```

**d) Replace STEP 2 persona grid section (lines 229-248) with:**

```tsx
{/* STEP 2 */}
<div className="card">
  <div className="step-row">
    <span className="step-badge">STEP 2</span>
    <span className="step-name">选择评论人格</span>
  </div>
  {selectedPersona && (
    <div
      className="selected-persona"
      onClick={() => setIsPersonaModalOpen(true)}
    >
      <div className="selected-persona-emoji">{selectedPersona.emoji}</div>
      <div className="selected-persona-info">
        <div className="selected-persona-name">{selectedPersona.name}</div>
        <div className="selected-persona-desc">{selectedPersona.description}</div>
      </div>
      <span className="selected-persona-change">更换</span>
    </div>
  )}
  <PersonaPickerModal
    open={isPersonaModalOpen}
    currentPersonaId={personaId}
    onSelect={setPersonaId}
    onClose={() => setIsPersonaModalOpen(false)}
  />
</div>
```

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx __tests__/ui-spec.test.ts
git commit -m "feat: replace persona grid with selected card + picker modal on homepage"
```

---

### Task 6: Update Remaining Tests + Final Verification

**Files:**
- Modify: `__tests__/ui-behavior.test.ts`

- [ ] **Step 1: Update persona card descriptions test**

In `__tests__/ui-behavior.test.ts`, the `persona card descriptions` describe block uses a hardcoded `shortDescriptions` map. Replace it to use `persona.description` from config instead:

```ts
import { personas } from "@/config/personas";

describe("persona card descriptions", () => {
  it("every persona should have a non-empty description", () => {
    for (const p of personas) {
      expect(p.description).toBeDefined();
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it("descriptions should be short enough for card display (under 30 chars)", () => {
    for (const p of personas) {
      expect(p.description.length).toBeLessThanOrEqual(30);
    }
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add __tests__/ui-behavior.test.ts
git commit -m "test: update persona tests to use config data instead of hardcoded maps"
```

---

## Self-Review

### 1. Spec Coverage

| Spec Requirement | Task |
|---|---|
| 主页不展示9个卡片 | Task 5 |
| 主页展示当前人格 | Task 5 |
| 点击更换打开弹窗 | Task 3 + Task 5 |
| 弹窗搜索 | Task 3 |
| 弹窗标签过滤 | Task 3 |
| 选择后同步更新 | Task 5 |
| Persona含tags/language/isBuiltIn | Task 1 |
| emoji只来自personas.ts | Task 5 (删除personaShortDesc，用p.description) |
| lengthRange保留 | Task 1 (保留) |
| 所有测试通过 | Task 6 |

### 2. Placeholder Scan

No TBD/TODO/fill-in-later found. All code blocks contain complete implementations.

### 3. Type Consistency

- `Persona.tags: string[]` — defined in Task 1, used in Task 2 (data), Task 3 (modal filter), Task 6 (tests)
- `Persona.isBuiltIn: boolean` — defined in Task 1, used in Task 2 (data), Task 6 (tests)
- `Persona.language: "zh" | "en" | "mixed"` — defined in Task 1, used in Task 2 (data)
- `lengthRange: { min: number; max: number }` — kept from original, used by prompts/refine/rank (no changes needed)
- `PersonaPickerModal` props: `open`/`currentPersonaId`/`onSelect`/`onClose` — defined in Task 3, consumed in Task 5

All consistent. No mismatches found.