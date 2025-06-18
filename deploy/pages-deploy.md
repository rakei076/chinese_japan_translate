# Cloudflare Pages 部署指南

## 📋 部署步骤

### 1. 准备文件
```bash
# 创建部署目录
mkdir -p build
cp frontend/* build/
```

### 2. 修改前端代码
需要将API调用改为直接调用外部API或使用无服务器函数。

### 3. 部署到Cloudflare Pages

#### 选项1: 通过Git仓库自动部署
1. 将代码推送到GitHub
2. 登录Cloudflare Dashboard
3. 进入Pages -> Create a project
4. 连接GitHub仓库
5. 设置构建命令：`cp -r frontend/* .`
6. 设置输出目录：`/`

#### 选项2: 直接上传
1. 登录Cloudflare Dashboard
2. 进入Pages -> Upload assets
3. 上传build目录中的文件

### 4. 配置API
由于前端无法直接调用DeepSeek API（跨域限制），需要使用：
- Cloudflare Workers作为代理
- 或者使用其他无服务器函数服务

## 🔧 推荐方案

建议使用**Vercel**或**Netlify**部署，它们对全栈应用支持更好：

### Vercel部署
1. 安装Vercel CLI: `npm i -g vercel`
2. 在项目根目录运行: `vercel`
3. 按提示完成部署

### 配置文件
需要创建`vercel.json`配置API路由。 