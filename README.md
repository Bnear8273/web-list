# 今天吃什么

一个很简单的本地个人菜单：把常吃的菜写进去，纠结的时候随机抽一道。纯静态网页，无需后端，数据保存在浏览器的 `localStorage`，可以直接部署到 GitHub Pages。

## 功能

- 添加菜品，自动拦住空名称和重名
- 点击铅笔图标就地修改菜名
- 点击垃圾桶图标，确认后删除
- 一键随机抽选；有多个菜时不会连续抽到同一道
- 刷新或重新打开页面后，菜单仍然保留
- 首次使用可一键载入示例菜单
- 手机和桌面端自适应

## 本地预览

项目没有构建步骤，也不需要安装依赖。直接打开 `index.html` 即可，或者启动一个静态服务器：

```sh
python3 -m http.server 8000
```

然后访问 <http://localhost:8000>。

## 部署到 GitHub Pages

项目已推送到 `main` 分支，并在仓库 **Settings → Pages → Build and deployment** 中使用 **Deploy from a branch**，选择 `main` 分支和 `/ (root)` 目录。

所有文件都是静态文件，资源路径均使用相对路径，放在项目子路径下也能正常打开。由于主仓库已绑定 `github.bnear8273.top`，本项目自动发布在：

<https://github.bnear8273.top/web-menu-utility/>

## 数据说明

- 存储键：`what-to-eat.dishes.v1`
- 数据只存在当前浏览器的当前站点下，不会上传到任何服务器。
- 本地预览（`localhost`）和线上 Pages 域名的数据互相独立。
- 清除浏览器站点数据会丢失菜单。

## 文件结构

```text
.
├── index.html              # 页面
├── styles.css              # 样式
├── app.js                  # 菜单增删改、随机抽取、本地存储
├── favicon.svg             # 站点图标
└── README.md
```
