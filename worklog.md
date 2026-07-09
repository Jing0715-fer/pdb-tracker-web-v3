# PDB Tracker Web v3 — Skills Popup UI Optimization

## 项目当前状态描述 / 判断

本项目基于 GitHub 仓库 `Jing0715-fer/pdb-tracker-web-v3`，聚焦于优化 head 区域「Skills」按钮弹窗后的 UI 界面，并对弹窗内三个 skill 模块进行端到端功能测试。

由于当前 `/home/z/my-project` 是一个全新的 Next.js 16 脚手架，原仓库体量庞大（数百组件 + Prisma + Anthropic SDK + 真实 PubMed/RCSB/BLAST 调用），无法在沙箱内完整复刻真实外部数据源。因此采用「忠实契约 + 模拟后端」策略：

- **前端**：完整重建了原 `SettingsRunPanel` 组件（Skills 弹窗），并显著升级了 UI；同时重建了 header + 侧边栏 + dashboard 上下文，使 Skills 按钮自然落在头部。
- **后端**：按原始 SSE 契约实现了 5 个 mock API 路由，返回与原后端结构一致的 payload，使三个模块可在沙箱内端到端跑通。

当前状态：**稳定、可运行、全部 3 个模块浏览器验证通过**。

---

## 当前目标 / 已完成的修改 / 验证结果

### 目标
1. 优化 head 区域「Skills」按钮弹窗后的 UI 界面
2. 测试弹窗内三个模块（① 文献 / ② 评估 / ③ 周报）的功能
3. 保持其他界面和功能完全不变

### 已完成的核心文件

| 文件 | 作用 |
|------|------|
| `src/components/settings-run-panel.tsx` | 优化后的 Skills 弹窗组件（核心交付物） |
| `src/lib/use-run-stream.ts` | SSE 客户端消费 hook（忠实 port + 清理） |
| `src/lib/sse.ts` | 服务端 SSE 流式输出辅助函数 |
| `src/app/api/llm/providers/route.ts` | GET · LLM provider 检测 |
| `src/app/api/literature/daily/list/route.ts` | GET · 历史文献报告列表 |
| `src/app/api/literature/daily/run/route.ts` | POST · 模块① SSE 流（PubMed 双路径 → LLM 摘要） |
| `src/app/api/evaluations/run/route.ts` | POST · 模块② SSE 流（UniProt → RCSB → BLAST → 评分 → LLM 报告） |
| `src/app/api/pdb-weekly/run/route.ts` | GET+POST · 模块③ SSE 流（1–3 cycle 对抗式周报） |
| `src/app/page.tsx` | 主页面（header + sidebar + dashboard + sticky footer） |

### UI 优化亮点（对比原版）

原版弹窗是一个长滚动列表，三个模块平铺、视觉层级模糊。优化版：

1. **Tab 化导航** — 三个模块用 Tabs 切换，每个 tab 带 icon + 运行中 spinner 指示，避免长滚动。
2. **渐变 accent 模块卡** — 每个模块用左侧渐变色条（sky / emerald / amber）+ 卡片背景光晕，视觉层级清晰。
3. **LLM provider 选择器升级** — 状态 pill 带锁定图标、扫描动画、tooltip；auto / 已锁定 / 已生效三态视觉区分。
4. **可折叠 LLM 高级配置** — 用 Framer Motion 高度动画展开/收起，默认隐藏减少噪音。
5. **SSE 进度流重设计** — 独立 `StreamFeed` 组件：header 带 event 计数 + 状态徽章、可选进度条、monospace 时间戳 + 彩色 stage + 自动滚动。
6. **统一 Switch 控件** — 用 shadcn Switch 替换原生 checkbox，触摸友好、视觉一致。
7. **共享执行日志** — 底部可折叠日志区，带清空按钮、彩色左边框、scroll-area、可展开 details。
8. **响应式** — 移动端 tab 仅显示序号、按钮自适应、侧边栏抽屉化。
9. **Sticky footer** — 主页 footer 用 `mt-auto` 自然贴底，短页面也贴底。
10. **微交互** — Framer Motion 处理日志区展开、LLM 配置展开等过渡。

### 验证结果（agent-browser 端到端）

通过 `agent-browser` 完整测试：

| 模块 | 操作 | 结果 |
|------|------|------|
| ① 文献 | 点「执行」 | ✅ 34 SSE events，progress 0→100，`done` 状态，stage: init→pubmed-pathA/B→dedup→method-filter→llm-digest→exec-summary→write-db |
| ② 评估 | 点「执行」(P00533) | ✅ 14 SSE events，`done` 状态，EGFR 1210aa，RCSB 47 条，coverage 90%，overall 7/10，LLM 报告 303 chars 已落盘 |
| ③ 周报 | 选 cycle 1 → 点「立即触发」 | ✅ 15 SSE events，`done` 状态，ISO Week 2026-W28，C1 Generator 6156 chars，3 文件落盘 |
| LLM 配置 | 点「LLM 配置」 | ✅ 展开 Provider/APIKey/BaseURL/Model/System 5 字段 |
| 移动端 | viewport 390×844 | ✅ 弹窗、tab、表单均正常渲染 |
| 控制台 | `agent-browser errors` | ✅ 0 错误 |
| API | dev.log | ✅ 全部 GET/POST 返回 200 |

`bun run lint` 通过（0 errors / 0 warnings）。

---

## 未解决问题或风险，建议下一阶段优先事项

### 已知限制
1. **后端为 mock** — 三个 SSE 端点返回模拟数据（确定性延迟 + 随机计数），未接入真实 PubMed / RCSB / UniProt / BLAST / LLM。如需真实数据，需引入原仓库的 `@anthropic-ai/sdk`、Prisma schema、以及外部 API 调用逻辑。
2. **无持久化** — 未使用 Prisma/SQLite，历史报告列表与 DB 计数均为内存生成。原仓库用 Prisma 持久化 `PubMedArticle` / `Evaluation` / `WeeklyReport` 等表。
3. **LLM provider 检测为静态** — 当前固定返回 zai / cli:hermes / anthropic / openai 四个「可用」provider。原仓库会真实扫描 PATH 上的 hermes / claude / codex CLI 与环境变量 API key。

### 下一阶段建议优先事项
1. **接入真实 LLM** — 用 `z-ai-web-dev-sdk`（已在 skills 中）替换 mock，让模块②的 LLM 报告与模块①的逐篇摘要生成真实文本。
2. **接入真实 PubMed** — 模块①可调用 NCBI E-utilities（eutils.ncbi.nlm.nih.gov）做真实双路径检索。
3. **接入真实 RCSB** — 模块②/③ 可调用 RCSB PDB REST API 拉取本周结构。
4. **Prisma 持久化** — 落地 `schema.prisma`，让历史报告、评估结果、周报真正入库。
5. **UI 细节增强** — 为进度条加阶段性百分比标签；为模块③的 cycle 加可视化时间轴；为执行日志加按模块过滤。

### 截图归档
全部验证截图存于 `/home/z/my-project/download/`：
- `skills-module1-running.png` / `skills-module1-done.png`
- `skills-module3-done.png`
- `skills-llm-config.png`
- `dashboard-desktop.png` / `dashboard-mobile.png`
- `skills-mobile.png`
