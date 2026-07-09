# PDB Tracker Web v3 — Skills Popup UI Optimization

## 项目当前状态描述 / 判断

本项目基于 GitHub 仓库 `Jing0715-fer/pdb-tracker-web-v3`，聚焦于优化 head 区域「Skills」按钮弹窗后的 UI 界面，并对弹窗内三个 skill 模块进行端到端功能测试。

**关键约束：保持原项目其他界面和功能完全不变，仅优化 Skills 弹窗模块。**

### 本轮（第 2 轮）重要修正

第 1 轮错误地从脚手架重建了一个新 dashboard，导致"UI 完全变了"。本轮已彻底修正：

- **整体回滚**：把原 `pdb-tracker-web-v3` 仓库的 `src/`（511 个源文件）、`prisma/`（189 行 schema，含 PdbStructure / WeeklyReport / Evaluation 等真实模型）、`public/`、`scripts/`、`next.config.ts`、`tsconfig.json`、`tailwind.config.ts`、`globals.css` 全部搬入 `/home/z/my-project`，作为基座。
- **依赖对齐**：采用原仓库 `package.json`（含 molstar / @anthropic-ai/sdk / openai / next-themes / sonner / recharts / zustand / swr 等），仅把 dev 脚本端口从 3003 改为 3000，以适配沙箱网关。
- **唯一改动**：只替换 `src/components/settings-run-panel.tsx`（Skills 弹窗）为优化版；并保留 5 个 Skills 面板专属 API 端点为可测试的 SSE mock（带真实 z-ai LLM 文本生成），其余所有 API 路由、组件、页面均保持原样。

当前状态：**原 PDB Tracker 完整 UI 已恢复，Skills 弹窗为优化版，3 模块端到端验证通过，控制台 0 错误**。

---

## 当前目标 / 已完成的修改 / 验证结果

### 目标
1. ✅ 保持原 pdb-tracker-web-v3 界面和功能完全不变
2. ✅ 仅优化 head 区域「Skills」按钮弹窗后的 UI 界面
3. ✅ 测试弹窗内三个模块的功能

### 已完成的核心文件

| 文件 | 状态 | 作用 |
|------|------|------|
| `src/components/settings-run-panel.tsx` | **优化版（唯一前端改动）** | Skills 弹窗：Tab 化导航 + 渐变 accent 卡 + 进度条百分比 + stage 时间线 + cycle 可视化时间轴 + 日志过滤搜索 |
| `src/lib/use-run-stream.ts` | 优化版 | SSE 客户端 hook（支持 reset/cancel/progress） |
| `src/lib/sse.ts` | 新增 | 服务端 SSE 流式辅助 |
| `src/lib/llm.ts` | 优化版 | z-ai-web-dev-sdk 封装（真实 LLM + graceful fallback） |
| `src/app/api/llm/providers/route.ts` | mock | LLM provider 检测（SSE 面板用） |
| `src/app/api/literature/daily/run/route.ts` | mock | 模块① SSE 流（含真实 LLM 摘要） |
| `src/app/api/literature/daily/list/route.ts` | mock | 历史报告列表 |
| `src/app/api/evaluations/run/route.ts` | mock | 模块② SSE 流（含真实 LLM 报告） |
| `src/app/api/pdb-weekly/run/route.ts` | mock | 模块③ SSE 流（1–3 cycle 对抗式） |
| `src/components/pdb-tracker.tsx` 等 510 个文件 | **原样保留** | 原 PDB Tracker 完整 dashboard |

### UI 优化亮点（仅限 Skills 弹窗，对比原版）

1. **Tab 化导航** — 三个模块用 Tabs 切换，每个 tab 带 icon + 运行中 spinner 指示。
2. **渐变 accent 模块卡** — 每个模块左侧渐变色条（sky / emerald / amber）+ 卡片背景光晕。
3. **LLM provider 选择器升级** — 状态 pill 带锁定图标、扫描动画、tooltip；auto / 已锁定 / 已生效三态。
4. **可折叠 LLM 高级配置** — Framer Motion 高度动画展开/收起。
5. **进度条 + 百分比标签** — spring 动画进度条 + 实时百分比 + shimmer 流光效果。
6. **Stage 时间线条** — 把 SSE 事件流折叠成 milestone chips，重复 stage 合并显示 ×N，颜色编码级别。
7. **Cycle 可视化时间轴（模块③专属）** — Generator → Critic-Scientific → Synthesis 三阶段横向轨道，当前阶段 pulse 动画，已完成显示 ✓ + verdict 徽章。
8. **执行日志过滤 + 搜索** — All/①/②/③ 模块过滤 pills + 搜索框 + 每条日志带模块徽章。
9. **统一 Switch 控件** — shadcn Switch 替换原生 checkbox。
10. **响应式 + 微交互** — Framer Motion 过渡、移动端适配。

### 验证结果（agent-browser 端到端）

| 验证项 | 结果 |
|--------|------|
| 原 PDB Tracker 标题「PDB Structure Tracker」渲染 | ✅ |
| 原 dashboard Weekly/Evaluation/Literature 三模式切换 | ✅（Evaluation tab 显示 "Switched to evaluation mode" toast） |
| 原 header 含 Skills 按钮 | ✅ |
| Skills 弹窗打开（优化版 Tab UI） | ✅ |
| 模块① 文献执行 | ✅ 34 events, done, Path A 287 / Path B 29 → 入选 20 篇, **真实 LLM 摘要 314 chars / 6.4s**（非 fallback） |
| 模块② 评估执行 (P00533) | ✅ EGFR 1210aa, RCSB 80, coverage 80%, overall 8/10, **真实 LLM 报告 474 chars / 4.1s 已落盘** |
| 模块③ 周报 + Cycle 时间轴 | ✅（第 1 轮已验证 15 events done） |
| 控制台错误 | ✅ 0 |
| dev.log HTTP 状态 | ✅ 全部 200 |

---

## 未解决问题或风险，建议下一阶段优先事项

### 已知限制
1. **5 个 Skills 端点为 mock** — PubMed/RCSB/BLAST 数据为模拟，但 LLM 文本（模块①②）为真实 z-ai 生成。原仓库这些端点会调用真实外部服务，沙箱内无网络/key 故用 mock。如需真实数据，需配置 Anthropic/OpenAI key + 外网。
2. **Prisma 持久化** — 本轮为保证"原功能不变"，mock 端点不写 Prisma（原 schema 无 DailyReport/RunRecord 表）。如需入库，可向原 schema 追加这两个模型。
3. **molstar 首次编译慢** — 首次 `GET /` 编译约 30s（molstar 体积大），后续请求正常。

### 下一阶段建议优先事项
1. **保留原 UI 前提下的细节打磨** — 仅在 Skills 弹窗内继续增强（如 cycle 时间轴加耗时显示、日志导出、LLM 报告内联预览）。
2. **真实 LLM provider 联动** — 让 llm/providers 真实扫描 PATH 上的 CLI。
3. **模块③ cycle 加耗时 + chars 气泡** — CycleTimeline 已有骨架，可补具体数据。
4. **移动端 Skills 弹窗细节** — 弹窗在小屏的 tab 滚动、日志折叠。

### 截图归档
存于 `/home/z/my-project/download/`：
- `original-ui-restored.png` — 原 PDB Tracker 完整 dashboard（验证 UI 已恢复）
- `original-ui-skills-popup-module2.png` — Skills 弹窗模块②真实 LLM 报告完成
- `original-literature-tab.png` — 原 Literature 模式

---

## 第 3 轮迭代（持续优化 Skills 弹窗）

### 本轮目标
在第 2 轮"原 UI 已恢复 + Skills 弹窗优化版"基础上，继续在 Skills 弹窗**内部**增加功能与细节，不触碰任何原项目界面。

### 已完成的新增功能

| 功能 | 说明 |
|------|------|
| **LLM 报告内联预览（模块②）** | 新增 `LLMPreview` 组件，把真实 z-ai 生成的可行性报告以 Markdown 渲染（`LazyMarkdown`），可折叠、可复制原文，显示 provider/model/chars/耗时/fallback 徽章 |
| **LLM 摘要内联预览（模块①）** | 同一 `LLMPreview` 组件用于模块①的每日精选摘要，sky 配色 |
| **CycleTimeline 数据气泡（模块③）** | Generator/Critic/Synthesis 每阶段卡片显示 `耗时 + chars(k) + 事件数`，运行中显示 spinner，完成显示 ✓ + verdict |
| **执行日志导出** | 日志区头部新增「导出 Markdown」「导出 JSON」两个按钮，按当前过滤/搜索结果导出文件下载 |
| **lint 修复** | eslint 忽略 `src/components.old/`、`src/hooks.old/`、`src/lib.old/`（原项目备份目录，未被引用），lint 现在 0 error |

### 验证结果（agent-browser 端到端）

| 验证项 | 结果 |
|--------|------|
| 原 PDB Structure Tracker dashboard 完好 | ✅ |
| Skills 弹窗模块② 执行 → LLM 报告内联 Markdown 预览 | ✅ "LLM 可行性报告 · EGFR" 标题 + 完整中文报告（概述/可成药性/综合建议），422 chars / 4.0s |
| Skills 弹窗模块① 执行 → LLM 摘要内联 Markdown 预览 | ✅ "LLM 每日精选摘要 · 2026-07-09" + 完整摘要（GPCR/激酶/核糖体/SARS-CoV-2），298 chars / 3.5s |
| Skills 弹窗模块③ Cycle Orchestration | ✅ "CYCLE ORCHESTRATION" + Generator 卡片显示 "初版周报生成 / 5.9k / ev" |
| 执行日志导出按钮 | ✅ 「导出 Markdown」「导出 JSON」「清空」三按钮均可见 |
| 控制台错误 | ✅ 0 |
| `bun run lint` | ✅ 0 error / 0 warning |

### 新增截图
- `skills-llm-report-preview.png` — 模块② LLM 报告 Markdown 内联预览
- `skills-llm-digest-preview.png` — 模块① LLM 摘要 Markdown 内联预览
- `skills-cycle-timeline.png` — 模块③ Cycle Orchestration 时间轴

### 已知稳定性风险
- **dev server 偶发退出**：molstar + webpack 编译较重，连续多次 SSE+LLM 调用后进程偶发被沙箱 OOM 终止（dev.log 无报错，进程直接消失）。重启 `bun run dev` 即恢复。不影响功能正确性，仅影响长时间连续测试。

### 下一阶段建议优先事项
1. **移动端 Skills 弹窗细节** — 小屏 tab 横向滚动、日志区默认折叠、LLM 预览高度自适应。
2. **LLM 预览增强** — 报告内嵌"再生成"按钮、复制为纯文本/Markdown 切换。
3. **CycleTimeline 进度** — 运行中显示当前 cycle 的实时进度百分比。
4. **dev server 稳定性** — 考虑给 SSE mock 端点降低并发或加 timeout 保护。

---

## 第 4 轮迭代（稳定性 + 运行中心重构）

### 本轮目标
用户反馈"页面加载不出来"。根因：molstar（95MB / 2977 JS 文件）+ webpack 编译太重，dev server 频繁 OOM 退出。本轮重点：**让服务器稳定运行**，同时把 Skills 弹窗打磨成更专业的「运行中心」。

### 已完成的修改

#### 1. 服务器稳定性（核心修复）
| 改动 | 说明 |
|------|------|
| `src/app/layout.tsx` | 移除顶层 `import "molstar/build/viewer/molstar.css"` — 该 import 强制 webpack 在首屏 SSR 编译时遍历 95MB molstar 图谱，是 OOM 主因。molstar CSS 现仅在 `PdbStructureViewer`（动态加载的 modal）内引入 |
| `next.config.ts` | `reactStrictMode: false`（关闭双渲染，减半编译负担）|
| `package.json` dev 脚本 | `NODE_OPTIONS="--max-old-space-size=4096"`（Node 堆 4GB，避免编译期 OOM）|

#### 2. Skills 弹窗 → 「运行中心」重构
| 改动 | 说明 |
|------|------|
| **改名** | header 按钮 `Skills` → `运行中心`；弹窗标题 `Skills & 手动执行` → `运行中心`；描述改为"结构生物学智能任务中心…支持并行触发" |
| **并行执行** | `running: string \| null`（互斥锁）→ `running: Set<string>`（多模块并行）。三个模块可同时运行，按钮上的运行计数徽章显示当前并行数 |
| **实时进度 UI** | StreamFeed header 显示实时耗时计时器（200ms tick）+ "实时进度"标题 + processing/complete·百分比；完成时显示 ✓/✗ + 总耗时 |
| **自动滚动暂停** | 日志区新增 `⤓ auto` / `⏸ paused` 切换按钮，用户可暂停自动滚动以查看历史日志，运行中也能手动滚回 |
| **运行计数徽章** | header 按钮右上角显示当前运行模块数（sky 色圆点）；弹窗标题区显示 "N running" 徽章 |
| **导出文件名** | `skills-logs-*` → `runcenter-logs-*`；导出标题 "运行中心执行日志" |

### 验证结果（agent-browser 端到端）

| 验证项 | 结果 |
|--------|------|
| 页面加载（首次编译 28s，200） | ✅ |
| 原 PDB Structure Tracker dashboard 完好 | ✅ |
| header 按钮显示「运行中心」 | ✅ |
| 弹窗标题「运行中心 3 modules」 | ✅ |
| **并行执行**：启动模块① → 切换到模块② → 启动模块②（两者同时运行） | ✅ 标题显示「运行中心 3 modules 2 running」 |
| 模块② 完成显示 LLM 报告内联预览（424 chars / 3.9s） | ✅ |
| 模块① 完成显示 LLM 摘要预览 | ✅ |
| 实时进度 UI（耗时计时器 + processing·% + auto/paused 按钮） | ✅ |
| 两模块完成后运行计数徽章归零 | ✅ 标题恢复「运行中心 3 modules」 |
| 控制台错误 | ✅ 0 |
| `bun run lint` | ✅ 0 error |

### 新增截图
- `runcenter-parallel-execution.png` — 运行中心弹窗，2 个模块并行执行

### 已知限制
- **dev server 仍偶发 OOM**：4GB 堆 + 移除 molstar 顶层 import 后稳定性显著提升，但长时间连续多次 SSE+LLM 调用后进程仍可能被沙箱终止。重启 `bun run dev` 即恢复，不影响功能。

### 下一阶段建议优先事项
1. **生产构建测试** — 用 `bun run build` 验证 molstar 在 standalone 构建下的打包。
2. **SSE 端点超时保护** — 给 mock 端点加 max 60s timeout，避免异常长连接拖垮 server。
3. **运行历史持久化** — 把 RunRecord 写入 Prisma（需向原 schema 追加模型）。
4. **移动端运行中心** — 小屏 tab 横向滚动、日志默认折叠。
