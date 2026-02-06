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
- 按 Tab 开关：Popup 中仅保留 tab 开关，后台按需注入 `bridge.js` / `interceptor.js`，禁用时通过消息停用拦截
- Badge 状态：按 tab 展示 ON/OFF，禁用状态更可视
- 移除全局开关残留：彻底删除 `mocksmith_enabled` 存储/读写/监听逻辑、`useEnabled` hook、`getEnabled`/`setEnabled` API。SW / Bridge / storage 均不再依赖全局开关
- 简化 `GET_STATE` 消息：不再返回 `enabled` 字段，Bridge 直接下发规则
- `useLogs` 轮询优化：从 2s `setInterval` 轮询改为 `chrome.runtime.onMessage` 实时推送（SW 广播 `LOG_ADDED`）
- 注入失败可观测性：`injectContentScripts()` 失败时 `console.warn` 输出日志而非静默忽略
- 移除 Sidebar Labels WIP 占位：清理 Labels 区块及 Production/Staging 占位条目

## 二、待改进 — 拦截引擎

1. **`match.headers` 匹配**：类型已定义但拦截器未实现，需在 `interceptor.ts` 的 matchRule 流程中加入 header 比对
2. **`fetch(Request)` body 解析**：Blob / ReadableStream body 当前跳过，需 clone + 异步读取或明确不支持
3. **GraphQL 批量查询**：数组请求体（`[{query, operationName}, ...]`）未逐个匹配
4. **XHR rewrite responseType**：仅支持 `text` / 空，`arraybuffer` / `blob` / `json` 需降级或文档说明
5. **interceptor 匹配逻辑统一**：interceptor 内的匹配逻辑应完全委托 `shared/rule-engine.ts`，消除重复

## 三、待改进 — 日志与存储

1. **日志持久化**：Service Worker ring buffer 休眠后清空，可选 IndexedDB 持久化
2. **日志容量**：当前 max 500 条，可加用户可配置上限

## 四、待改进 — UI 与功能

1. **Settings 页面**：全局配置（日志上限、默认延迟、主题等）
2. **规则导入/导出**：JSON 文件批量导入导出
3. **规则排序**：拖拽排序影响匹配优先级

## 五、待改进 — 质量与发布

1. **集成测试**：核心拦截路径的端到端验证
2. **构建产物验证**：CI 流程 + 版本发布 checklist
3. **文档同步**：`docs/design.md` 与实现保持一致的机制

## 六、后续注意

- 禁用 tab 目前只发送关闭消息，注入脚本仍在页面内常驻；后续改动要注意保持 `enabled` 与规则空列表兼容
- `session` 状态不会跨浏览器重启保留，如需长期禁用需考虑迁移到 `local`
- `chrome.storage.local` 中可能残留历史 `mocksmith_enabled` 值，但代码已不再读写，不影响功能
