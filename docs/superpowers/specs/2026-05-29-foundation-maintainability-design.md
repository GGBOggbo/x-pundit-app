# 基础可维护性设计

**日期：** 2026-05-29  
**状态：** 已确认并进入实现  
**范围：** 第一档工程化优化，仅覆盖基础可维护性

## 目标

把当前仓库从“个人能跑的小产品”提升到“个人可持续维护的小项目”。

本轮只做三类工作：

1. 提高主运行链路稳定性
2. 补齐本地开发底座
3. 清理基础 lint error，建立统一验证入口

## 非目标

- 不做 CI
- 不做监控、日志平台接入
- 不做配额、计费、额度系统
- 不重构整套测试
- 不做部署平台适配

## 当前问题

### 1. 运行链路边界不清楚

- `app/layout.tsx` 在渲染路径里初始化数据库
- `lib/ai/client.ts` 直接读取 `process.env`，缺配置时失败太晚
- `/api/comments` 是最昂贵的主链路，但还缺少输入长度约束和限流

### 2. 仓库接手成本偏高

- `README.md` 仍然是脚手架默认内容
- 仓库没有 `.env.example`
- `package.json` 缺少 `test`、`typecheck`、`verify` 这类标准入口

### 3. 基础代码质量没有收口

- lint error 仍然存在
- 页面导航、effect 写法、测试文件中的低级问题会拖慢后续维护

## 设计方案

### A. 运行稳定性

- 把数据库初始化从 layout 顶层副作用中移除
- 新增集中式 AI 运行配置模块
- `/api/comments` 增加：
  - 无效请求校验
  - `content` 长度限制
  - IP 级限流

### B. 开发底座

- 重写 `README.md`
- 新增 `.env.example`
- 给 `package.json` 增加：
  - `test`
  - `typecheck`
  - `verify`

### C. 基础 lint 收口

- 清理本轮范围内的基础 lint error
- 优先处理：
  - `<a>` 导航改 `Link`
  - effect 里同步 `setState`
  - 无用变量、`require()`、显式 `any`

## 验证策略

本轮完成的标准是：

- `npm run test` 通过
- `npm run typecheck` 通过
- `npm run lint` 通过
- `npm run verify` 可以作为统一入口使用

## 实施边界

只修改与这三类工作直接相关的文件：

- 运行配置与主链路
- README / env example / package scripts
- 基础 lint 问题相关页面和测试文件

不要扩散到第二档工程化内容。
