# Tropic Together 项目快照

最后更新：2026-07-28（Asia/Shanghai）

这份文件是当前本地项目的长期上下文快照。以后用户说“更新快照”时，默认更新本文件，而不是只依赖 Codex 对话压缩上下文，也不是更新 GitHub README。新对话开始时，先读本文件再继续。

## 当前项目

- 本地路径：`D:\Projects\tropic-together-boyfriend`
- Git 分支：`phase1-supabase-mvp`
- 远程仓库：`https://github.com/pure2271255840-hue/tropic-together.git`
- 当前状态：代码分支已与 `origin/phase1-supabase-mvp` 对齐；本文件更新后会成为唯一未提交改动。
- 最新远端提交：`c3b1c10 Replace native confirms and support legacy trip owners`
- 最近验证：`npm.cmd run typecheck`、`npm.cmd run build` 均通过。

## 线上部署

- 前端部署在 Vercel，项目名：`tropic-together`。
- 后端数据在 Supabase，项目名：`tropic-together`，区域曾在用户截图中显示为 Tokyo / `ap-northeast-1`。
- Vercel 已连接 GitHub，推送到 `phase1-supabase-mvp` 会触发线上部署。
- 自定义域名已经配置成功：`trip.sparklingo.cn`。
- 阿里云 DNS 记录：主机记录 `trip`，类型 `CNAME`，指向 Vercel 提供的 `a305d3a04b57ba3a.vercel-dns-017.com`。
- 用户已确认关闭 VPN 也可以打开 `trip.sparklingo.cn`。

生产环境依赖 Vercel + Supabase + DeepSeek API。讨论中国大陆可访问性时，要同时考虑前端域名、Vercel、Supabase REST、Supabase Realtime WebSocket、DeepSeek API 这几条链路。

不要在本文档写入任何真实 secret、service-role key、JWT secret、DeepSeek API key 或数据库密码。

## 环境变量

生产和本地需要关注：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_MAX_TOKENS=8000
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_JWT_SECRET`、`DEEPSEEK_API_KEY` 只能放服务端环境变量，不能加 `NEXT_PUBLIC_`，不能提交到 Git。
- Vercel 环境变量改动后，需要重新部署才会生效。
- Windows PowerShell 下优先使用 `npm.cmd`，不要直接用 `npm`，避免执行策略问题。

## Supabase 迁移

已经添加过的关键迁移：

```text
supabase/migrations/20260727000000_harden_trip_workspace_access_realtime.sql
supabase/migrations/20260728000000_add_app_user_display_name.sql
```

第二个迁移给 `public.app_users` 添加 `display_name`。如果线上注册、修改昵称、加入行程默认昵称异常，优先确认该迁移是否已经在 Supabase 生产项目执行。

## 当前已实现

- 用户名/密码登录，session 使用 httpOnly cookie。
- 注册时需要输入账号昵称；登录仍使用账号名和密码。
- “我的”页支持修改账号昵称，修改昵称是自定义弹窗。
- 登录页有密码显示/隐藏按钮。
- 登录页有临时“忘记密码”流程：账号正确即可直接设置新密码，后续再换正规验证码/邮箱流程。
- 登录、注册、退出、重置密码、加入行程、AI 生成等异步按钮都有 loading 状态。
- 邀请链接加入行程；加入时先确认，再在弹窗里输入本行程昵称，留空默认账号昵称。
- Phase 1 使用 Supabase `public.trip_phase1_workspaces` 的 JSON workspace 存储，同时保留 localStorage fallback。
- 权限已加固：浏览器端不再直接用 Supabase REST 写 workspace，改为调用本项目 API，由服务端校验当前用户权限。
- Supabase Realtime 已接入当前行程 workspace，同步失败时保留轮询 fallback。
- 已修复 Supabase Realtime 不能在 `subscribe()` 后继续追加 callbacks 的问题。
- 已修复中文行程 ID 双重编码导致 `/api/trips/realtime-token` 404 的问题。
- 账号状态全局缓存到 `AuthSessionProvider`，减少切页时的账号读取阻塞。
- 行程列表有 sessionStorage 快照缓存，减少空状态闪烁。
- 首页加载状态是 skeleton。
- PC 左下角 “Phase 1 数据模式” 卡片和导入测试数据入口已删除。

## 行程与地点体验

- “行程”页以行程列表为入口，分为“我管理的行程”和“我加入的行程”。
- 旧行程兼容：早期未绑定 `appUserId` 的发起人，会按账号昵称/用户名匹配 owner，避免老行程发起人看不到“生成 AI 草稿”按钮。
- 当前成员识别优先按登录账号匹配，不再被本地 `currentMemberId` 串号影响。
- “管理地点”会直接进入当前行程的地点池，不再先进入二次选择列表。
- 所有确认/删除类交互都应使用应用内 `Modal`，不要再用系统默认 `window.confirm`。
- 已替换的系统弹窗：删除行程、确认最终版、删除地点。
- 行程日删除、活动删除本来已经是自定义弹窗。
- 地点池中未投票地点仍显示在地点栏；最终版确认不被未投票地点阻止。
- 地点卡片右上角显示“某某觉得一定要去/还不错”。
- 地点地址可点击打开地图；独立地图按钮已移除。
- 地点卡片上“想去/不想去”用投票 badge 展示；编辑和删除收进右上角三点菜单。
- 分数只给 AI 参考，不在前端显示。
- 添加地点默认标签：餐饮、酒吧、购物、景点、自定义。点击“自定义 +”后变成小输入框。
- 标签按钮已经做成 chip 风格，“地点标签/初始感觉”文字改为弱化样式。

## AI 行程

- DeepSeek AI 接口位于本项目 API，前端不暴露 provider key。
- AI 生成第一版草稿需要已有地点。
- AI 整理行程会参考地点、投票理由、偏好排名、地址、坐标和酒店地址。
- `preferenceScore` 只作为 AI 偏好参考，不在前端显示，也不能作为唯一排序依据。
- AI prompt 已要求考虑同一天/相邻时段的路线顺畅和距离协调。
- 首页显示最近已确认行程的“下一天行程卡”，不是单个活动。
- 行程详情页保留总路线，并且每天标题下有当天路线按钮。
- 行程工作流按天分卡片；每天内部有活动顺序线，但不再用一条线连接所有日期。

## 最近提交

```text
c3b1c10 Replace native confirms and support legacy trip owners
57a7750 Fix authenticated trip member detection
f7a151c Polish auth recovery and daily itinerary cards
5038009 Add account display name editing
ef9dbe0 Show pending place votes in trip nav
9dadf41 Polish place tag chip controls
2988802 Refine place tags and AI routing context
7e72283 Polish place cards and realtime handling
3a57075 Polish auth and async button loading states
```

## 已验证

最近一次代码变更后已通过：

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## 当前注意事项

- 当前只剩本文件 `docs/PROJECT_SNAPSHOT.md` 是本地未提交改动。
- 如果用户要求推送快照，需要先 `git add docs/PROJECT_SNAPSHOT.md`、提交，再推送。
- 如果线上新功能异常，先确认 Vercel 是否完成最新部署，再确认 Supabase 迁移是否已执行。
- 如果控制台再次出现 realtime token 404，优先检查 URL 中 tripId 是否仍为 `%25E9...` 这种双重编码，以及线上是否已部署包含 `decodeRouteParam` 的版本。
- 用户用 Clash for Windows；之前 GitHub push 网络不稳定和代理端口有关。曾看到 Clash 端口为 `60389`，用户也问过改回 `7890`。

## 下一步可能继续做

1. 把忘记密码从临时直改密码，升级为验证码/邮箱/安全问题流程。
2. 检查 Supabase 生产库是否已经执行 `display_name` 迁移。
3. 继续优化中国大陆访问链路，尤其是 Supabase API 与 Realtime 的稳定性。
4. 做更上层的 trip data provider，跨页共享内存数据，进一步减少加载感。
5. 如用户继续强调审美，重点看移动端卡片密度、弹窗按钮风格、标签 chip 和首页行程卡。

## 项目约定

- 不要泄露任何 secret。
- 不要把 service-role key、JWT secret、AI key 放进前端。
- 涉及 Supabase RLS/Auth/部署配置/生产 secret 的改动，先说明设计再改。
- 中国大陆可访问性是产品约束，不要引入浏览器端必须翻墙的依赖。
- 用户说“不用启动本地 dev”，就不要启动本地服务；直接改、验证、提交/推送。
- 用户说“更新快照”时，更新 `D:\Projects\tropic-together-boyfriend\docs\PROJECT_SNAPSHOT.md`。
