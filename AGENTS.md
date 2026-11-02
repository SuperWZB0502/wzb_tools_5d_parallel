# 项目约定

## 唯一维护源

- 本目录是 wzb_tools_5d_parallel 的正式 Git 工作目录，本地目录名暂保留为 xy-train-5d-site。
- 页面入口：`tools/draw_parallel_card.html`。保持单 HTML、无外部运行依赖。
- 设计、部署和实现记录在 `docs/`；测试在 `tests/`；生成结果在被忽略的 `verification/`。
- 父目录中的同名文件是迁移前副本，后续只编辑本仓库，不双向同步。

## 仓库与发布

- 用户已于 2026-11-02 明确授权将仓库改为公开，以使用免费 GitHub Pages；此授权替代此前的私仓限制。
- 仓库：`https://github.com/SuperWZB0502/wzb_tools_5d_parallel`；默认分支 `main`；远端 `origin`。账户旧名为 1114120549，仓库旧名为 xy-train-5d-site。
- 开始前核对本地与远端状态，不强制推送，不覆盖用户或其他 agent 的修改；推送后核实远端提交。
- 用户已授权：完成页面修改和相关验证后，直接提交并推送到 `origin/main`，无需再次询问是否提交或发布。
- `.github/workflows/pages.yml` 是现行自动发布入口；仅 main 的 HTML 变更自动触发，也支持手动发布 main。产物根目录 index.html 必须与源 HTML 字节完全一致，并包含 .nojekyll。
- 线上网址为 `https://superwzb0502.github.io/wzb_tools_5d_parallel/`。发布后跟踪对应工作流并核对公网文件，不能只报告推送成功。
- PP 调度图沿用当前 PP/DP，MBN 按 GBS ÷（MBS × DP）计算，支持 1F1B、GPipe 与交错 VPP 1F1B。沿用各 stage 的 layerCounts，每层前向 1、反向默认 2（可调）；VPP 的 chunk 共用物理 stage，MBN 需能被 PP 整除，各 stage 层数不少于 chunk 数。保留按层等时说明、逐 stage 阶段分界开关、整数校验及大图视窗绘制；修改时运行 pipeline-model、pipeline-browser 和 pipeline-weighted-browser 测试，避免与权重图的样式、配置导出相互影响。
- Pages 首次验收已通过。旧 VPS 工作流在 GitHub 禁用，文件仅保留 workflow_dispatch；不要恢复自动 push 发布或让同一推送同时发布两端。
- 保留 VPS 站点、容器、备份与原 Actions Secrets/变量，未经后续授权不删除。
- 私钥、令牌、Secret、known_hosts 等凭据不加入 Git，不打印到聊天或日志。
- 发布配置变化后同步更新 README 和本约定。

## 本机工具与验证

- GitHub CLI 位于 `C:/Users/WZB/.local/share/xy-train-tools/github-cli/v2.103.3/bin/gh.exe`，沿用已授权账号；凭据由 CLI 管理，不读取或打印令牌。
- Windows 访问 GitHub 沿用当前系统代理，不把本机代理或凭据写入跟踪文件。
- 根据改动执行相关模型或浏览器检查。生成截图、下载的产物和临时诊断文件留在被忽略的 verification/。
- 每次交付区分本地提交、远端推送与 Pages 上线状态。
