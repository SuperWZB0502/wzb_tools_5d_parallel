# XY-Train 5D parallel-card site

The public temporary site is served from `http://176.122.133.178:8081/`.

## 项目维护入口

本目录是后续唯一维护目录，项目按用户要求使用 **GitHub 私有仓库**管理。

私有仓库：<https://github.com/1114120549/xy-train-5d-site>

- 页面源文件：`tools/draw_parallel_card.html`。
- 设计与部署说明：`docs/`；回归测试：`tests/`。
- 父目录中的旧页面、文档和测试保留为迁移前副本，后续不再编辑，避免两份源码分叉。
- 默认分支为 `main`，远端 `origin` 为 `https://github.com/1114120549/xy-train-5d-site.git`，已核实仓库为 private。Actions 自动发布已配置完成，并于 2026-11-02 验收通过。
- 自动发布只上传 HTML；文档与测试留在私仓，不会被发布到网站目录。

常规检查：在本目录执行 `git status` 查看变更；根据修改运行 `tests/` 中相关用例，再提交。推送之前确认远端仍为私有仓库，并确认是否会命中下面的自动发布条件。

首次导入提交使用 `[skip ci]`，用于初始化版本管理，不触发一次无部署凭据的发布。后续正常页面更新按下文流程提交和推送。

## Publish a change

Edit `tools/draw_parallel_card.html`, commit it, and push to `main`. The GitHub Actions workflow uploads only that file and invokes the VPS updater, which creates a timestamped backup then atomically replaces `/var/www/xy-train-5d/index.html`.

### 后续修改与自动发布约定

用户已授权：以后提出页面修改意见后，由维护 agent 在本仓库完成修改和相关验证，直接提交并推送至 GitHub 的 `main` 分支，无需每次再次询问是否提交或发布。

1. 先检查本地与远端状态，保留用户及其他 agent 的已有修改；必要时同步远端，不强制推送。
2. 修改 `tools/draw_parallel_card.html` 并运行与本次改动相关的检查，验证通过后提交、推送到 `origin/main`。
3. 页面变更推送后，`Deploy XY-Train 5D` 自动上传新版 HTML，由 VPS 备份旧版并原子替换线上入口。
4. 维护 agent 应跟踪本次 Actions 运行，并核对公网页面与本次提交的 HTML 是否一致，再向用户报告提交、工作流和网站状态。若发布失败，应排查并如实报告，不能将推送成功视为上线成功。

自动触发条件是 `main` 分支中的 `tools/draw_parallel_card.html` 或 `.github/workflows/deploy.yml` 发生变更；仅修改 README、其他文档或测试不会自动发布。网站地址为 <http://176.122.133.178:8081/>。服务器 agent 已确认设置 `Cache-Control: no-cache`，更新后刷新即可查看新版，必要时使用 `Ctrl+F5` 强制刷新。

## GitHub repository configuration

The **private** repository is `1114120549/xy-train-5d-site`. The following Actions settings are configured:

| Type | Name | Value |
| --- | --- | --- |
| Actions variable | `VPS_HOST` | `176.122.133.178` |
| Actions variable | `VPS_USER` | `codex` |
| Actions secret | `VPS_SSH_KEY` | The private deployment key, including its header and footer lines |
| Actions secret | `VPS_KNOWN_HOSTS` | `176.122.133.178 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINJHecqwruCuFXyL07Auyh82wetNqnwyB7lrxXRj0jVB` |

`VPS_HOST`、`VPS_USER`、`VPS_KNOWN_HOSTS` 和 `VPS_SSH_KEY` 均已配置。服务器 agent 已于 2026-11-02 完成 SSH 自动发布及公网验收；[首次验收工作流](https://github.com/1114120549/xy-train-5d-site/actions/runs/41383821608)结果为成功。

验收时仓库 HTML 与线上 HTML 的 SHA-256 均为 `0277197ba9561248e85646b18b4ae05e90aa25ce61fe15cd6012d99527a2fc9a`，公网返回 HTTP 200，页面备份位于 `/var/backups/xy-train-5d/20261102T033431Z`。这些是本次验收记录，后续页面更新应重新核对对应版本。

服务器 agent 已确认部署使用项目专用 Ed25519 密钥，私钥通过文件写入 GitHub Secret；`codex` 仅可免密执行 `sudo /usr/local/sbin/xy-train-5d-update /tmp/xy-train-5d-upload.html`，发布脚本为 `root:root`、权限 `755`。更换部署凭据时仍通过安全渠道设置，不写入仓库或聊天正文。

Never add the SSH private key to a tracked file. The workflow is deliberately limited to reading repository contents and publishing the one HTML file.

## VPS recovery

The active file is `/var/www/xy-train-5d/index.html`; timestamped backups are under `/var/backups/xy-train-5d/`. To roll back, copy a chosen backup to `index.html.new` and rename it to `index.html` in the same directory. No container restart is needed.
