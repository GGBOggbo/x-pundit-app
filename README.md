# X Pundit App

一个基于 Next.js 的内容生成小工具，当前包含两条主能力：

- `X 评论生成`：输入推文或观点内容，生成多角度评论
- `推文生成`：基于选定风格和参考推文批量生成新推文

项目同时包含登录注册、历史记录、主题切换和二次润色能力，定位是一个可持续迭代的个人产品原型。

## 主要功能

- 评论生成：分析内容后输出多条评论
- 评论润色：支持“再口语一点”和“更犀利”
- 推文生成：按风格生成人设一致的推文
- 人格系统：内置多套中英文人格配置
- 历史记录：登录用户可保存和查看生成记录
- 登录注册：基于 NextAuth Credentials
- 本地持久化：使用 SQLite 存储用户和历史数据

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- NextAuth v5 beta
- better-sqlite3
- Vitest
- ESLint

## 环境变量

复制 `.env.example` 为 `.env.local`，至少填写：

```bash
AI_API_KEY=your-ai-api-key
```

可选变量：

```bash
AI_BASE_URL=https://open.bigmodel.cn/api/anthropic
AI_MODEL=claude-3-5-sonnet-20241022
AUTH_SECRET=replace-with-a-long-random-string
```

说明：

- `AI_API_KEY` 是必填项，AI 相关请求缺失时会明确报错
- `AI_BASE_URL` 和 `AI_MODEL` 不填会使用默认值
- `AUTH_SECRET` 本地开发建议也配置，部署环境必须配置

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认访问地址：

```bash
http://localhost:3000
```

## 常用脚本

```bash
npm run dev
npm run build
npm run start
npm run test
npm run typecheck
npm run lint
npm run verify
```

说明：

- `npm run test`：运行 Vitest 全量测试
- `npm run typecheck`：运行 TypeScript 类型检查
- `npm run verify`：顺序执行测试、类型检查和 lint

## 数据存储

SQLite 数据库默认写入：

```bash
.data/x-pundit.db
```

目录不存在时会自动创建，并且已在 `.gitignore` 中忽略。

## 当前工程化状态

当前这一轮的第一档目标是“基础可维护”，重点包括：

- 主运行链路稳定性收口
- 开发底座补齐
- 基础 lint 和类型问题收口

已完成的方向包括：

- 移除 layout 渲染路径中的数据库初始化副作用
- 新增 AI 运行时配置模块
- comments 主链路增加输入长度和限流保护
- 增加统一的 `test / typecheck / verify` 脚本入口

## 目录结构

```text
app/                    页面与 API 路由
app/components/         前端组件
lib/                    核心逻辑与工具模块
lib/db/                 SQLite 初始化与 schema
lib/tweets/             推文生成相关逻辑
config/                 人格与 prompt 配置
types/                  类型定义
__tests__/              Vitest 测试
docs/                   规划与设计文档
```
