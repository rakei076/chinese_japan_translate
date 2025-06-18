import httpx
import json
from typing import Dict, Any, List
from config import settings
from database import db
from validation import validator

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

async def translate_text(text: str, client_ip: str = None, user_agent: str = None) -> Dict[str, Any]:
    """
    V2.0 增强翻译API - 集成缓存和验证
    """
    try:
        # 1. 请求验证
        if client_ip:
            is_valid, error_msg = validator.validate_request(text, client_ip, user_agent)
            if not is_valid:
                return {"error": error_msg}
        
        # 2. 检查缓存
        cached_result = db.get_cached_translation(text)
        if cached_result:
            print(f"缓存命中: {text} (命中次数: {cached_result.get('cache_hit_count', 1)})")
            # 更新统计信息（缓存命中）
            if client_ip:
                db._update_daily_stats(
                    db._get_connection(), 
                    cached_result.get('detected_language', '未知'),
                    cached_result.get('detected_language', '未知'), 
                    cached_result.get('word_category', '通用词汇'),
                    is_cache_hit=True
                )
            return {"success": True, "data": cached_result}
        
        # 3. 调用AI翻译
        print(f"AI翻译: {text}")
        result = await _call_ai_translation(text)
        
        if "error" in result:
            return result
        
        # 4. 保存到数据库
        if "success" in result and "data" in result:
            translation_data = result["data"]
            db.save_translation(text, translation_data, client_ip, user_agent)
            return result
        else:
            # 兼容旧格式
            db.save_translation(text, result, client_ip, user_agent)
            return {"success": True, "data": result}
            
    except Exception as e:
        print(f"翻译处理错误: {e}")
        return {"error": f"处理失败: {str(e)}"}

async def _call_ai_translation(text: str) -> Dict[str, Any]:
    """调用AI翻译服务"""
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

# 添加工具函数
def get_translation_history(limit: int = 50, category: str = None) -> List[Dict[str, Any]]:
    """获取翻译历史"""
    return db.get_translation_history(limit, category)

def get_daily_stats(days: int = 7) -> List[Dict[str, Any]]:
    """获取每日统计"""
    return db.get_daily_stats(days)

def get_popular_translations(limit: int = 20) -> List[Dict[str, Any]]:
    """获取热门翻译"""
    return db.get_popular_translations(limit)

def get_client_status(client_ip: str) -> Dict[str, Any]:
    """获取客户端状态"""
    return validator.get_client_status(client_ip)

def get_system_stats() -> Dict[str, Any]:
    """获取系统统计"""
    validator_stats = validator.get_system_stats()
    db_stats = {
        "database": {
            "cache_enabled": True,
            "total_translations": len(db.get_translation_history(1000)),
        }
    }
    return {**validator_stats, **db_stats} 