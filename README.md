# wzb_tools_5d_parallel

5D 并行权重切分与通信可视化工具，保持单 HTML、无外部运行依赖；可以在线访问，也可以保存 HTML 后离线使用。

- 网站：<https://superwzb0502.github.io/wzb_tools_5d_parallel/>
- GitHub 公开仓库：<https://github.com/SuperWZB0502/wzb_tools_5d_parallel>
- 页面源文件：`tools/draw_parallel_card.html`。
- 默认分支：`main`；远端：`origin`。
- 设计与部署说明：`docs/`；回归测试：`tests/`。

## 唯一维护目录

本地正式工作目录仍为 `C:/Users/WZB/XY-Train-5D/xy-train-5d-site`，保留原本地目录名以兼容现有工作环境。父目录的旧页面、文档和测试是迁移前副本，不再编辑或双向同步。

用户已于 2026-11-02 明确授权仓库公开，用于免费的 GitHub Pages；此前“必须保持私仓”的约定已被本次授权替代。不要在仓库中提交私钥、访问令牌、Secret、known_hosts 或其他凭据。

## 后续修改与自动发布约定

用户已授权：以后提出页面修改意见后，由维护 agent 完成修改和相关验证，直接提交并推送至 `origin/main`，无需每次再次询问是否提交或发布。

1. 先核对本地和远端状态，保留用户及其他 agent 的已有修改；必要时同步远端，不强制推送。
2. 只编辑本仓库的页面源文件，并执行与本次改动相关的检查。
3. 验证通过后提交并推送；源文件变更会自动触发 `Deploy GitHub Pages`。
4. 跟踪对应 Actions 运行，并从公网核对线上 HTML 与该提交源文件的 SHA-256，再报告提交、工作流和网站状态。推送成功不能代替上线验收。

只有 `main` 推送且 `tools/draw_parallel_card.html` 发生变更时自动发布；仅文档、测试或工作流文件变化不会自动发布。需要重发时手动触发 `.github/workflows/pages.yml` 的 `workflow_dispatch`，也仅允许发布 `main`。

## GitHub Pages 发布方式

仓库 Settings → Pages 的 Source 为 **GitHub Actions**，未配置自定义域名，GitHub 默认 HTTPS 已启用。

`.github/workflows/pages.yml` 使用官方静态发布流程：检出源文件 → 原样复制为 `_site/index.html` 并加入 `.nojekyll` → 校验两份文件完全一致 → 上传 Pages artifact → 发布。产物只包含页面与 `.nojekyll`，不上传整个仓库，不安装 Node、Python 或应用构建依赖。权限限定为 `contents: read`、`pages: write`、`id-token: write`，并使用 concurrency 避免并发发布。

首次手动部署已验收成功：[运行记录](https://github.com/SuperWZB0502/wzb_tools_5d_parallel/actions/runs/41390796809)。HTTPS 返回 200、Content-Type 为 HTML、页面字节与源文件一致，并通过真实 Edge 浏览器的绘图、通信浮窗、缩放、WASD、侧栏及全屏交互检查。迁移与后续版本的具体校验记录见 [Pages 部署记录](docs/pages-deployment.md)。

## VPS 回滚保留

Pages 首次验收通过后，旧 `.github/workflows/deploy.yml` 已在 GitHub 禁用，同时删除了其 push 触发条件，仅保留显式手动回滚入口。因此普通 `main` 推送只发布到 Pages，不会同时发布 VPS。

VPS 的现有站点、容器和备份保留，未执行服务器删除或清理。Actions 中的 `VPS_SSH_KEY`、`VPS_KNOWN_HOSTS` 和原变量也保留，待用户确认 Pages 稳定后再决定是否删除。

- 原站点：`http://176.122.133.178:8081/`，切换后不再自动更新。
- 原入口：`/var/www/xy-train-5d/index.html`。
- 备份目录：`/var/backups/xy-train-5d/`。
- 更新脚本：`infra/server-update.sh`，服务器安装路径 `/usr/local/sbin/xy-train-5d-update`。

确需回滚发布到 VPS 时，由维护者显式启用旧工作流，再手动触发指定版本。仅恢复线上文件时，可由服务器 agent 将选定备份复制到站点目录的 `index.html.new`，再原子替换 `index.html`。
