# Tropic Together 项目快照

最后更新：2026-08-20（Asia/Shanghai）

这份文件是当前本地项目的长期上下文快照。以后用户说“更新快照”时，默认更新本文件，而不是只依赖 Codex 对话压缩上下文，也不是更新 GitHub README。新对话开始时，先读本文件再继续。

## 当前项目

- 本地路径：`D:\Projects\tropic-together-boyfriend`
- Git 分支：`phase1-supabase-mvp`
- 远程仓库：`https://github.com/pure2271255840-hue/tropic-together.git`
- 当前状态：代码分支基于 `origin/phase1-supabase-mvp`；2026-08-20 已新增产品优化整合文档，并完成第一步数据基线改动，相关代码和文档目前均为未提交修改。
- 最新远端提交：`f07c270 Make trip cards open directly`
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
- 登录页有密码显示/隐藏按钮；已隐藏浏览器原生密码 reveal 图标，避免和应用内眼睛图标重复。
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
- `/trip/[tripId]` 下已加 `TripDataProvider` 共享内存数据，首页/地点/行程详情切 tab 时共用同一份 trip store。
- `app/trip/[tripId]/loading.tsx` 已改为不渲染整页 skeleton，避免下方 tab 切换时短暂显示“加载页面”。
- 首页加载状态是 skeleton。
- 首页右上角有时区选择器。逻辑是先用浏览器 `Intl.DateTimeFormat().resolvedOptions().timeZone` 自动识别系统时区；如果用户手动选择，则保存到 `localStorage` 并优先使用。按钮本身显示当前选择的时区。
- 首页行程提醒按所选时区和真实当前时间实时计算：当天第一项活动未到开始时间时显示“即将开始”，到时间后显示“今日执行”；如果当前行程还没开始，也用“即将开始”，不再重复显示“行程还未到开始日期”。
- PC 左下角 “Phase 1 数据模式” 卡片和导入测试数据入口已删除。
- 邀请复制改为复制邀请码，不再默认复制邀请链接；“我的”页邀请码输入框显示“邀请码”，但内部仍可识别粘贴进来的邀请链接并提取邀请码。
- 邀请加入页不再提供“切换账号”按钮。邀请码只用于加入行程，加入接口不会写入/切换登录 session。
- 邀请码已加入过当前行程时，会用应用内弹窗提示“已经加入过这个行程”，用户可取消或直接进入，不会重复创建成员。
- 行程列表卡片本身可点击进入行程，支持鼠标点击和键盘 Enter/Space；底部不再放“进入行程”按钮，只保留复制邀请码、删除、退出等操作。
- 行程列表复制邀请码按钮文字保持稳定为“复制邀请码”；复制成功后只保持成功图标/样式，不自动回退，不再造成按钮宽度跳动。

## 行程与地点体验

- “行程”页以行程列表为入口，分为“我管理的行程”和“我加入的行程”。
- 旧行程兼容：早期未绑定 `appUserId` 的发起人，会按账号昵称/用户名匹配 owner，避免老行程发起人看不到“生成 AI 草稿”按钮。
- 当前成员识别优先按登录账号匹配，不再被本地 `currentMemberId` 串号影响。
- 行程列表卡片成员展示：发起人始终在前；当前登录用户如果也是成员，会排在发起人之后；成员只能点击编辑自己在该行程里的昵称。
- 普通成员如果在某个行程里已有添加地点、投票、创建/编辑行程活动等贡献，就不能再退出该行程，避免影响行程正常继续；无贡献的普通成员可以退出。发起人不能退出自己的行程。
- 产品文案统一使用“发起人”，不再使用“管理者”。发起人的成员标签颜色保持唯一。
- “管理地点”会直接进入当前行程的地点池，不再先进入二次选择列表。
- 所有确认/删除类交互都应使用应用内 `Modal`，不要再用系统默认 `window.confirm`。
- 已替换的系统弹窗：删除行程、确认最终版、删除地点。
- 行程日删除、活动删除本来已经是自定义弹窗。
- 地点池中未投票地点仍显示在地点栏；最终版确认不被未投票地点阻止。
- 地点卡片右上角显示“某某觉得一定要去/还不错”。
- 统一产品文案叫“成员”，不要改成“参与者”。
- 地点详情中，成员不能改动他人添加的地点，只能参与投票；发起人仍可管理。
- 地点卡片上点击“想去/不想去”投票标签，会打开详情弹窗显示相关成员及原因；没有原因时不显示占位文案。
- 添加地点表单里的地点名 placeholder 已改为“活动主题”。
- 地点地址/活动地标可点击打开地图；独立地图按钮已移除。
- 地点卡片上“想去/不想去”用投票 badge 展示；编辑和删除收进右上角三点菜单。
- 分数只给 AI 参考，不在前端显示。
- 添加地点默认标签：餐饮、酒吧、购物、景点、自定义。点击“自定义 +”后变成小输入框。
- 标签按钮已经做成 chip 风格，“地点标签/初始感觉”文字改为弱化样式。
- 地图入口已收敛成单入口：地点地标、当天路线、总路线都会自动选择默认地图，不再在主界面同时显示 Apple / Google 双按钮。
- 地点地标行的展示文本优先从用户粘贴的 Google Maps URL 中解析 `/maps/place/...` 或 `/maps/search/...` 里的官方地点名；如果没有 Google 地图链接，只能显示用户输入的地址/位置文本或兜底文案，不能凭空知道官方 POI 名。
- 单地点地图链接优先尊重用户粘贴的原始 `mapUrl`；没有原始链接时，按目的地选择地图。行程目的地是中国大陆时默认 Apple Maps，非中国大陆默认 Google Maps。不要用用户当前所在地判断地图 provider。
- 路线链接同样按目的地选择：非中国大陆用 Google Maps 完整多站路线；中国大陆用 Apple Maps 完整多站路线。Apple 多站/逐段按钮已从主界面移除。
- Apple Maps 文本地理编码对马来西亚英文 POI 不稳定，尤其中国区/高德底图环境可能把地点解析到错误地区；如果后续继续优化 Apple，优先考虑让地点保存经过确认的坐标，不要让 AI 直接编坐标。
- 行程详情页去掉“管理本日活动”入口；某日活动卡右上角只显示加号，删除某日仍在“管理行程”里做。
- 活动卡标题旁有来源标签：如果活动关联了某成员添加的地点，就显示该成员“某某提议”；AI 生成且没有成员地点来源时显示“AI 建议”；手动活动按创建成员显示。
- 成员只能编辑/开关锁/删除自己的活动；只能看到其他成员活动的锁状态图标。活动锁定后，编辑和删除入口都会消失。
- 活动卡的锁/可编辑控制位于活动标题附近，不要再移到底部。
- 活动删除使用垃圾桶图标并二次确认弹窗。
- 添加/编辑活动时会做当天时间冲突提示。当前规则只看候选活动的开始时间是否落在当天其他活动的开始-结束区间内；结束时间早于开始时间的跨午夜活动不参与冲突判断。
- 最终版确认后，地点和行程内容进入锁定态：不管发起人还是成员，都不能再对地点/行程投票，也不能新增、编辑、删除地点或行程活动，相关操作入口会隐藏或不可用。
- 发起人可以取消最终版确认；取消后行程 phase 回到投票态，原有地点/行程操作权限恢复。普通成员不能取消最终版。

## AI 行程

- DeepSeek AI 接口位于本项目 API，前端不暴露 provider key。
- AI 生成第一版草稿需要已有地点。
- AI 整理行程会参考地点、投票理由、偏好排名、地址、坐标和酒店地址。
- `preferenceScore` 只作为 AI 偏好参考，不在前端显示，也不能作为唯一排序依据。
- AI prompt 已要求考虑同一天/相邻时段的路线顺畅和距离协调。
- 首页显示最近已确认行程的“下一天行程卡”，不是单个活动。
- 行程详情页保留总路线，并且每天标题下有当天路线按钮。
- 行程工作流按天分卡片；每天内部有活动顺序线，但不再用一条线连接所有日期。

## 2026-08-20 已完成：数据与上下文基线

- 新建行程要求填写目的地城市，并保存到 `trip.destinations`，不再继承 seed 的默认目的地。
- 新建行程和行程设置支持保存行程时区；输入目的地时会对常见国内/亚洲目的地给出时区推断，仍可手动修改。
- `TravelPlace` 增加官方名称、活动标题、POI provider/ID、行政区编码、坐标来源和位置确认状态等向后兼容字段。
- 旧地点在数据 compact/load 时会补齐位置来源和 `needs_confirmation` 状态；没有 POI ID 的旧地点不会被伪装成已验证官方地点。
- AI 行程项支持 `placeId`，服务端会过滤不属于当前地点池的非法 ID；本地保存时优先按 `placeId` 关联，名称匹配只作为旧数据兼容 fallback。
- AI 草稿保存时会补齐行程日期范围内的空白行程日，缺少安排的日期显示“当天尚未安排”。
- 详细整合方案位于 `docs/PRODUCT_OPTIMIZATION_PLAN.md`。

## 2026-08-20 产品痛点与市场调研

用户当前反馈的核心不是单个 bug，而是产品体验方向问题：

- 用户的旅行可能有 10 天，但当前网页实际只把两三天组织得比较可见，其余日期不容易被理解和操作。
- 添加地点仍偏“表单填空”，不能像地图/点评产品那样输入几个字就带出 POI 名称、地址、坐标、分类等信息。
- 行程生成和查看偏复杂，用户懒得看长行程，容易不知道下一步该做什么。
- 当前系统把“协作收集地点、成员投票、AI 生成草稿”做出来了，但还没有把“少输入、少决策、少阅读、直接可出行”做到位。
- 先不考虑国外时，国内地图能力应该优先服务于：POI 自动补全、准确坐标、路线时间、按天分组、地图打开/导航，而不是让用户手填地址。

公开资料调研要点：

- 高德开放平台提供搜索、输入提示、地理/逆地理编码、路径规划等 Web Service / JS API 能力。高德 JS API 的 `Autocomplete` 可做输入提示，`PlaceSearch` 可做 POI 搜索和详情；路线规划 2.0 支持驾车、公交、步行、骑行、电动车等方式，并强调起终点坐标和 POI ID 可提升路线准确性。参考：https://lbs.amap.com/api/javascript-api/guide/services/autocomplete 、https://lbs.amap.com/api/webservice/guide/api/newroute
- 百度地图开放平台提供 Place Suggestion、地点检索、地点详情、地理编码、路线规划等能力。地点输入提示能根据 query 和 region 给出候选，地点详情需要先通过检索拿到 POI uid；驾车路线规划支持 origin_uid / destination_uid，已知 POI uid 时可提升算路准确性。参考：https://lbs.baidu.com/docs/webapi?title=placev3%2Fguide%2Fwebservice-placeapiV3%2FinterfaceDocumentV3 、https://lbsyun.baidu.com/docs/webapi?title=directionv2%2Fwebservice-direction%2Fdirve
- 腾讯位置服务提供地点搜索、关键词输入提示、地址解析、逆地址解析、路线规划、距离矩阵等能力。腾讯云资料中明确 suggestion 用于自动补全，search 用于更复杂的地点搜索，distance matrix 可做批量距离/时间计算。参考：https://cloud.tencent.cn/solution/lbs 、https://developer.cloud.tencent.com/mcp/server/11471
- 携程 AI 行程助手的公开页面强调“一站式规划到预订”、真实数据验证开放时间/游玩时长/交通时间、地图拖拽编辑。这说明成熟竞品的重点不是“给用户看一大段 AI 文字”，而是数据可信、可视化调整、能落到预订/导航。参考：https://www.ctrip.com/tripplanner

国内地图供应商建议：

- 优先考虑高德：国内 POI 覆盖、路线规划、URI 调起、用户习惯都更适合国内旅行；适合做 Web 端地点补全、POI 搜索、路线时间估算和一键调起高德地图。
- 百度可作为备选：地点检索、输入提示、POI uid 和路线规划成熟，但国内日常出行用户心智不一定比高德强。
- 腾讯适合微信生态或小程序方向：如果未来要靠微信分享/小程序使用，腾讯位置服务有协同优势；Web H5 也能用，但当前项目不是微信小程序。
- 无地图 API key 时，只能解析用户粘贴的地图链接、生成地图搜索/导航链接、从 URL 中提取坐标/名称；不能自动获得官方 POI 名、营业时间、评分、真实路线时间。

优化方向建议：

1. 地点添加从“表单”改为“搜索选点”
   - 一个输入框优先搜索 POI，候选显示：官方地点名、简短地址、类别、距离/城市。
   - 用户点选后自动填入：地点名、地址、坐标、POI ID、地图链接、类别。
   - 表单字段降级为“补充备注/为什么想去/预计停留时间”，避免用户手填地址。

2. 地点池改为“收集箱 + 地图/列表双视图”
   - 默认展示地点名、成员态度、票数、备注摘要。
   - 地址只作为辅助信息，不占据主视觉。
   - 如果地点没有可靠坐标，显示“需要确认位置”，让发起人一键补全。

3. AI 生成前先做“自动整理地点”
   - 按城市/区域/日期候选做聚类。
   - 用地图 API 的距离矩阵或路线规划获取通勤时间，而不是只让 AI 读地址猜。
   - 先给发起人一个极简确认：“每天想安排几段？是否午休？晚上是否喝酒/夜生活？不想太赶吗？”

4. 10 天行程不要让用户读长文
   - 默认只看“今日/第 N 天卡片”，每卡只显示 3-5 个关键活动。
   - 顶部加 10 天横向日期条和进度状态：未生成、待确认、有冲突、已确认。
   - 每天卡片优先展示路线顺序、总通勤时间、是否太赶，而不是长描述。

5. AI 草稿生成结果要更像“可执行计划”
   - 每天给出：上午/午餐/下午/晚餐/晚上几个段落。
   - 每段绑定 POI 和地图坐标。
   - 显示“为什么这么排”：近、顺路、投票高、避免太赶。
   - 用户调整方式是拖动/换到另一天/锁定，不是编辑大段文字。

6. 国内路线算法落地方式
   - MVP：地点有坐标后，用高德/腾讯/百度距离矩阵计算点到点时间，再用最近邻 + 2-opt 做近似最短路线；按每天 3-6 个点即可足够快。
   - 进阶：区分步行/驾车/公交；餐饮点按午餐/晚餐时间窗约束；酒店作为每天起终点；晚上喝酒则把酒吧放在最后并减少后续交通。
   - 不建议让 AI 单独决定最优路线；AI 负责解释和偏好权衡，路线时间应由地图 API 或本地算法提供。

下个对话的推荐切入点：

- 先不要急着写代码，先把产品目标改成一句话：`帮一群懒得做攻略的人，把大家随手丢进来的地点，自动整理成每天能直接导航执行的轻量行程。`
- 然后定 MVP 优先级：
  1. 国内地图 provider 选择：高德优先。
  2. 添加地点改成搜索选点。
  3. 行程页改成 10 天横向日期导航 + 单日重点卡片。
  4. AI 生成前只问 3 个偏好：节奏、晚间安排、交通方式。
  5. AI 生成后只给 1 个版本，但支持锁定/拖动/重新整理。

## 最近提交

```text
f07c270 Make trip cards open directly
c70d516 Support Google Maps search labels
641d792 Refine map labels and trip card controls
1abf67e Show vote details and joined invite prompts
e633458 Reduce missing trip console noise
b163ca3 Add AI itinerary preferences and route optimization
8e348a1 Tighten mobile trip card controls
9d40ab9 Use destination based map links
61fc669 Fix Apple Maps routes and final unlock
ae65608 Lock final trips and refine Apple Maps links
b68c20a Refine trip member exits and tab prefetch
```

## 已验证

最近一次代码变更后已通过：

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## 当前注意事项

- 当前数据基线代码、`docs/PRODUCT_OPTIMIZATION_PLAN.md` 和本文件均为本地未提交改动；未修改或覆盖其他用户改动。
- 如果用户要求推送快照，需要先 `git add docs/PROJECT_SNAPSHOT.md`、提交，再推送。
- 之前几次 push 都因本机 GitHub 凭据需要提升权限；每个新提交推送前都需要用户明确允许该 commit 推送到 `https://github.com/pure2271255840-hue/tropic-together.git` 的 `phase1-supabase-mvp` 分支。
- 如果线上新功能异常，先确认 Vercel 是否完成最新部署，再确认 Supabase 迁移是否已执行。
- 如果控制台再次出现 realtime token 404，优先检查 URL 中 tripId 是否仍为 `%25E9...` 这种双重编码，以及线上是否已部署包含 `decodeRouteParam` 的版本。
- 邀请链接本身不会登录邀请者账号；如果同一浏览器原本就有发起人的 session，页面会恢复当前 session。后续若要彻底避免“同浏览器已有发起人 session 时误用该账号加入/进入”，需要设计明确的账号确认或独立加入流程，但不要用“切换账号”按钮糊过去。
- 用户用 Clash for Windows；之前 GitHub push 网络不稳定和代理端口有关。曾看到 Clash 端口为 `60389`，用户也问过改回 `7890`。

## 下一步可能继续做

1. 把忘记密码从临时直改密码，升级为验证码/邮箱/安全问题流程。
2. 检查 Supabase 生产库是否已经执行 `display_name` 迁移。
3. 继续优化中国大陆访问链路，尤其是 Supabase API 与 Realtime 的稳定性。
4. 继续打磨 tab 切换手感。共享内存数据和 route loading 已处理，但首次加载某些路由 chunk 时仍可能有极短延迟；后续可考虑更积极的 prefetch 或把底部 tab 内容进一步同页化。
5. 在数据基线验证通过后，国内优先接入高德输入提示/POI 搜索/路线规划/距离矩阵；没有 API key 时，只能解析用户粘贴的地图链接，不能自动补全官方 POI。
6. 重新设计 10 天行程阅读体验：横向日期导航、单日卡片、路线总览、冲突/太赶提示、少文字。
7. 如用户继续强调审美，重点看移动端卡片密度、弹窗按钮风格、标签 chip、首页行程卡和活动卡标题区。

## 项目约定

- 不要泄露任何 secret。
- 不要把 service-role key、JWT secret、AI key 放进前端。
- 涉及 Supabase RLS/Auth/部署配置/生产 secret 的改动，先说明设计再改。
- 中国大陆可访问性是产品约束，不要引入浏览器端必须翻墙的依赖。
- 用户说“不用启动本地 dev”，就不要启动本地服务；直接改、验证、提交/推送。
- 用户说“更新快照”时，更新 `D:\Projects\tropic-together-boyfriend\docs\PROJECT_SNAPSHOT.md`。
- 产品文案保持“成员”，不要改回“参与者”。
- 角色文案保持“发起人”，不要写回“管理者”。
- 邀请相关默认复制/展示邀请码；可以兼容粘贴邀请链接，但不要把输入框文案写成“邀请码或邀请链接”。
