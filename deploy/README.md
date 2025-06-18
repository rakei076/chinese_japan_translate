# 🚀 中日翻译应用部署指南

## 📋 部署选项

我们准备了三种部署方案，推荐按优先级选择：

### 🥇 **推荐方案：Vercel（最简单）**

#### 准备工作
1. 注册Vercel账号：https://vercel.com
2. 安装Vercel CLI：
```bash
npm install -g vercel
```

#### 部署步骤
1. 在项目根目录运行：
```bash
vercel
```

2. 按照提示操作：
   - 选择账号/团队
   - 项目名称：`chinese-japan-translate`（或自定义）
   - 确认项目目录
   - 选择框架：`Other`

3. 设置环境变量（在Vercel Dashboard中）：
   - `DEEPSEEK_API_KEY` = `sk-1bde4e88dae04224b43a8ac65e782d51`

4. 完成！你会得到一个网址，比如：
   `https://chinese-japan-translate.vercel.app`

---

### 🥈 备选方案：Netlify

#### 部署步骤
1. 注册Netlify账号：https://netlify.com
2. 创建`netlify.toml`文件（已准备）
3. 拖拽整个项目文件夹到Netlify部署页面
4. 设置环境变量：`DEEPSEEK_API_KEY`

---

### 🥉 备选方案：Cloudflare Pages + Workers

#### 部署步骤
1. 注册Cloudflare账号
2. 上传前端文件到Pages
3. 创建Worker处理API请求
4. 配置路由和环境变量

---

## ⚡ 快速部署（最推荐）

直接运行以下命令：

```bash
# 1. 确保在项目根目录
cd /Users/mc/Documents/GitHub/number-game/chinese_japan_translate

# 2. 安装Vercel CLI（如果还没安装）
npm install -g vercel

# 3. 部署
vercel

# 4. 生产环境部署
vercel --prod
```

## 🔧 文件结构说明

```
chinese_japan_translate/
├── frontend/           # 前端文件（HTML, CSS, JS）
├── api/               # Vercel无服务器函数
│   └── translate.py   # 翻译API
├── vercel.json        # Vercel配置
├── requirements.txt   # Python依赖
└── deploy/           # 部署相关文件
```

## 🌐 访问你的应用

部署成功后，你将获得：
- 🏠 主页：`https://你的域名.vercel.app`
- 📡 API：`https://你的域名.vercel.app/api/translate`

## 🔑 重要注意事项

1. **API密钥安全**：
   - ✅ 已在`vercel.json`中预设
   - ✅ 生产环境建议在Dashboard中设置
   
2. **域名自定义**：
   - 在Vercel Dashboard中可以设置自定义域名
   
3. **监控和日志**：
   - Vercel提供实时日志和性能监控

## 🎯 部署后测试

访问你的网站：
1. 打开主页，确认界面加载正常
2. 输入"你好"测试中译日
3. 输入"こんにちは"测试日译中
4. 检查翻译结果显示是否正常

## 📞 遇到问题？

常见问题解决：
- **API错误**：检查环境变量设置
- **页面空白**：检查浏览器控制台错误
- **翻译失败**：确认DeepSeek API密钥有效 