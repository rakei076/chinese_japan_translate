"""
Vercel无服务器函数 - 中日翻译API
"""
import json
import os
import httpx
from http.server import BaseHTTPRequestHandler
import urllib.parse

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # 处理预检请求
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            # 读取请求体
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析JSON
            data = json.loads(post_data.decode('utf-8'))
            text = data.get('text', '').strip()
            
            if not text:
                self._send_error_response("输入文本不能为空")
                return
            
            # 获取API密钥
            api_key = os.environ.get('DEEPSEEK_API_KEY')
            if not api_key:
                self._send_error_response("API密钥未配置")
                return
            
            # 调用翻译API
            result = self._translate_text(text, api_key)
            
            # 返回结果
            self._send_json_response(result)
            
        except Exception as e:
            self._send_error_response(f"服务器错误: {str(e)}")

    def _translate_text(self, text: str, api_key: str) -> dict:
        """调用DeepSeek API进行翻译"""
        try:
            # 构造提示词
            prompt = f"""请翻译以下文本，并返回JSON格式：

输入文本: {text}

要求：
1. 自动检测是中文还是日文
2. 如果是中文，翻译成日文；如果是日文，翻译成中文
3. 提供读音指导（日文提供平假名）
4. 提供输入法指导
5. 严格返回JSON格式，包含：detected_language, translations数组

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

            # 发送请求到DeepSeek API
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 1000
                    }
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result["choices"][0]["message"]["content"]
                    
                    # 提取JSON内容
                    import re
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        translation_data = json.loads(json_match.group())
                        return {"success": True, "data": translation_data}
                    else:
                        return {"success": False, "error": "无法解析AI响应"}
                else:
                    return {"success": False, "error": f"API错误: {response.status_code}"}
                    
        except Exception as e:
            return {"success": False, "error": f"翻译失败: {str(e)}"}

    def _send_json_response(self, data: dict):
        """发送JSON响应"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response_text = json.dumps(data, ensure_ascii=False)
        self.wfile.write(response_text.encode('utf-8'))

    def _send_error_response(self, error_message: str):
        """发送错误响应"""
        self.send_response(400)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        error_data = {"success": False, "error": error_message}
        response_text = json.dumps(error_data, ensure_ascii=False)
        self.wfile.write(response_text.encode('utf-8')) 