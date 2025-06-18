# 🚀 中日翻译API V2.1 部署指南

## 📋 前置要求

1. **DeepSeek API Key**
   - 访问 https://platform.deepseek.com/
   - 注册账号并获取API密钥
   - 格式：`sk-xxxxxxxxx`

2. **Cloudflare账号**
   - Workers服务
   - KV存储权限

## 🔧 两种部署方式

### 方式一：Cloudflare Workers UI（推荐）

1. **创建Worker**
   ```
   访问：https://dash.cloudflare.com/workers
   点击：创建服务 → Hello World → 创建服务
   ```

2. **配置代码**
   - 将 `src/index.js` 的完整代码粘贴到编辑器
   - 保存并部署

3. **配置环境变量**
   ```
   设置 → 变量 → 环境变量：
   - DEEPSEEK_API_KEY = sk-1bde4e88dae04224b43a8ac65e782d51
   - VERSION = 2.1
   - APP_ENV = production
   ```

4. **配置KV绑定**
   ```
   设置 → 变量 → KV命名空间绑定：
   - 变量名：CACHE，命名空间：[选择现有或创建新的]
   - 变量名：STATS，命名空间：[选择现有或创建新的]
   ```

### 方式二：命令行部署

1. **设置环境变量**
   ```bash
   # 通过命令行设置（推荐）
   wrangler secret put DEEPSEEK_API_KEY
   # 输入：sk-1bde4e88dae04224b43a8ac65e782d51
   ```

2. **更新KV配置**
   ```bash
   # 查看现有KV
   wrangler kv:namespace list
   
   # 更新 wrangler.toml 中的 KV ID
   ```

3. **部署**
   ```bash
   wrangler deploy
   ```

## 🧪 测试API

```bash
# 1. 测试翻译
curl -X POST https://your-worker.workers.dev/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "你好世界"}'

# 2. 查看统计
curl https://your-worker.workers.dev/api/stats

# 3. 检查API信息
curl https://your-worker.workers.dev/
```

## ⚠️ 安全注意事项

1. **永远不要**将API Key提交到Git仓库
2. **使用环境变量**管理敏感信息
3. **定期轮换**API密钥
4. **监控使用量**避免超额费用

## 📊 功能特性

- ✅ **DeepSeek AI翻译** - 真正的人工智能
- ✅ **智能缓存系统** - <100ms响应
- ✅ **使用统计分析** - 实时数据洞察
- ✅ **多重降级策略** - 确保服务可用
- ✅ **全球边缘部署** - 就近访问

## 🔄 版本历史

- **V2.1** - DeepSeek AI集成
- **V2.0** - 缓存+统计分析  
- **V1.0** - 基础翻译功能 