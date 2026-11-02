# GitHub Pages 迁移与验收记录

日期：2026-11-02（Asia/Shanghai）。

## 发布配置

- 用户明确授权仓库改为公开，免费 GitHub Pages 资格已确认；账号更名为 SuperWZB0502，仓库更名为 wzb_tools_5d_parallel。
- 仓库：https://github.com/SuperWZB0502/wzb_tools_5d_parallel
- Pages：https://superwzb0502.github.io/wzb_tools_5d_parallel/
- Source：GitHub Actions；build_type 为 workflow；cname 为 null；https_enforced 为 true。
- main 的 tools/draw_parallel_card.html 变更自动触发，也支持手动触发 main。
- 官方静态工作流：checkout → configure-pages → 原样复制 HTML 并添加 .nojekyll → upload-pages-artifact → deploy-pages。
- 根目录 index.html 与源文件通过 cmp 校验；最小权限与 concurrency 已配置；无应用构建依赖。

## 首次手动发布

- 提交：56fc139c5b7c02bf2c29d97d9f27bdd76e066159。
- 成功运行：https://github.com/SuperWZB0502/wzb_tools_5d_parallel/actions/runs/41390796809
- HTTPS 200；Content-Type: text/html; charset=utf-8。
- 源文件及线上文件 SHA-256：0277197ba9561248e85646b18b4ae05e90aa25ce61fe15cd6012d99527a2fc9a。
- 真实 Edge 浏览器：16 张 rank 卡及 32 个模块渲染；悬浮通信、单击固定、通信浮窗随滚动、侧栏收起、缩放、WASD、全屏及 Esc 退出通过；无脚本错误。

## 名称统一与自动发布切换

- 页面标题、可见名称和描述改为 wzb_tools_5d_parallel；脚本和样式已与迁移前逐字节比较，完全一致。
- 更新后源文件 SHA-256：d50b36d5fba66a996e06426cb443b32384b59e64780a5ea2e46a6f14572edbee。
- 最终页面提交：93dd9399cdc64defcbc11c87d7721ce505958486。
- main 推送自动触发并发布成功：https://github.com/SuperWZB0502/wzb_tools_5d_parallel/actions/runs/41391171422
- 最终 HTTPS 状态：200；Content-Type: text/html; charset=utf-8。
- 最终源文件 SHA-256：d50b36d5fba66a996e06426cb443b32384b59e64780a5ea2e46a6f14572edbee。
- 最终线上文件 SHA-256：d50b36d5fba66a996e06426cb443b32384b59e64780a5ea2e46a6f14572edbee。
- 最终 Edge 浏览器 7 项验收通过，包括名称、默认绘图、悬浮通信、单击固定、浮窗跟随、侧栏、缩放、WASD 与全屏；无脚本错误，并检查了实际页面截图。
- 现有模型回归 33 项通过；HTML 的脚本及样式与迁移前逐字节一致。
- GitHub API 确认旧 VPS 工作流状态 disabled_manually，VPS_SSH_KEY/VPS_KNOWN_HOSTS Secrets 仍存在。

## VPS 回滚状态

首次 Pages 验收成功后才禁用旧 VPS 工作流；deploy.yml 同时移除 push 触发，仅保留手动入口。普通页面推送不会同时发布两端。VPS 站点、容器、备份、Actions Secrets 和变量未删除；没有执行任何服务器操作。回滚须显式启用旧工作流后手动触发。

本地仓库仍保留原目录 C:/Users/WZB/XY-Train-5D/xy-train-5d-site，origin 已指向新仓库。浏览器截图与临时检查结果保存在忽略的 verification/，不加入 Git。
