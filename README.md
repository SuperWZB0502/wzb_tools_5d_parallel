# XY-Train 5D parallel-card site

The public temporary site is served from `http://176.122.133.178:8081/`.

## 项目维护入口

本目录是后续唯一维护目录，项目按用户要求使用 **GitHub 私有仓库**管理。

私有仓库：<https://github.com/1114120549/xy-train-5d-site>

- 页面源文件：`tools/draw_parallel_card.html`。
- 设计与部署说明：`docs/`；回归测试：`tests/`。
- 父目录中的旧页面、文档和测试保留为迁移前副本，后续不再编辑，避免两份源码分叉。
- 默认分支为 `main`，远端 `origin` 为 `https://github.com/1114120549/xy-train-5d-site.git`，已核实仓库为 private。下方 Actions 自动发布仍需配置部署凭据并验证。
- 自动发布只上传 HTML；文档与测试留在私仓，不会被发布到网站目录。

常规检查：在本目录执行 `git status` 查看变更；根据修改运行 `tests/` 中相关用例，再提交。推送之前确认远端仍为私有仓库，并确认是否会命中下面的自动发布条件。

首次导入提交使用 `[skip ci]`，用于初始化版本管理，不触发一次无部署凭据的发布。后续正常页面更新按下文流程提交和推送。

## Publish a change

Edit `tools/draw_parallel_card.html`, commit it, and push to `main`. The GitHub Actions workflow uploads only that file and invokes the VPS updater, which creates a timestamped backup then atomically replaces `/var/www/xy-train-5d/index.html`.

## GitHub repository configuration

The **private** repository has been created at `1114120549/xy-train-5d-site`. Configure the following Actions settings before using automatic VPS deployment:

| Type | Name | Value |
| --- | --- | --- |
| Actions variable | `VPS_HOST` | `176.122.133.178` |
| Actions variable | `VPS_USER` | `codex` |
| Actions secret | `VPS_SSH_KEY` | The private deployment key, including its header and footer lines |
| Actions secret | `VPS_KNOWN_HOSTS` | `176.122.133.178 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINJHecqwruCuFXyL07Auyh82wetNqnwyB7lrxXRj0jVB` |

当前已设置 `VPS_HOST`、`VPS_USER` 和 `VPS_KNOWN_HOSTS`；`VPS_SSH_KEY` 尚未配置，自动发布链路还未运行验收。

请由持有 VPS 部署专用私钥的服务器 agent 将其加入本仓库的 `VPS_SSH_KEY` Actions Secret，再验证现有 `production` 工作流与服务器更新命令。私钥通过 Secret 的安全输入渠道设置，不写入仓库或聊天正文。首次建仓只同步代码，没有修改 VPS 上的当前网站。

Never add the SSH private key to a tracked file. The workflow is deliberately limited to reading repository contents and publishing the one HTML file.

## VPS recovery

The active file is `/var/www/xy-train-5d/index.html`; timestamped backups are under `/var/backups/xy-train-5d/`. To roll back, copy a chosen backup to `index.html.new` and rename it to `index.html` in the same directory. No container restart is needed.
