# MockSmith 改进计划

本文件记录已完成项与待改进项，作为后续迭代的参考。

## 一、已完成

- Traffic Logs UI：列表、筛选（Mocked/Redirected/Passthrough）、详情面板（Details/Headers/Rule tabs）、清空
- GraphQL variables 匹配：类型与规则引擎支持（深比较）
- GET GraphQL：支持从 URL query params 提取 query/operationName/variables
- query 规范化：`normalizeGraphQLQuery()` 规整空白/注释，减少误判
- Traffic Logs 数据增强：日志含 `requestHeaders` 与 `responseStatus`
- 清理废弃代码：删除 `mocksmith/` 原型目录、`MockedRequests` 页面、Categories 侧边栏区块
- 用户指南：`docs/user-guide.md` 覆盖 Popup / Dashboard / Edit Rule / Traffic Logs / Sidebar

## 二、待改进 — 拦截引擎

1. **`match.headers` 匹配**：类型已定义但拦截器未实现，需在 `interceptor.ts` 的 matchRule 流程中加入 header 比对
2. **`fetch(Request)` body 解析**：Blob / ReadableStream body 当前跳过，需 clone + 异步读取或明确不支持
3. **GraphQL 批量查询**：数组请求体（`[{query, operationName}, ...]`）未逐个匹配
4. **XHR rewrite responseType**：仅支持 `text` / 空，`arraybuffer` / `blob` / `json` 需降级或文档说明
5. **interceptor 匹配逻辑统一**：interceptor 内的匹配逻辑应完全委托 `shared/rule-engine.ts`，消除重复

## 三、待改进 — 日志与存储

1. **日志持久化**：Service Worker ring buffer 休眠后清空，可选 IndexedDB 持久化
2. **`useLogs` 轮询优化**：每 2s 轮询 → 改为 `chrome.runtime.onMessage` 推送，页面不活跃时退避
3. **日志容量**：当前 max 500 条，可加用户可配置上限

## 四、待改进 — UI 与功能

1. **Labels 管理**：侧边栏已占位 WIP，需实现标签 CRUD、规则按标签筛选
2. **Settings 页面**：全局配置（日志上限、默认延迟、主题等）
3. **规则导入/导出**：JSON 文件批量导入导出
4. **规则排序**：拖拽排序影响匹配优先级
5. **搜索增强**：按 action type、label、enabled 状态筛选

## 五、待改进 — 质量与发布

1. **集成测试**：核心拦截路径的端到端验证
2. **权限审计**：`manifest.json` 中 `activeTab` 是否必要
3. **构建产物验证**：CI 流程 + 版本发布 checklist
4. **文档同步**：`docs/design.md` 与实现保持一致的机制
