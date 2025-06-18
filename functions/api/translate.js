export async function onRequestPost(context) {
  const { request, env } = context;
  
  // 设置CORS头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await request.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "请输入要翻译的文本" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    if (text.length > 500) {
      return new Response(
        JSON.stringify({ error: "文本长度不能超过500字符" }), 
        { status: 400, headers: corsHeaders }
      );
    }

    // 🤖 极简AI提示词
    const prompt = `请翻译以下文本并返回JSON格式：

文本：${text}

JSON格式：
{
  "detected_language": "中文|日语",
  "translation_direction": "中→日|日→中",
  "word_category": "地名|大学|交通|计算机|医学|法律|经济|机构|通用词汇",
  "translations": [{
    "original": "原文",
    "target": "翻译结果", 
    "reading": {"hiragana": "假名读音（日语时提供）"},
    "meaning": "简要释义",
    "examples": [{"sentence": "例句", "translation": "例句翻译"}]
  }]
}`;

    // 调用DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API错误: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const content = deepseekData.choices[0].message.content;
    
    // 尝试解析JSON
    let result;
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      const jsonStr = content.slice(jsonStart, jsonEnd);
      result = JSON.parse(jsonStr);
      
    } catch (parseError) {
      // 如果解析失败，返回基本翻译
      result = {
        detected_language: "未知",
        translation_direction: "未知",
        word_category: "通用词汇",
        translations: [{
          original: text,
          target: content,
          reading: { hiragana: "" },
          meaning: "AI返回格式异常",
          examples: []
        }]
      };
    }

    return new Response(JSON.stringify(result), { headers: corsHeaders });

  } catch (error) {
    console.error('翻译错误:', error);
    return new Response(
      JSON.stringify({ error: `翻译服务暂时不可用: ${error.message}` }), 
      { status: 500, headers: corsHeaders }
    );
  }
} 