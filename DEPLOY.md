# Ruby 的工作台 —— 一行命令部署到公网

## 推荐方式：Surge.sh（无需账号注册，仅需邮箱）

### 第 1 步：打包（你已经拿到 /workspace 即可，无需打包）

### 第 2 步：安装 surge（首次运行一次性）

打开终端，进入 `/workspace` 目录，然后执行：

```bash
npm i -g surge
```

### 第 3 步：执行部署（30 秒拿到网址）

```bash
cd /workspace
surge
```

首次运行会依次询问：
1. **email**：填你的邮箱（任意可用邮箱都行，仅用于账号）
2. **password**：设置一个密码（≥10 位）
3. **domain**：给你的工作台起个域名，例如：

```
ruby-workbench.surge.sh
```

（域名前缀 `ruby-workbench` 改为你想用的英文短名，不要与已存在冲突；如果报错换一个）

完成后 surge 会打印：

```
Success! Published to ruby-workbench.surge.sh
```

这就是你的**长期稳定 HTTPS 网址** ✅。

### 第 4 步：手机安装

用 Safari / Chrome 打开 `https://ruby-workbench.surge.sh` → 浏览器菜单 → "添加到主屏幕" → 像 App 一样使用。

---

## 备选方式 1：Netlify（需 GitHub 账号）

1. 把 `/workspace` 推到 GitHub 仓库
2. 登录 https://app.netlify.com → New site from Git → 选仓库
3. Build command 留空，Publish directory 填 `/`
4. 部署完成，得 `xxx.netlify.app` 网址

## 备选方式 2：Vercel（需 GitHub 账号）

1. 把 `/workspace` 推到 GitHub
2. 登录 https://vercel.com → New Project → Import 仓库
3. Framework 选 Other，Output 留默认
4. 部署完成，得 `xxx.vercel.app` 网址

---

## 文件清单（部署后这些都会在公网）

```
index.html              入口页
manifest.webmanifest    PWA 清单
sw.js                   离线缓存
css/styles.css          样式（粉绿清新）
js/store.js             localStorage 存储
js/daily.js             日常工作区（日历）
js/ecom.js              跨境电商系统专区
js/other.js             其他系统进度
js/policy.js            制度建设专区
js/report.js            监管报送专区
js/app.js               路由/概览/PWA 注册
icons/icon-192.png      应用图标
icons/icon-512.png      应用图标
```

## 部署后更新数据如何处理？

- 所有数据存于**你自己手机浏览器**的 localStorage，**部署到公网后数据仍然只存在你本地**，换设备需要重新录入（这是 PWA 工作台的标准模式，如需多设备同步需要额外后端）。

- 如果你想"换手机数据还在"，可在浏览器里做 **「导出 JSON → 新设备导入」**，告诉我我立刻加一个导入导出按钮。