"""
Cloudflare Workers Python 版本的中日翻译应用
"""
import json
import httpx
import asyncio
from js import Response, Request, Headers

# DeepSeek API 配置
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# 前端HTML内容
HTML_CONTENT = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中日翻译助手</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        /* GitHub风格样式 */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f6f8fa; }
        .card { background: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; }
        .btn-primary { background-color: #2da44e; border-color: #2da44e; }
        .alert-success { background-color: #dafbe1; border: 1px solid #2da44e; }
    </style>
</head>
<body>
    <div class="container-fluid py-4">
        <div class="row justify-content-center">
            <div class="col-md-10 col-lg-8">
                <div class="text-center mb-4">
                    <h1 class="display-6 fw-bold text-primary">
                        <i class="bi bi-translate"></i> 中日翻译助手
                    </h1>
                    <p class="text-muted">智能双向翻译，输入法指导，例句丰富</p>
                </div>
                
                <div class="card">
                    <div class="card-body p-4">
                        <div class="mb-4">
                            <label for="inputText" class="form-label fw-semibold">
                                <i class="bi bi-pencil-square"></i> 输入文本（中文或日文）
                            </label>
                            <textarea class="form-control form-control-lg" id="inputText" rows="4" 
                                placeholder="请输入要翻译的文本..." maxlength="500"></textarea>
                            <div class="d-flex justify-content-between mt-2">
                                <small class="text-muted">支持中日双向智能识别</small>
                                <small class="text-muted"><span id="charCount">0</span>/500 字符</small>
                            </div>
                        </div>
                        
                        <div class="d-grid gap-2 d-md-flex justify-content-md-center mb-4">
                            <button type="button" class="btn btn-primary btn-lg px-4" onclick="translateText()">
                                <i class="bi bi-arrow-left-right"></i> 开始翻译
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-lg px-4" onclick="clearInput()">
                                <i class="bi bi-eraser"></i> 清空
                            </button>
                        </div>
                        
                        <div id="loadingDiv" class="text-center py-4" style="display: none;">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="mt-2 text-muted">AI正在分析和翻译...</p>
                        </div>
                        
                        <div id="resultDiv" style="display: none;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function checkCharCount() {
            const input = document.getElementById('inputText');
            const charCount = document.getElementById('charCount');
            charCount.textContent = input.value.length;
        }
        
        function clearInput() {
            document.getElementById('inputText').value = '';
            document.getElementById('resultDiv').style.display = 'none';
            checkCharCount();
        }
        
        async function translateText() {
            const inputText = document.getElementById('inputText').value.trim();
            if (!inputText) { alert('请输入要翻译的文本'); return; }
            
            const loadingDiv = document.getElementById('loadingDiv');
            const resultDiv = document.getElementById('resultDiv');
            
            loadingDiv.style.display = 'block';
            resultDiv.style.display = 'none';
            
            try {
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: inputText })
                });
                
                const data = await response.json();
                loadingDiv.style.display = 'none';
                
                if (data.success) {
                    displayResult(data.data);
                } else {
                    showError(data.error || '翻译失败');
                }
            } catch (error) {
                loadingDiv.style.display = 'none';
                showError('网络错误: ' + error.message);
            }
        }
        
        function displayResult(data) {
            const resultDiv = document.getElementById('resultDiv');
            let html = '<div class="alert alert-success"><h4><i class="bi bi-translate"></i> 翻译结果</h4>';
            
            if (data.detected_language) {
                const langDisplay = data.detected_language === '中文' ? '中文 → 日语' : '日语 → 中文';
                html += `<div class="mb-3"><span class="badge bg-primary">${langDisplay}</span></div>`;
            }
            
            if (data.translations && data.translations.length > 0) {
                const t = data.translations[0];
                html += `<div class="row mb-3">
                    <div class="col-6"><div class="card bg-light p-3"><strong>原文:</strong><br>${t.original}</div></div>
                    <div class="col-6"><div class="card bg-primary text-white p-3"><strong>翻译:</strong><br>${t.target}</div></div>
                </div>`;
                
                if (t.input_method) {
                    html += `<div class="alert alert-info"><strong>输入法指导:</strong> ${t.input_method}</div>`;
                }
            }
            
            html += '</div>';
            resultDiv.innerHTML = html;
            resultDiv.style.display = 'block';
        }
        
        function showError(message) {
            const resultDiv = document.getElementById('resultDiv');
            resultDiv.innerHTML = `<div class="alert alert-danger"><strong>错误:</strong> ${message}</div>`;
            resultDiv.style.display = 'block';
        }
        
        document.getElementById('inputText').addEventListener('input', checkCharCount);
        checkCharCount();
    </script>
</body>
</html>"""

async def translate_text(text: str, api_key: str) -> dict:
    """调用DeepSeek API进行翻译"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{
                        "role": "user",
                        "content": f"""请翻译以下文本，并返回JSON格式：

输入文本: {text}

要求：
1. 自动检测是中文还是日文
2. 如果是中文，翻译成日文；如果是日文，翻译成中文
3. 提供读音指导（日文提供平假名）
4. 提供输入法指导
5. 返回JSON格式，包含：detected_language, translations数组

示例格式：
{{
  "detected_language": "中文",
  "translations": [{{
    "original": "你好",
    "target": "こんにちは", 
    "reading": {{"hiragana": "こんにちは"}},
    "input_method": "在日文输入法中输入konnichiha，选择こんにちは"
  }}]
}}"""
                    }],
                    "temperature": 0.1,
                    "max_tokens": 1000
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                # 提取JSON内容
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return {"success": True, "data": json.loads(json_match.group())}
                else:
                    return {"success": False, "error": "无法解析AI响应"}
            else:
                return {"success": False, "error": f"API错误: {response.status_code}"}
                
    except Exception as e:
        return {"success": False, "error": f"翻译失败: {str(e)}"}

async def handle_request(request):
    """处理HTTP请求"""
    url = request.url
    method = request.method
    
    # 获取API密钥（从环境变量）
    api_key = None  # 需要在Cloudflare中设置环境变量
    
    if method == "GET" and url.endswith("/"):
        # 返回前端页面
        return Response.new(
            HTML_CONTENT,
            init={"headers": {"Content-Type": "text/html;charset=utf-8"}}
        )
    
    elif method == "POST" and "/api/translate" in url:
        # 处理翻译请求
        try:
            body = await request.json()
            text = body.get("text", "").strip()
            
            if not text:
                return Response.new(
                    json.dumps({"success": False, "error": "输入文本不能为空"}),
                    init={"headers": {"Content-Type": "application/json"}}
                )
            
            if not api_key:
                return Response.new(
                    json.dumps({"success": False, "error": "API密钥未配置"}),
                    init={"headers": {"Content-Type": "application/json"}}
                )
            
            result = await translate_text(text, api_key)
            
            return Response.new(
                json.dumps(result, ensure_ascii=False),
                init={"headers": {"Content-Type": "application/json;charset=utf-8"}}
            )
            
        except Exception as e:
            return Response.new(
                json.dumps({"success": False, "error": f"服务器错误: {str(e)}"}),
                init={"headers": {"Content-Type": "application/json"}}
            )
    
    else:
        # 404
        return Response.new(
            "Not Found",
            init={"status": 404}
        )

# Cloudflare Workers 入口点
def on_fetch(request):
    return handle_request(request) 