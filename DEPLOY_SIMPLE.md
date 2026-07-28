# Ruby 的工作台 · 超简单部署指南（复制粘贴即可）

目标：得到一个**长期固定、随时可访问**的网址，并能在手机上"添加到主屏幕"当 App 用。

---

## 准备工作（一次性）

1. 注册一个 GitHub 账号：https://github.com （免费）
2. 在你电脑上安装 Git：https://git-scm.com （Windows/Mac 都行，一路下一步）
3. 在电脑上安装 Node.js：https://nodejs.org （下 LTS 版，装完就有 `npm` 命令）

---

## 第 1 步：把本文件夹放到电脑

把 `ruby-workbench` 整个文件夹下载到电脑任意位置（如桌面）。

在文件夹里**右键 → 打开终端 / Git Bash**。

---

## 第 2 步：推到 GitHub（复制下面整段，一次性粘贴执行）

```bash
git init
git add .
git commit -m "Ruby工作台"
git branch -M main
```

然后去 https://github.com/new 新建一个仓库：
- Repository name 填：`ruby-workbench`
- 其他选项**不要勾选**（别建 README）
- 点 Create repository

建好后页面会显示两段命令，复制其中包含下面这行的部分执行（把 `你的用户名` 换成你真实的）：

```bash
git remote add origin https://github.com/你的用户名/ruby-workbench.git
git push -u origin main
```

看到进度条走完、终端没报错，就成功了。

---

## 第 3 步：用 GitHub 登录 Vercel 一键部署

1. 打开 https://vercel.com
2. 点 **Continue with GitHub**，用你的 GitHub 登录授权
3. 登录后点页面上的 **Add New → Project**
4. 在列表里找到 `ruby-workbench`，点 **Import**
5. 下面配置保持默认即可（Framework 选 Other，其余留空），直接点 **Deploy**
6. 等 30 秒左右，页面会显示一个网址，类似：
   ```
   https://ruby-workbench-xxxx.vercel.app
   ```

✅ 这个网址就是**长期固定网址**，不会失效。

---

## 第 4 步：手机当 App 用

用手机浏览器打开上面的网址 → 点浏览器菜单 → **"添加到主屏幕"** → 完成。
之后从主屏点开就是全屏 App，能离线使用。

---

## 以后怎么更新？

每次改完内容（在电脑上编辑文件后），在文件夹终端执行：

```bash
git add .
git commit -m "更新"
git push
```

Vercel 会自动重新部署，网址不变。

---

## 常见问题

**Q：Vercel 部署时报错？**
A：Build Command / Install Command / Output Directory 全部留空，Framework 选 Other，通常就能过。

**Q：不想用 Vercel 行不行？**
A：可以用 Netlify：打开 https://app.netlify.com/drop ，把整个文件夹拖进去即可，同样得到固定网址。

**Q：数据会丢吗？**
A：数据存在你浏览器本地（localStorage），换设备或清缓存前，记得用顶栏"⬇ 导出"备份，新设备"⬆ 导入"。
