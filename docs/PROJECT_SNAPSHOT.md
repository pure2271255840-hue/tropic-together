# Tropic Together 项目快照

最后更新：2026-07-27。

## 当前阶段

Phase 1 上线测试前的 Supabase MVP。

产品方向：

- 私密朋友旅行协作工具。
- 登录后才能进入系统。
- 行程、地点、活动都必须支持用户手动增删改查。
- AI 只作为行程草稿助手，不直接确认最终版。
- 地图优先使用外部地图 URL，不依赖 Google Places API 或 Apple MapKit JS。
- 本地 dev server 由用户手动运行；需要本地环境测试时只告诉用户命令。

## 当前仓库

路径：

```text
D:\Projects\tropic-together-boyfriend
```

分支：

```text
phase1-supabase-mvp
```

远程：

```text
https://github.com/pure2271255840-hue/tropic-together.git
```

技术栈：

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase REST API
- localStorage fallback

## 已实现

### 前端导航

- 底部/侧边导航：首页、行程、地点、我的。
- 未登录时全局拦截，只显示登录/注册入口。
- 测试账号提示：`noah / 123456`。
- 测试账号快捷键仍保留：`Alt+Shift+M`，只用于本地测试切换成员。
- 复制邀请链接成功后，按钮会短暂显示“已复制链接”。
- `useLocalTripStore` 的保存和广播已移到 render 后执行，避免导航组件在行程页 render 期间被同步更新。

### 账号与邀请

- 普通用户名密码登录，不使用邮箱绑定。
- 登录 session 使用 httpOnly cookie。
- 用户表：`public.app_users`。
- session 表：`public.app_sessions`。
- 测试账号 Noah 固定写入数据库，密码 `123456`。
- 邀请码真实可用，入口为 `/join/[inviteCode]`。
- 加入行程前必须登录。
- 加入时昵称可选，不填默认用户名。
- 同一行程内昵称必须唯一。

### 行程

- 行程页区分：
  - 我管理的行程
  - 我加入的行程
- 我管理的行程可以删除。
- 我加入的行程只显示进入和复制邀请，不显示删除。
- 新建行程会把当前登录账号写成 owner。
- 新建行程不再默认塞 Noah/Mia/Yuki/Leo 测试成员。
- 行程卡片显示具体成员，不显示、不记录草稿数量。
- 首页不再放“发起行程”，发起入口在行程页。
- 发起行程和行程设置都支持填写非必填酒店地址或地图链接。
- 行程设置支持修改行程名称、开始日期、结束日期。

### 行程详情与活动

- 术语统一：行程 -> 天 -> 活动。
- 某一天标题右侧有三个点菜单。
- 三个点菜单包含：
  - 添加活动
  - 管理本日活动
  - 删除当天
- 点击“管理本日活动”后，每条活动才显示编辑/删除。
- “管理行程”只管理某天或某几天，不管理单条活动。
- 活动表单使用“时间段”，不暴露难懂字段结构。
- 添加活动时不再让用户选择活动日期。
- 总路线规则已接入：
  - 有酒店：以酒店为起点。
  - 无酒店：以第一个活动地点为起点。
  - 单地点无酒店：只查看地点或外部地图链接，不强行生成路线。

### 地点

- 地点支持新增、编辑、删除、投票、排名。
- 地点池分类简化为：
  - 待投票
  - 排名
- 添加活动选择地点时，已被其他活动使用的地点默认不显示；编辑当前活动时保留当前地点。
- 地点表单已简化：
  - 用户只需填写地点名。
  - 类型改为可选标签按钮，例如经典、餐饮、咖啡、自然、购物、交通。
  - “一定要去 / 还不错”是小标签按钮。
  - 地址或地图链接合并为一个输入。
  - 经纬度保留为内部字段。

### Supabase

当前采用 Phase 1 JSON workspace 存储：

- `public.trip_phase1_workspaces`
- 每个行程一行。
- `data jsonb` 保存当前前端数据结构。
- 前端 CRUD 先稳定，后续再拆 normalized schema。

已创建 migration：

```text
supabase/migrations/20260726000000_trip_phase1_workspaces.sql
supabase/migrations/20260726010000_grant_trip_phase1_workspace_access.sql
supabase/migrations/20260726020000_username_password_auth.sql
supabase/migrations/20260726030000_seed_noah_test_account.sql
```

环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_MAX_TOKENS=8000
```

`SUPABASE_SERVICE_ROLE_KEY` 只放服务端 `.env.local`，不要提交 GitHub，不要加 `NEXT_PUBLIC_`。
`DEEPSEEK_API_KEY` 也只放服务端 `.env.local`，不要提交 GitHub，不要加 `NEXT_PUBLIC_`。

### DeepSeek AI

- 已接入服务端 API 路由：`/api/trips/ai`。
- 现有按钮已接入：
  - `生成 AI 草稿`
  - `AI 整理行程`
- API key 只从服务端环境变量 `DEEPSEEK_API_KEY` 读取。
- `DEEPSEEK_API_KEY` 只填裸 key；如果误填 `Bearer ...`，服务端会自动去掉前缀。
- 默认模型为 `deepseek-v4-flash`，可用 `DEEPSEEK_MODEL` 覆盖。
- 默认 `DEEPSEEK_MAX_TOKENS=8000`，AI JSON 输出时禁用 thinking，降低返回空内容/非结构化内容的概率。
- 若 DeepSeek 上游参数不兼容或返回空/非结构化 JSON，服务端会自动重试：
  - JSON mode + disabled thinking
  - JSON mode + 不传 thinking
  - 普通文本模式并抽取 JSON
- 前端不会收到 provider key，只调用本项目 API。
- AI 输出要求结构化 JSON，结果写成新的可编辑草稿版本，不自动确认最终版。
- AI 请求会最小化发送行程数据：行程基础信息、酒店、地点池、投票理由和当前草稿，不发送账号 id、cookie 或 provider key。
- 用户已配置 DeepSeek API key 并完成本地按钮测试；当前反馈为“没问题了”。

## 当前提交状态

- 远端分支：`origin/phase1-supabase-mvp`。
- 已推送提交：`61f540a feat: add phase1 auth invites and trip settings`。
- DeepSeek AI 接入和相关修复仍在本地工作区，尚未 commit/push。

## 当前未实现

- Google Maps 短链接解析尚未实现。
- 生产级 RLS 尚未完成。
- 前端尚未部署到线上托管。

## 下一步顺序

1. 提交并推送 DeepSeek AI 接入和相关修复。
2. 做完整回归测试：
   - 我的/登录/邀请加入。
   - 行程设置、酒店地图链接、地点表单、总路线。
   - 生成 AI 草稿。
   - AI 整理行程。
3. 做生产级 RLS。
4. 前端部署到线上托管。
5. 需要时再做 Google Maps 短链接解析。

## 常用命令

用户手动启动或重启 dev server：

```powershell
cd D:\Projects\tropic-together-boyfriend

Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force }

npm.cmd run dev -- -p 3000
```

Codex 可运行的静态检查：

```powershell
npm.cmd run typecheck
npm.cmd run lint
```

## 最新验证

```text
npm.cmd run typecheck 通过
npm.cmd run lint      通过
DeepSeek AI 本地按钮测试通过（用户确认）
```
