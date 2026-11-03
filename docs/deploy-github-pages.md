# 发布到 GitHub Pages

> 目标：一个长期有效的网址，更新只要双击一次。
> 全程免费，唯一的可选支出是自定义域名（约 ¥70/年）。

---

## 一、先记三个数

| 项目 | 数值 |
|---|---|
| 素材原图 | 298.9 MB（149 张） |
| 压缩后 | **33.0 MB**（WebP，9.0× 压缩，1 分钟完成） |
| 线上产物 | 约 40 MB / 约 200 个文件 |

GitHub Pages 的软上限是站点 1 GB、每月 100 GB 流量。40 MB 的站，占不到 4%。

---

## 二、一次性配置（只做一次，约 10 分钟）

### 第 1 步：注册 GitHub

账号已就绪：**Drifter-Twilight**。

项目站点的网址 = `https://<用户名>.github.io/<仓库名>/`
当前是 **https://drifter-twilight.github.io/design-portfolio/**

### 第 2 步：建仓库

1. 右上角 `+` → **New repository**
2. **Repository name** 填 `design-portfolio`
   - ⚠️ 这个名字同时决定两件事：线上地址的后缀，以及 `vite.config.ts` 里的 `REPO_BASE`
   - 想改仓库名的话，`REPO_BASE` 必须跟着改，否则页面白屏（资源 404）
3. 选 **Private**（私有仓库也能开 Pages，不影响访问）
4. **不要**勾选 "Add a README file"
5. 点 Create repository

### 第 3 步：把本地代码推上去

在项目目录 `E:\design-portfolio` 打开终端（或直接跟我说「推送代码」），执行：

```bash
git init
git add -A
git commit -m "init: 作品集上线"
git branch -M main
# 已配置：git remote add origin https://github.com/Drifter-Twilight/design-portfolio.git
git push -u origin main
```

第一次推送会弹浏览器要求授权，登录 GitHub 点同意即可。

### 第 4 步：打开 Pages

1. 进入仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选 **GitHub Actions**（不要选 "Deploy from a branch"）
3. 保存

回到仓库 **Actions** 标签，能看到 `Deploy to GitHub Pages` 正在跑。等 1–2 分钟变绿，网址就能访问了：

```
https://drifter-twilight.github.io/design-portfolio/
```

---

## 三、以后每次更新（只有两步）

### 方式 A：双击（推荐，不依赖我）

1. 把新图丢进 `E:\作品集` 对应分类文件夹
2. 双击项目里的 **`deploy.bat`**

脚本会自动做完四件事，每步都有提示：

```
[1/4] 同步素材清单     → 扫描 E:\作品集，生成 works.json
[2/4] 压缩图片         → 只压新增的图，已压过的跳过
[3/4] 本地构建检查     → 出错了会停在这里，不会把坏版本推上去
[4/4] 推送到 GitHub    → 触发自动部署
```

看到「已推送，约 1-2 分钟生效」就结束了。

### 方式 B：跟我说一句话

> 「海报加了三张，发布一下」

我会跑同样的流程，顺便帮你验证线上有没有报错。

### 只改文字（不换图）

直接跟我说要改什么，或者自己改 `src/i18n/zh.ts` / `en.ts` / `src/data/profile.ts`，然后双击 `deploy.bat`。

---

## 四、压缩参数是怎么定的

脚本（`scripts/optimize-images.mjs`）的默认值：

| 参数 | 值 | 理由 |
|---|---|---|
| 最长边 | 1600 px | 你的原图大多是 1600×2848，保持不变 |
| 格式 | WebP | 同样画质下比 PNG 小一个量级 |
| 质量 | 88 | 实测 q82→9.5×、q88→7.3×、q92→5.9×；拿 100% 裁切肉眼对比，q88 与原图无从分辨 |

想重新定参数就改这两个常量：

```js
const MAX_EDGE = 1600;
const QUALITY = 88;
```

改完跑 `npm run optimize:images -- --force --apply` 全量重压。

**换了某张图的内容**（同名覆盖）时也要加 `--force`，否则脚本认为产物已存在会跳过。

---

## 五、目录约定（别弄乱）

```
E:\作品集              ← 唯一素材源（脚本只读，绝不修改）
  design-portfolio/
    raw/works/         ← 原图副本（300MB，不入库，sync 每次重建）
    public/works-opt/  ← 压缩产物（33MB，入库，线上用这个）
    public/preview/    ← 卡片小图（4.4MB，入库）
    public/profile/    ← 头像与简历（3.6MB，入库）
    src/data/works.json ← 作品清单（脚本生成，禁止手改）
```

`.gitignore` 已经把 `raw/`、`node_modules/`、`dist/`、`_shot/` 排除了，所以仓库只有约 45 MB。

---

## 六、常见问题

**Q：推上去后网址 404**
Settings → Pages 的 Source 没选 **GitHub Actions**；或 `vite.config.ts` 的 `REPO_BASE` 与仓库名不一致（改了仓库名却没改它，资源会全 404、页面白屏）。

**Q：Actions 报错 `npm ci` 失败**
本地 `package-lock.json` 和 `package.json` 不一致。在本地跑一次 `npm install`，再提交。

**Q：图片显示不出来**
压图没跑。执行 `npm run optimize:images -- --apply` 后重新部署。

**Q：国内访问慢**
`github.io` 在国内时快时慢，这是常态。你的站只有 40MB 且图片懒加载，实测首屏约 1–2 秒。如果实在不能接受，换 Cloudflare Pages（同样是静态产物，只是重新指一次仓库，代码不用改）。

**Q：想换自定义域名**
1. 买个域名（阿里云 / Cloudflare / Namesilo 都行）
2. 仓库 Settings → Pages → Custom domain 填进去
3. 域名服务商那边加一条 CNAME 指向 `drifter-twilight.github.io`
4. 勾选 Enforce HTTPS

不需要备案（GitHub 服务器在境外）。

**Q：改坏了想退回上一版**
```bash
git log --oneline          # 找到能用的那次提交
git reset --hard <提交号>
git push --force
```
或者直接跟我说「退回上一版」。

---

## 七、如果以后要换平台

代码是标准 Vite 静态站，产物就是 `dist/`，任何静态托管都能接：

| 平台 | 免费额度 | 换过去要改什么 |
|---|---|---|
| GitHub Pages | 1 GB 站点 / 100 GB 流量 | 当前方案 |
| Cloudflare Pages | 带宽不限 / 2 万文件 | 连仓库，构建命令 `npm run build`，产物目录 `dist` |
| Vercel | 100 GB 流量 | 同上 |

换平台不会白做——压缩流程、目录结构、`deploy.bat` 都能继续用，只是 `git push` 之后由谁构建不同。
