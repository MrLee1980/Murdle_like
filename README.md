# 疑案簿 · Case File

一款原创的逻辑网格推理网页游戏：嫌疑人 × 凶器 × 地点（特别篇含作案时段），
程序生成谜题 —— **保证唯一解、保证无需猜测即可纯逻辑推出**。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器（默认 5173）
npm test           # 引擎测试（单元 + fast-check 属性测试 + 压力测试）
npm run build      # 产物输出到 apps/web/dist（含 PWA Service Worker）
```

## 结构

```
packages/puzzle-core   纯 TS 推理引擎：生成器 / 回溯求解器 / 类人推理器（提示引擎）
apps/web               React 前端（Vite + Tailwind 4 + Zustand，HashRouter + PWA）
docs/DESIGN.md         设计方案与里程碑
```

## 部署

产物为纯静态文件（`apps/web/dist`），使用 HashRouter + 相对基路径，**任意静态托管直接可用**：

- **Vercel / Netlify**：构建命令 `npm run build`，输出目录 `apps/web/dist`，无需重写规则。
- **GitHub Pages**：`npm run build` 后把 `apps/web/dist` 发布到 `gh-pages` 分支（或 Actions），
  项目子路径下可直接运行，刷新不 404。
- 支持 PWA：安装到主屏后离线可玩（Service Worker 预缓存全部资源）。

## 玩法

- 点按格子循环 ✓ → ✗ → 清空；右键直接打 ✗；半透明墨迹为自动推论。
- 点线索卡片可划线标记「已排除」。
- 每案 3 次指控机会；提示由类人推理引擎逐步给出可推导的格子。
- 星级 = 3 − 误指 − 提示 − 超时（各最多扣 1）。
