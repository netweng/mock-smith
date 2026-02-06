# MockSmith 用户指南

MockSmith 是一款浏览器优先的 API Mock Chrome 扩展（Manifest V3），可在浏览器内直接拦截 fetch / XHR 请求，按规则返回伪造响应，无需代理或后端，同时支持 REST 和 GraphQL。

---

## 目录

1. [安装与启动](#安装与启动)
2. [Popup（弹窗）](#popup弹窗)
3. [Rules Dashboard（规则面板）](#rules-dashboard规则面板)
4. [Edit Rule（规则编辑）](#edit-rule规则编辑)
5. [Traffic Logs（流量日志）](#traffic-logs流量日志)
6. [Sidebar（侧边栏）](#sidebar侧边栏)

---

## 安装与启动

1. 在项目根目录执行 `npm run build`，产出 `dist/` 目录。
2. 打开 `chrome://extensions`，开启 **Developer Mode**。
3. 点击 **Load unpacked**，选择 `dist/` 文件夹。
4. 浏览器工具栏出现 MockSmith 图标即安装成功。

---

## Popup（弹窗）

点击工具栏的 MockSmith 图标即可打开弹窗，这是日常操作最频繁的入口。

### Master Switch（全局开关）

弹窗顶部的开关控制 MockSmith 的全局拦截功能：

- **开启**：所有已启用的规则开始拦截匹配请求。
- **关闭**：所有拦截暂停，请求照常到达服务器。

### Active Rules（活跃规则列表）

Master Switch 下方列出当前已启用的规则（最多显示 8 条），每条规则显示：

| 元素 | 说明 |
|------|------|
| 方法标签 | `GET` / `POST` / `GQL` 等，用颜色区分 |
| 规则名称 | 规则的可读名称 |
| URL Pattern | 匹配的 URL 通配符模式 |
| Toggle 开关 | 单独启用 / 禁用该条规则 |

如果超过 8 条活跃规则，底部会显示 "+N more" 的提示。

### Open Dashboard（打开面板）

底部的 **Open Dashboard** 按钮会打开完整的规则管理面板（即 Dashboard），在新标签页中展示。

### 状态栏

弹窗最底部显示当前状态：

- 绿色脉冲点 + "Active · N rules"：拦截已开启，N 条规则活跃。
- 灰色点 + "Inactive"：拦截已关闭。

---

## Rules Dashboard（规则面板）

Dashboard 是 MockSmith 的核心管理界面，可通过 Popup 的 "Open Dashboard" 或右键扩展图标 → "选项" 进入。

### 顶部栏

- **标题**：显示 "Rules Dashboard"。
- **活跃规则计数**：格式为 "Active rules: M / N"。
- **全局开关**：同 Popup 的 Master Switch，可直接在 Dashboard 切换。

### 搜索筛选

搜索框支持按以下字段模糊搜索：

- 规则名称
- URL Pattern
- HTTP 方法
- 类型（rest / graphql）

### 规则表格

每条规则以表格行展示，包含以下列：

| 列 | 说明 |
|----|------|
| Active | 复选框，点击切换规则启用 / 禁用 |
| Method | HTTP 方法标签（GET / POST / PUT / DELETE / PATCH / GQL） |
| Rule Name | 规则名称，点击跳转到编辑页面 |
| Pattern | URL 匹配模式（支持 `*` 通配符） |
| Type | `rest` 或 `graphql` |
| Action | `mock` / `rewrite` / `passthrough` 标签 |
| Actions | 鼠标悬停显示操作按钮：**Edit**（编辑）、**Duplicate**（复制）、**Delete**（删除） |

### Import / Export（导入 / 导出）

工具栏中的 **Import** 和 **Export** 按钮支持规则的批量管理：

| 操作 | 说明 |
|------|------|
| **Export** | 将当前所有规则导出为 JSON 文件（`mocksmith-rules-YYYY-MM-DD.json`） |
| **Import** | 从 JSON 文件导入规则。自动按"名称 + URL"去重，已存在的规则会被跳过。导入完成后显示结果提示 |

导出的 JSON 格式为规则数组，可直接在团队间共享或版本控制。

### 拖拽排序（规则优先级）

规则表格左侧显示拖拽手柄（⠿ 图标），拖动行可调整规则顺序。**排列越靠前的规则优先级越高**——匹配引擎按数组顺序依次评估，命中第一条即停止。

> 注意：搜索筛选时拖拽排序不可用。

### New Rule（新建规则）

点击右上角的 **+ New Rule** 按钮跳转到规则编辑页面，创建新规则。

---

## Edit Rule（规则编辑）

点击 New Rule 按钮或在规则表格中点击某条规则名称，都会进入 Edit Rule 页面。页面分为三个区块。

### 1. Matching Criteria（匹配条件）

| 字段 | 说明 |
|------|------|
| **Rule Name** * | 规则的可读名称（必填） |
| **Description** | 规则描述，帮助团队理解用途 |
| **Type** | 选择 `REST` 或 `GraphQL` |
| **Method** | HTTP 方法：GET / POST / PUT / DELETE / PATCH |
| **URL Pattern** * | URL 匹配模式（必填），支持 `*` 通配符，例如 `*/api/v1/users/*` |
| **GraphQL Operation Name** | （仅 GraphQL 类型可见）指定要匹配的 GraphQL 操作名 |
| **Variables Match** | （仅 GraphQL 类型可见）JSON 对象，用于子集匹配请求变量 |
| **Match Headers** | 可选，点击 "Add Header" 添加需要匹配的请求头键值对 |

### 2. Action（动作）

三种动作模式，以卡片形式展示，点击选择：

| 动作 | 说明 |
|------|------|
| **Mock** | 不发送真实请求，直接返回下方配置的伪造响应 |
| **Rewrite** | 先发送真实请求获取响应，再将下方配置的 body 浅合并到真实响应中 |
| **Passthrough** | 匹配规则但放行请求，不做任何修改（白名单模式） |

### 3. Response（响应配置）

> 选择 Passthrough 时此区块隐藏。

| 字段 | 说明 |
|------|------|
| **Status Code** | HTTP 状态码，可手动输入或点击快捷按钮：200 OK / 201 Created / 404 Error / 500 Server |
| **Response Latency** | 模拟延迟（0 – 5000ms），通过滑块或输入框设置 |
| **Response Body (JSON)** | JSON 编辑器，支持 **FORMAT JSON**（格式化）和 **COPY**（复制）操作，底部实时显示 JSON 校验状态 |

### 页面操作

- **Save Changes / Create Rule**：保存规则并返回 Dashboard。
- **Discard / Cancel**：放弃修改并返回。
- **Delete Rule**：（仅编辑模式）删除当前规则。

---

## Traffic Logs（流量日志）

Traffic Logs 页面实时展示被 MockSmith 拦截的请求记录。

### 顶部栏

- **Back to Rules**：返回 Rules Dashboard。
- **Live 指示灯**：绿色脉冲动画，表示日志正在实时采集。
- **Refresh**：手动刷新日志列表。
- **Clear**：清除所有已记录的日志。

### 筛选栏

三个筛选按钮，可组合使用：

| 筛选项 | 说明 |
|--------|------|
| **Mocked** | 仅显示被 Mock 拦截的请求 |
| **Redirected** | 仅显示被 Rewrite 处理的请求 |
| **Passthrough** | 仅显示被 Passthrough 匹配的请求 |

每个按钮旁附带当前该类型的日志计数。不选择任何筛选项时显示全部日志。

### 日志表格

| 列 | 说明 |
|----|------|
| Time | 拦截发生的时间（HH:MM:SS） |
| Method | HTTP 方法标签 |
| URL | 被拦截的请求 URL |
| Status | 响应状态码，颜色编码：绿色（2xx）、黄色（3xx）、红色（4xx/5xx） |
| Type | 拦截类型标签：MOCKED / REDIRECT / PASSTHROUGH |
| Action | **Edit** 按钮，点击跳转到对应规则的编辑页面 |

点击表格中的任意行，右侧详情面板展开。

### 详情面板

详情面板包含三个选项卡：

| 选项卡 | 内容 |
|--------|------|
| **Details** | URL、Method、Response Status、Action、Timestamp |
| **Headers** | 请求头键值对列表（如无则显示 "No request headers captured"） |
| **Rule** | 匹配到的规则名称和规则 ID |

面板底部提供 **Edit Matched Rule** 按钮，可直接跳转到编辑该规则。

### 存储说明

日志存储在内存中（非持久化），最多保留 500 条记录。刷新扩展页面后日志将被清空。

---

## Sidebar（侧边栏）

Dashboard 页面左侧的固定侧边栏，提供全局导航。

### 导航项

| 项目 | 图标 | 说明 |
|------|------|------|
| **All Rules** | list | 打开 Rules Dashboard，右侧显示规则总数 |
| **Traffic Logs** | history | 打开 Traffic Logs 页面 |

### Labels（标签）

标签功能当前处于 **WIP**（开发中）状态，界面显示占位标签：

- Production（绿色）
- Staging（黄色）

### 底部开关

侧边栏底部显示拦截状态开关：

- **Interception ON**：拦截已开启，开关滑块亮起。
- **Interception OFF**：拦截已关闭。

该开关与 Popup 和 Dashboard 顶部栏的全局开关同步。
