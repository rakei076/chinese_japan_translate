import httpx
import json
from typing import Dict, Any
from config import settings

# 极简AI提示词
TRANSLATION_PROMPT = """请翻译以下文本并返回JSON格式：

文本：{user_input}

JSON格式：
{{
  "detected_language": "中文|日语",
  "translation_direction": "中→日|日→中",
  "word_category": "地名|大学|交通|计算机|医学|法律|经济|机构|通用词汇",
  "translations": [{{
    "original": "原文",
    "target": "翻译结果", 
    "reading": {{"hiragana": "假名读音（日语时提供）"}},
    "meaning": "简要释义",
    "examples": [{{"sentence": "例句", "translation": "例句翻译"}}]
  }}]
}}"""

async def translate_text(text: str) -> Dict[str, Any]:
    """极简翻译API调用"""
    if len(text) > settings.max_text_length:
        return {"error": f"文本长度超过限制（{settings.max_text_length}字符）"}
    
    # 直接使用极简提示词
    prompt = TRANSLATION_PROMPT.format(user_input=text)
    
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 1000
    }
    
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.deepseek_api_url,
                json=payload,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # 解析JSON响应
            try:
                json_start = ai_response.find('{')
                json_end = ai_response.rfind('}') + 1
                json_str = ai_response[json_start:json_end]
                parsed_response = json.loads(json_str)
                
                return {"success": True, "data": parsed_response}
            except json.JSONDecodeError:
                # 解析失败时返回基本结构
                return {
                    "success": True,
                    "data": {
                        "detected_language": "未知",
                        "translation_direction": "未知",
                        "word_category": "通用词汇",
                        "translations": [{
                            "original": text,
                            "target": ai_response,
                            "reading": {"hiragana": ""},
                            "meaning": "AI返回格式异常",
                            "examples": []
                        }]
                    }
                }
                
    except httpx.HTTPError as e:
        return {"error": f"API请求失败: {str(e)}"}
    except Exception as e:
        return {"error": f"处理失败: {str(e)}"} 