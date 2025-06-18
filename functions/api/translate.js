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

    // 调用DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `请分析以下文本并返回JSON格式的翻译结果。你需要：
1. 检测语言（chinese或japanese）
2. 提供准确的翻译
3. 给出输入法建议和使用示例

文本：${text}

请严格按照以下JSON格式返回：
{{
  "detected_language": "chinese或japanese",
  "translation": "翻译结果",
  "input_methods": ["输入法建议1", "输入法建议2"],
  "examples": ["使用示例1", "使用示例2"],
  "alternatives": ["替代表达1", "替代表达2"],
  "tips": "实用小贴士"
}}`
        }],
        temperature: 0.7,
        max_tokens: 1500
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
        detected_language: "unknown",
        translation: content,
        input_methods: [],
        examples: [],
        alternatives: [],
        tips: "AI返回格式异常，请重试"
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