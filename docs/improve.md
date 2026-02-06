# MockSmith 改进计划

本文件记录待改进项与后续注意点，作为迭代参考。

## 1. 待改进 — 拦截引擎

1. **`match.headers` 匹配**：类型已定义但拦截器未实现，需在 `interceptor.ts` 的 matchRule 流程中加入 header 比对。
2. **`fetch(Request)` body 解析**：Blob / ReadableStream body 当前跳过，需 clone + 异步读取或明确不支持。
3. **GraphQL 批量查询**：数组请求体（`[{query, operationName}, ...]`）未逐个匹配。
4. **XHR rewrite responseType**：仅支持 `text` / 空，`arraybuffer` / `blob` / `json` 需降级或文档说明。


## 2. 待改进 — 日志与存储

1. **日志持久化**：Service Worker ring buffer 休眠后清空，可选 IndexedDB 持久化。
2. **日志容量**：当前 max 500 条，可加用户可配置上限。


## 3. 待改进 — UI 与功能

1. **Settings 页面**：全局配置（日志上限、默认延迟、主题等）。


## 4. 待改进 — 质量与发布

1. **集成测试**：核心拦截路径的端到端验证。
2. **构建产物验证**：CI 流程 + 版本发布 checklist。
3. **文档同步**：`docs/design.md` 与实现保持一致的机制。


## 5. 后续注意

- 禁用 tab 目前只发送关闭消息，注入脚本仍在页面内常驻；后续改动要注意保持 `enabled` 与规则空列表兼容。
- `session` 状态不会跨浏览器重启保留，如需长期禁用需考虑迁移到 `local`。
- `chrome.storage.local` 中可能残留历史 `mocksmith_enabled` 值，但代码已不再读写，不影响功能。
