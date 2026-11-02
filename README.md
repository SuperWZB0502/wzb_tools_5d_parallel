# wzb_tools_5d_parallel

5D 并行权重切分与通信可视化工具，保持单 HTML、无外部运行依赖；可以在线访问，也可以保存 HTML 后离线使用。

- 网站：<https://superwzb0502.github.io/wzb_tools_5d_parallel/>
- GitHub 公开仓库：<https://github.com/SuperWZB0502/wzb_tools_5d_parallel>
- 页面源文件：`tools/draw_parallel_card.html`。
- 默认分支：`main`；远端：`origin`。
- 设计与部署说明：`docs/`；回归测试：`tests/`。

## 修改与自动发布

本仓库是页面的唯一维护源。不要在仓库中提交个人本地路径、服务器地址、私钥、访问令牌或其他凭据。

1. 先核对本地和远端状态，保留用户及其他 agent 的已有修改；必要时同步远端，不强制推送。
2. 只编辑本仓库的页面源文件，并执行与本次改动相关的检查。
3. 验证通过后提交并推送；源文件变更会自动触发 `Deploy GitHub Pages`。
4. 跟踪对应 Actions 运行，并从公网核对线上 HTML 与该提交源文件的 SHA-256，再报告提交、工作流和网站状态。推送成功不能代替上线验收。

只有 `main` 推送且 `tools/draw_parallel_card.html` 发生变更时自动发布；仅文档、测试或工作流文件变化不会自动发布。需要重发时手动触发 `.github/workflows/pages.yml` 的 `workflow_dispatch`，也仅允许发布 `main`。

## GitHub Pages 发布方式

仓库 Settings → Pages 的 Source 为 **GitHub Actions**，未配置自定义域名，GitHub 默认 HTTPS 已启用。

`.github/workflows/pages.yml` 使用官方静态发布流程：检出源文件 → 原样复制为 `_site/index.html` 并加入 `.nojekyll` → 校验两份文件完全一致 → 上传 Pages artifact → 发布。产物只包含页面与 `.nojekyll`，不上传整个仓库，不安装 Node、Python 或应用构建依赖。权限限定为 `contents: read`、`pages: write`、`id-token: write`，并使用 concurrency 避免并发发布。

部署已验收成功：[运行记录](https://github.com/SuperWZB0502/wzb_tools_5d_parallel/actions/runs/41391171422)。HTTPS 返回 200、Content-Type 为 HTML、页面字节与源文件一致，并通过真实 Edge 浏览器的绘图、通信浮窗、缩放、WASD、侧栏及全屏交互检查。
