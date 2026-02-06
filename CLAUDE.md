# CLAUDE.md

## 项目简介

MockSmith 是一个浏览器优先的 API Mock Chrome 扩展（Manifest V3）。
在浏览器内直接拦截 fetch/XHR 请求，按规则返回伪造响应，无需代理或后端。
支持 REST 和 GraphQL。

## 技术栈

- **Runtime**: Chrome Extension MV3
- **UI**: React 19 + React Router 7 + Tailwind CSS 3
- **Language**: TypeScript (strict: false)
- **Build**: Vite（popup + dashboard 页面）+ esbuild（service-worker, bridge, interceptor 独立 IIFE）
- **构建入口**: `build.mjs` 统一编排，`npm run build` 一条命令产出 `dist/`

## 目录结构

```
src/
  shared/           # 跨上下文共享代码
    types.ts         # Rule, HttpMethod, RuleType, RuleAction, TrafficLogEntry 等核心类型
    rule-engine.ts   # URL 通配符匹配 + GraphQL operationName/variables 匹配
    storage.ts       # chrome.storage.local 封装，含 dev 模式内存回退
    defaults.ts      # 首次安装的示例规则
    __tests__/       # Vitest 单元测试
  background/
    service-worker.ts  # Badge 管理、onInstalled 初始化、消息路由、日志 ring buffer
  content/
    bridge.ts        # ISOLATED world：读 storage → postMessage 到页面
    interceptor.ts   # MAIN world：覆写 fetch/XHR，匹配规则返回假响应
  popup/
    Popup.tsx        # 弹窗：全局开关 + 规则快捷列表
  dashboard/
    App.tsx          # HashRouter 路由根
    pages/
      RulesDashboard.tsx  # 规则列表（搜索、启停、复制、删除）
      EditRule.tsx         # 规则创建/编辑表单
      TrafficLogs.tsx      # 实时流量日志（筛选、详情面板）
    components/
      Sidebar.tsx     # 侧边栏导航（All Rules / Traffic Logs / Labels WIP）
      MethodBadge.tsx  # HTTP 方法标签
    hooks/
      useStorage.ts   # useRules() / useEnabled() React hooks
      useLogs.ts      # useLogs() 轮询日志 hook
public/
  manifest.json      # MV3 清单
docs/
  design.md          # 架构设计文档
  user-guide.md      # 用户指南（中文）
popup.html           # Popup 入口
dashboard.html       # Dashboard 入口（options_page）
```

## 核心架构：请求拦截链路

```
chrome.storage.local ──► Bridge (ISOLATED) ──postMessage──► Interceptor (MAIN)
                                                              │
                                                         覆写 fetch / XHR
                                                              │
                                                         命中规则 → 假响应
                                                         未命中   → 放行
```

- **Bridge** 能访问 chrome API，不能碰页面 window
- **Interceptor** 能覆写页面 fetch/XHR，不能访问 chrome API
- 两者通过 `window.postMessage` + `source: 'mocksmith-bridge'` 通信
- 规则变更时 Bridge 监听 `chrome.storage.onChanged` 自动重新投递，无需刷新页面

## 规则模型

```ts
interface Rule {
  id: string;
  enabled: boolean;
  name: string;
  description?: string;
  type: 'rest' | 'graphql';
  match: { url: string; method?: HttpMethod; headers?: Record<string, string> };
  graphqlMatch?: { operationName?: string; query?: string; variables?: Record<string, any> };
  action: 'mock' | 'rewrite' | 'passthrough';
  response: { status: number; headers?: Record<string, string>; body: any; delay?: number };
  label?: string;
  createdAt: number;
  updatedAt: number;
}
```

匹配顺序：method → URL 通配符 → GraphQL operationName/variables → 取第一条命中。
- `mock`：拦截请求，返回伪造响应
- `rewrite`：发真实请求，浅合并 rule body 到响应
- `passthrough`：匹配并记录，但放行请求

## 构建与调试

```bash
npm run build     # 产出 dist/，可直接加载为 unpacked extension
npm run dev       # Vite dev server（仅 UI 预览，chrome API 用内存回退）
npm run test      # Vitest 单元测试
```

加载方式：chrome://extensions → Developer Mode → Load unpacked → 选 dist/

## 已知局限与待改进（见 improve.md）

- `match.headers` 类型已定义但未在拦截器中实现匹配
- `fetch(Request)` 对象的 Blob/ReadableStream body 未完整解析
- GraphQL 批量查询（数组请求）未逐个匹配
- 日志仅存 Service Worker 内存（ring buffer 500 条），休眠后丢失
- XHR rewrite 的 responseType 仅支持 text/空；非 JSON 响应降级处理
- `useLogs` 每 2s 轮询，可优化为 runtime message 推送

## 编码约定

- 用中文与用户沟通，代码和注释用英文
- Tailwind 自定义色：`primary`(#3da9fc) `headline`(#094067) `paragraph`(#5f6c7b) `tertiary`(#ef4565)
- 图标：Google Material Symbols Outlined（通过 CDN 字体加载）
- 存储 key：`mocksmith_rules`、`mocksmith_enabled`
- postMessage 协议：`source: 'mocksmith-bridge'` / `source: 'mocksmith-interceptor'`
- WIP 功能用灰色 + "WIP" 标签在 UI 中占位，不隐藏入口
