# 项目约定

## 唯一维护源

- 本目录是 XY-Train 5D 的正式 Git 工作目录。
- 页面入口：`tools/draw_parallel_card.html`。保持单 HTML、无外部运行依赖的部署形式。
- 设计、部署和实现记录在 `docs/`；测试在 `tests/`；生成的检查结果在被忽略的 `verification/`。
- 父目录中的同名文件是迁移前副本。后续只修改本仓库中的版本，不双向同步或覆盖父目录副本。

## 私仓和发布

- 用户要求用 GitHub 私有仓库管理；创建或关联后核实远端为 private，再推送项目内容。
- GitHub 私有仓库：`https://github.com/1114120549/xy-train-5d-site`，默认分支 `main`，远端名 `origin`。推送后核实实际远端提交，不只根据本地提交判断同步成功。
- 读取现有远端与分支状态后再工作，不强制推送，不覆盖远端已有提交。
- 保留 `.github/workflows/deploy.yml` 与 `infra/server-update.sh` 中的发布契约：推送 `main` 的 HTML/工作流变更触发发布，只上传 HTML，由 VPS 备份后原子替换入口。
- 私钥、访问令牌、`.env` 等只放在受支持的凭据存储或 GitHub Actions Secrets 中，不加入 Git。
- 配置过远端、Secrets、变量或发布方式后，及时同步 README 和本约定中的状态。
- 已配置 Actions 变量 `VPS_HOST`/`VPS_USER` 及 `VPS_KNOWN_HOSTS`/`VPS_SSH_KEY` Secrets；服务器 agent 已于 2026-11-02 完成自动部署验收，成功记录为 `https://github.com/1114120549/xy-train-5d-site/actions/runs/41383821608`。
- 用户已授权后续页面修改：完成修改并通过相关验证后，直接提交并推送至 `origin/main`，无需再次询问是否提交或发布；具体流程见 README 的“后续修改与自动发布约定”。
- 页面/工作流变更推送后跟踪本次 Actions，并核对公网页面与对应提交是否一致；如实区分推送和上线状态。仅文档或测试变更不会自动发布。

## 本机 GitHub 工具

- GitHub CLI 当前位于 `C:/Users/WZB/.local/share/xy-train-tools/github-cli/v2.103.3/bin/gh.exe`，已通过 GitHub 官方流程登录 `1114120549`。凭据由 CLI 管理，不读出或打印令牌。
- 此 Windows 环境访问 GitHub 需沿用系统代理；Git 的代理仅配置在本地 `.git/config`。CLI 如遇网络超时，应读取并使用当前系统代理，不把代理配置或凭据写入跟踪文件。

## 验证

- 根据改动执行相关模型或浏览器测试，不在部署时安装应用后端或连接训练服务。
- Git 记录应包含页面、文档与测试；生成截图、临时导入文件和本机诊断结果不加入提交。
- 每次交付如实区分本地提交、远端推送和 VPS 发布状态。
