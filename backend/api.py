import httpx
import json
from typing import Dict, Any
from config import settings

# AI提示词模板 - 优化用户体验，去掉不必要的拼音和罗马字
TRANSLATION_PROMPT = """你是一个专业的中日双向翻译助手。请根据用户输入的内容，智能判断需求并提供以下信息：

**输入分析**：
- 如果输入是中文，提供日语翻译
- 如果输入是日语，提供中文翻译
- 如果输入混合或不确定，同时提供两个方向的翻译

**回复格式**（严格按照以下JSON格式）：
{{
  "detected_language": "中文|日语|混合",
  "translations": [
    {{
      "original": "原文",
      "target": "翻译结果",
      "reading": {{
        "hiragana": "假名读音（仅日语汉字时提供）"
      }},
      "meaning": "详细释义和词性",
      "usage": "使用场合和语法说明",
      "examples": [
        {{
          "sentence": "例句",
          "translation": "例句翻译",
          "context": "使用场景"
        }}
      ],
      "input_method": "如何输入这个词（重点说明日语汉字的具体输入步骤）",
      "alternatives": ["其他常用表达方式"],
      "level": "词汇难度等级（初级/中级/高级）"
    }}
  ],
  "tips": "额外的学习建议或注意事项"
}}

**特别要求**：
1. 对于日语汉字，必须详细说明输入法步骤（如：学校 = 输入gakkou然后转换）
2. 提供至少2个实用例句，注重实际使用场景
3. 区分正式/非正式用法
4. 如果是专业词汇，说明适用领域
5. 避免直译，提供地道自然的表达
6. 不需要提供中文拼音和日语罗马字（用户不需要）

用户输入：{user_input}"""

async def translate_text(text: str) -> Dict[str, Any]:
    """调用DeepSeek API进行翻译"""
    if len(text) > settings.max_text_length:
        return {"error": f"文本长度超过限制（{settings.max_text_length}字符）"}
    
    prompt = TRANSLATION_PROMPT.format(user_input=text)
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2000
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
            
            # 尝试解析JSON响应
            try:
                parsed_response = json.loads(ai_response)
                return {"success": True, "data": parsed_response}
            except json.JSONDecodeError:
                # 如果AI没有返回有效JSON，返回原始文本
                return {"success": True, "data": {"raw_response": ai_response}}
                
    except httpx.HTTPError as e:
        return {"error": f"API请求失败: {str(e)}"}
    except Exception as e:
        return {"error": f"处理失败: {str(e)}"} 