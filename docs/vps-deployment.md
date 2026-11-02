# XY-Train 5D 并行实验台：VPS 部署执行说明

> 历史 VPS 部署与回滚参考：2026-11-02 已迁移 GitHub Pages，VPS 自动发布停用。现行流程以仓库 README 和 docs/pages-deployment.md 为准；不要按本文重新启用自动发布或清理回滚资源。

本文交给管理 VPS 的 agent 执行。目标是将现有 HTML 部署为公开网站，访问者打开网址即可使用，不需要下载文件、安装依赖或登录。

本文只提供部署任务与验收要求，尚未连接服务器或执行上线。服务器系统、域名、现有 Web 服务均需由执行 agent 先核实。

## 1. 给服务器 agent 的任务

请检查 VPS 的现有环境，选择合适的静态网站部署方式，将下述 HTML 原样发布，并完成 HTTPS、开机自动运行、外网访问和页面功能验证，最后提供访问网址及回滚方法。

- 优先复用已有 Nginx、Caddy、宝塔/其他面板或反向代理入口；空服务器可使用 Caddy。
- 使用独立域名/子域名与独立站点目录；保留现有网站、证书、SSH 访问和防火墙规则。
- 先备份将修改的文件和配置，再实施变更；配置校验通过后再平滑加载。
- 本应用只需要静态文件服务，不需要运行 Python、Node.js 应用、数据库、训练服务或额外上传接口。
- 只发布 HTML 文件，不要把整个开发目录、测试、验证结果和本文一起放进公开站点目录。
- 如果缺少源文件、目标域名或所需权限，明确指出缺少哪一项。其余环境检查、文件准备和配置草案可先完成。

## 2. 交付文件

| 项目 | 内容 |
| --- | --- |
| 本地源文件 | `C:\Users\WZB\XY-Train-5D\xy-train-5d-site\tools\draw_parallel_card.html` |
| 网站入口文件名 | `index.html`，内容与源文件完全一致 |
| 建议服务器站点目录 | `/var/www/xy-train-5d` |
| 建议备份目录 | `/var/backups/xy-train-5d/时间戳/`，位于公开站点之外 |
| 本次文件大小 | 121696 字节 |
| 本次 SHA-256 | `0277197ba9561248e85646b18b4ae05e90aa25ce61fe15cd6012d99527a2fc9a` |

以上大小和校验值对应本次交接版本；之后如果更新 HTML，必须重新计算。除文件名改成 `index.html` 外，无需进行构建或修改页面代码。

**远程 agent 无法直接读取上述 Windows 路径。** 请通过当前已有的文件传输能力取得 HTML；如果对话中只有本文而没有 HTML，请先取得该文件。

如需人工传输，可在持有源文件的 Windows 电脑上使用以下示例。先将 `SSH_USER`、`SERVER_IP` 换成真实值；自定义 SSH 端口时使用实际端口。

```powershell
scp "C:\Users\WZB\XY-Train-5D\xy-train-5d-site\tools\draw_parallel_card.html" SSH_USER@SERVER_IP:/tmp/xy-train-5d-upload.html
```

应用的计算、绘图、配置导入/导出和 SVG 下载都在访问者的浏览器中执行。当前页面没有外部资源依赖或应用后端请求；每位访问者独立使用，不提供多人共享配置或服务端保存功能。

## 3. 先核实环境与访问地址

执行前记录以下实际信息，不要把示例域名当成用户的域名：

| 项目 | 需确认的实际值 |
| --- | --- |
| 系统 | 发行版、版本、是否使用 systemd；以下命令示例适用于 Linux |
| 入口 | 公网 IPv4/IPv6、现有代理/CDN/面板、80/443 的监听程序 |
| 域名 | 用户已指定或已经为本项目规划的域名/子域名 |
| DNS | A 记录是否指向本 VPS；有 AAAA 时 IPv6 是否真实可用 |
| 网络规则 | 云安全组与系统防火墙是否允许所需 HTTP/HTTPS 入口 |
| 现有服务 | 实际服务名、配置文件路径、站点配置加载方式、证书管理方式 |
| 文件 | 上传文件路径、校验值、目标目录是否专属于本项目 |

地址选择：

1. 有已确定域名：按该域名部署 HTTPS，作为最终入口。
2. 没有确定域名：先检查可用地址与端口，准备部署；可用 `http://公网IP:未占用端口/` 做临时验收。正式域名尚未确定时只询问域名选择，不擅自接管已有域名。
3. 已有 Nginx/Caddy/面板：增加本项目的站点配置，不替换现有默认站点或整个全局配置文件。
4. 如果现有服务运行于容器：沿用容器挂载、端口和管理方式，不额外启动另一个抢占 80/443 的实例。

## 4. 上传、校验与发布文件

下面是 Linux Bash 示例。先核对路径与文件归属；如果该目录已有其他项目，不要直接复用。记录 `BACKUP_DIR` 的实际值，后续回滚要使用。

```bash
set -euo pipefail

SITE_ROOT='/var/www/xy-train-5d'
UPLOAD_FILE='/tmp/xy-train-5d-upload.html'
EXPECTED_SHA256='0277197ba9561248e85646b18b4ae05e90aa25ce61fe15cd6012d99527a2fc9a'
BACKUP_DIR="/var/backups/xy-train-5d/$(date -u +%Y%m%dT%H%M%SZ)"

# 上传文件必须与本次交接的源文件一致。
printf '%s  %s\n' "$EXPECTED_SHA256" "$UPLOAD_FILE" | sha256sum --check -

sudo install -d -m 0755 "$SITE_ROOT"
sudo install -d -m 0700 "$BACKUP_DIR"

if sudo test -f "$SITE_ROOT/index.html"; then
    sudo cp -p "$SITE_ROOT/index.html" "$BACKUP_DIR/index.html"
fi

# 先写临时文件，再在同一目录内替换入口，避免访问到半个文件。
sudo install -m 0644 "$UPLOAD_FILE" "$SITE_ROOT/index.html.new"
sudo mv -f -- "$SITE_ROOT/index.html.new" "$SITE_ROOT/index.html"

sudo sha256sum "$SITE_ROOT/index.html"
printf 'Backup directory: %s\n' "$BACKUP_DIR"
```

同时备份本次会修改的站点/代理配置，并记录原文件是否存在、原权限与恢复位置。确保 Web 服务运行用户可以遍历目录并读取 `index.html`；若系统启用 SELinux，按该系统现有站点方式配置文件上下文。

## 5. 配置 Web 服务：选择其中一种

### 方案 A：复用已有 Nginx

按照现有 Nginx 的站点管理方式新建独立虚拟主机。不要假定所有系统都使用 `sites-enabled`；先确认配置的实际 include 路径。

以下是已有有效证书后的 HTTPS 配置示例。将 `parallel.example.com` 及证书路径替换为真实值；如现有入口已统一处理 HTTPS，则在该入口配置对应静态站点即可。

```nginx
server {
    listen 80;
    server_name parallel.example.com;
    return 301 https://parallel.example.com$request_uri;
}

server {
    listen 443 ssl;
    server_name parallel.example.com;

    ssl_certificate /实际证书目录/fullchain.pem;
    ssl_certificate_key /实际证书目录/privkey.pem;

    root /var/www/xy-train-5d;
    index index.html;
    charset utf-8;
    autoindex off;

    # 允许缓存校验，避免更新后长期使用旧页面。
    add_header Cache-Control "no-cache" always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

若没有证书，先通过已有面板/ACME 工具完成域名证书签发及自动续期；HTTP 校验阶段按工具要求保留 challenge 路径，不能直接加载不存在的证书文件。尚未配置 HTTPS 的 HTTP 临时站点不算正式 HTTPS 上线完成。

如果域名启用了 AAAA，按实际 IPv6 网络补充对应的 IPv6 监听并验证该入口；不能让 IPv6 请求落入其他默认站点。不使用 IPv6 时，不保留错误的 AAAA 记录。

检查配置，只有通过后才平滑加载：

```bash
sudo nginx -t
# 上一条通过后执行；服务名以实际环境为准。
sudo systemctl reload nginx
```

确认对应服务处于运行状态且随系统启动。静态文件发布不需要启动应用进程。Nginx 的静态目录、HTTPS 与重载方式见[静态服务说明](https://nginx.org/en/docs/beginners_guide.html)、[HTTPS 配置](https://nginx.org/en/docs/http/configuring_https_servers.html)和[服务控制说明](https://nginx.org/en/docs/control.html)。缓存头语义见[headers 模块](https://nginx.org/en/docs/http/ngx_http_headers_module.html)。

### 方案 B：空服务器使用 Caddy，或复用已有 Caddy

已有 Caddy 时在实际配置中加入本站点；不要用下面片段覆盖整个配置文件。空服务器按当前发行版的[官方安装方法](https://caddyserver.com/docs/install)安装并使用系统服务管理。

将示例域名替换为真实域名：

```caddyfile
parallel.example.com {
    root * /var/www/xy-train-5d
    encode gzip
    header Cache-Control "no-cache"
    file_server
}
```

Caddy 可直接提供[静态文件服务](https://caddyserver.com/docs/quick-starts/static-files)。域名 DNS 正确、所需端口可达且证书存储可持久化时，可以自动申请、续期证书并将 HTTP 重定向到 HTTPS，条件见[自动 HTTPS 文档](https://caddyserver.com/docs/automatic-https)。不要给正式域名前加 `http://`，否则会关闭该站点的自动 HTTPS。

以下命令仅适用于使用该路径的常规 Caddyfile/systemd 安装；先核实实际配置路径：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
# 校验通过且服务已经运行时平滑加载。
sudo systemctl reload caddy
```

若为首次安装且服务尚未启动，校验通过后使用 `sudo systemctl enable --now caddy`；已运行的服务使用重载。系统服务与配置持久化方式见[Caddy 运行说明](https://caddyserver.com/docs/running)。

### 只有 IP 的临时访问

沿用所选 Web 服务创建一个独立的 HTTP 监听端口，例如经确认未占用的 8080，并仅为该端口设置本项目的静态目录。检查云端与系统入口规则后，提供 `http://实际公网IP:实际端口/` 验收地址。

记录此地址是临时 HTTP 入口，域名和正式 HTTPS 仍待完成；不要把自签名证书的浏览器警告当成公网可信 HTTPS 验收通过。

## 6. 发布时必须保留的页面行为

- 使用 `text/html` 返回入口，并采用 UTF-8；浏览器应直接打开页面，不是把 HTML 当附件下载。
- 不添加阻断当前内联 JavaScript/CSS 的站点策略。若继承了统一 CSP，须检查本页面的实际执行情况并针对本站点处理兼容性。
- 保留浏览器全屏功能及本地 Blob 文件下载，不设置会禁用这些现有功能的响应策略。
- 本页面没有跨域 API，不需要额外配置全局跨域放行、接口代理或上传服务。
- HTML 使用 `Cache-Control: no-cache` 或等效重新校验策略，更新后能获取新版本。若存在 CDN，更新时一并处理本站点缓存。
- 保留已有 SSH 入口；按需增加 Web 端口规则，不重置防火墙，也不停止其他站点共用的 Web 服务。

## 7. 验收：服务器检查和真实外网检查都要做

### 7.1 HTTP、HTTPS 与文件

从能够访问公网入口的独立网络执行；只访问服务器自己的 localhost 不足以证明公众可访问。示例变量必须替换为实际域名。

```bash
SITE_HOST='parallel.example.com'

curl -sSI "http://${SITE_HOST}/"
curl -fsSI "https://${SITE_HOST}/"
curl -fsS --compressed "https://${SITE_HOST}/" -o /tmp/xy-train-served.html
sha256sum /tmp/xy-train-served.html
```

验收要求：

- [ ] 正式网址通过 HTTPS 返回 200，证书链可信、域名匹配，不使用 `curl -k` 绕过验证。
- [ ] HTTP 按所选方案跳转到 HTTPS。
- [ ] 入口返回 `Content-Type: text/html`，中文正常显示，刷新不会跳到其他站点。
- [ ] 下载得到的 HTML 校验值与本次源文件一致；没有被代理注入脚本、错误页或自动改写。
- [ ] 服务由现有持久化管理方式托管，证书自动续期与配置文件持久化有效。
- [ ] 原有站点和 SSH 通道仍正常。

### 7.2 浏览器功能

用真实浏览器或现有浏览器自动化能力打开最终网址，逐项验证：

- [ ] 默认 16 卡，TP/CP/DP/PP/EP 都为 2，共 4 层，页面绘图完整。
- [ ] 未固定时悬停模块显示通信线；点击模块/rank 后固定，悬停其他卡不会切换；再次点击同一对象或画布空白可退出。
- [ ] TP/CP/DP/EP/PP 范围高亮、PP 展开收起及 rank 查询可用。
- [ ] 正向、反向、梯度同步与参数更新独立切换，相关通信线正确显示。
- [ ] 通信简述框可悬停查看详情、点击固定浮窗；WASD/拖动/缩放时浮窗跟随对应框，框移出视野时暂藏，返回后恢复。
- [ ] 左右侧栏可以收缩、恢复；全屏图标、Esc 退出、WASD 和 Ctrl＋滚轮缩放可用。
- [ ] JSON 配置导出后可以重新导入；SVG 可以下载。
- [ ] 窄屏能正常使用；控制台没有应用错误，没有新增外部资源加载失败。

如果执行环境没有浏览器，应明确报告“HTTP/证书检查已完成，交互验收待验证”，不要将交互检查标记为通过。

## 8. 更新与回滚

后续更新只需取得新版 HTML、重新计算校验值、备份当前入口，再按第 4 节原子替换 `index.html`；未修改 Web 配置时不需要重启服务。确认公网返回的是新文件，并检查 CDN/浏览器缓存。

如本次发布失败：

1. 有旧版页面：从本次记录的备份目录恢复旧 `index.html`，同样先写临时文件再替换。
2. 有配置变更：恢复本次变更前的站点配置，校验通过后平滑加载。
3. 首次部署没有旧版：撤销本次新增的站点配置/域名映射；只清理本项目新增项，不删除其他网站或停止共用 Web 服务。
4. 如果本次改过 DNS、代理或入口规则，按变更记录恢复对应项。
5. 从外网确认回滚结果，报告实际状态和失败原因。

## 9. 最终交付给用户的结果

完成后请给出以下实际信息：

```text
部署状态：已上线 / 临时 HTTP 可用 / 部分完成及阻塞原因
正式或临时访问网址：
源文件和公网文件 SHA-256：
服务器站点目录：
Web 服务及站点配置路径：
HTTPS 和自动续期状态：
服务自动启动/持久化方式：
外网 HTTP 检查结果：
浏览器交互检查结果及未验证项：
本次备份目录：
回滚操作：
对原有站点的验证结果：
```

目标是给出真实可访问、可使用、可维护的网站；未完成的步骤如实列明。
