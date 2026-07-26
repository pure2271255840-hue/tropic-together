# Tropic Together 项目快照

最后更新：2026-07-25。

## 当前阶段

Phase 1 本地优先 MVP。

Phase 0.5 地图 POC 已结束并退役。本仓库当前不再以内嵌地图为核心方向。

新的产品方向：

- 列表优先。
- 地点和行程分阶段协作。
- 外部地图 URL 导航。
- AI 只做行程草稿助手。
- 最终版由发起人确认。
- 第一版不接 Google Maps API 或 Apple MapKit JS。

## 当前仓库

路径：

```text
D:\Projects\tropic-together-boyfriend
```

技术栈：

- Next.js
- React
- TypeScript
- Tailwind CSS
- localStorage adapter

当前还没有：

- Supabase migrations
- Supabase Auth
- RLS
- 远程 Supabase dev 项目
- AI provider 接入
- 前端 preview 部署

## 本轮已完成

清理：

- 删除退役地图 POC 页面。
- 删除退役地图 POC 组件。
- 删除退役地图 POC provider 代码。
- 删除退役地图 POC 文档。
- 删除旧 dashboard/mock 数据模块。
- 删除本地 `.bundle` 产物。
- `.env.example` 移除地图 POC key 占位。
- `.gitignore` 增加 `*.bundle`。

新增：

- `docs/PHASE_1_ONE_WEEK_PLAN.md`
- `docs/PHASE_1_WORKFLOW_SPEC.md`
- `docs/PROJECT_SNAPSHOT.md`
- `features/trip/` 本地数据层
- `/trip/[tripId]` 本地首页
- `/trip/[tripId]/places` 地点页
- `/trip/[tripId]/itinerary` 行程页

验证：

```text
npm.cmd run typecheck 通过
npm.cmd run lint      通过
npm.cmd run build     通过
```

说明：`.next` 已作为可再生成缓存清理。用户后续自行运行本地 dev server。

## 当前实现限制

当前前端提供了技术底座和产品思路，但交互还没有完全符合新的共同工作流。

主要差距：

- 现在的地点模型还是 candidate / confirmed，不是“一定要去 / 还不错 + 点赞 / 倒拇指 + 原因 + 排名”。
- 现在还没有旅行计划阶段状态。
- 首页还没有完整的“你现在该做什么”行动卡片。
- 行程还没有版本模型。
- 行程还没有整版投票。
- AI 入口还没有实现。
- 底部导航当前需要在下一轮调整为：首页 / 行程 / 地点。

## 后续工作流依据

后续所有 Phase 1 产品和代码实现以此文档为准：

```text
docs/PHASE_1_WORKFLOW_SPEC.md
```

一周节奏参考：

```text
docs/PHASE_1_ONE_WEEK_PLAN.md
```

## 下一轮任务

下一轮开始执行时，优先做本地前端重构：

1. 更新数据模型：计划阶段、地点标签、地点投票原因、行程版本、行程投票。
2. 更新 seed data。
3. 重构首页行动卡片。
4. 重构地点页为待投票、排名和分区视图。
5. 重构行程页为版本和整版投票视图。
6. 保持地图 URL 外部导航。
7. 完成本地体验后再接 Supabase local。
