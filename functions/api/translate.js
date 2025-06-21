// Cloudflare Pages Functions - 翻译API
// 路径: /api/translate

// 简化MD5实现
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位整数
  }
  return Math.abs(hash).toString(16);
}

// 智能语言检测
function detectLanguage(text) {
  const chineseRegex = /[\u4e00-\u9fff]/;
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  
  const hasChineseChars = chineseRegex.test(text);
  const hasJapaneseChars = japaneseRegex.test(text);
  
  if (hasJapaneseChars && !hasChineseChars) {
    return '日语';
  } else if (hasChineseChars) {
    return '中文';
  } else {
    return '未知';
  }
}

// 智能判断翻译类型：词语 vs 文章
function detectTranslationType(text) {
  const cleanText = text.trim();
  
  // 判断条件
  const wordCount = cleanText.length;
  const hasNewlines = /\n/.test(cleanText);
  const hasPunctuation = /[。！？．!?；;，、]/.test(cleanText);
  const hasMultipleSentences = (cleanText.match(/[。！？!?]/g) || []).length > 1;
  
  // 词语翻译的特征
  if (wordCount <= 20 && !hasNewlines && !hasMultipleSentences) {
    return 'word';
  }
  
  // 文章翻译的特征
  if (wordCount > 20 || hasNewlines || hasMultipleSentences || hasPunctuation) {
    return 'article';
  }
  
  // 默认按词语处理
  return 'word';
}

// 智能词汇分类（仅用于词语翻译）
function categorizeText(text) {
  const categories = {
    '地名': ['市', '省', '县', '区', '街', '路', '东京', '大阪', '京都', '横滨', '北京', '上海', '广州', '深圳'],
    '大学': ['大学', '学院', '学校', '研究所', '大學'],
    '计算机': ['プログラミング', '编程', '代码', 'API', 'データベース', '数据库', 'システム', '系统'],
    '美食': ['料理', '食べ物', '美食', '餐厅', 'レストラン', '寿司', '拉面'],
    '交通': ['電車', '地铁', '火车', 'バス', '公交', '飞机', '新干线'],
    '购物': ['買い物', '购物', '商店', 'ショッピング', '百货', 'デパート'],
    '旅游': ['旅行', '観光', '旅游', '景点', '名所'],
    '文化': ['文化', '伝統', '传统', '艺术', 'アート', '历史'],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  
  return '通用词汇';
}

// 基于 DeepSeek AI 的翻译函数 - 支持词语和文章两种模式
async function translateText(text, sourceLang, translationType, env) {
  const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
  
  // 从 Cloudflare 环境变量获取 API Key (安全)
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DeepSeek API Key 未配置 - 请在 Cloudflare Dashboard 中设置环境变量");
  }
  
  // 根据翻译类型生成不同的提示词
  let prompt, maxTokens;
  
  if (translationType === 'word') {
    // 词语翻译 - 保持原有详细格式
    prompt = `请翻译以下词语/短语并返回JSON格式，要求：
1. 翻译要接地气、自然，符合母语使用习惯
2. 日语翻译必须提供平假名读音
3. 避免过于书面化的表达

文本：${text}

JSON格式：
{
  "detected_language": "中文|日语",
  "translation_direction": "中→日|日→中", 
  "word_category": "地名|大学|交通|计算机|医学|法律|经济|机构|通用词汇",
  "translations": ["翻译结果"],
  "romanization": "日语读音（平假名）",
  "translation_type": "word"
}`;
    maxTokens = 1000;
  } else {
    // 文章翻译 - 简化格式，专注内容
    prompt = `请翻译以下文章/段落，要求：
1. 保持原文的语气和风格
2. 翻译要自然流畅，符合目标语言的表达习惯
3. 保持段落结构和格式
4. 只返回翻译结果，不需要额外信息

文本：${text}

请直接返回翻译结果，保持原有的段落格式。`;
    maxTokens = 4000; // 文章翻译需要更多token
  }
  
  const payload = {
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0.3,
    "max_tokens": maxTokens
  };
  
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API 错误 (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    const aiResponse = result.choices[0].message.content;
    
    if (translationType === 'word') {
      // 词语翻译 - 解析JSON响应
      try {
        const jsonStart = aiResponse.indexOf('{');
        const jsonEnd = aiResponse.lastIndexOf('}') + 1;
        const jsonStr = aiResponse.substring(jsonStart, jsonEnd);
        const parsedResponse = JSON.parse(jsonStr);
        
        return parsedResponse;
      } catch (jsonError) {
        console.error('JSON 解析失败:', jsonError);
        console.error('AI 原始响应:', aiResponse);
        // 解析失败时返回基本结构
        return {
          detected_language: sourceLang,
          translation_direction: sourceLang === '中文' ? '中→日' : '日→中',
          word_category: "通用词汇",
          translations: [aiResponse.trim()],
          translation_type: "word",
          confidence: 0.6,
          source: 'ai_fallback'
        };
      }
    } else {
      // 文章翻译 - 直接返回翻译文本
      return {
        detected_language: sourceLang,
        translation_direction: sourceLang === '中文' ? '中→日' : '日→中',
        translation: aiResponse.trim(),
        translation_type: "article",
        word_count: text.length,
        confidence: 0.9
      };
    }
    
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    throw new Error(`AI 翻译失败: ${error.message}`);
  }
}

// 统计数据更新
async function updateStats(env, type, language, category, translationType) {
  const today = new Date().toISOString().split('T')[0];
  const statsKey = `stats:${today}`;
  
  try {
    let stats = await env.STATS.get(statsKey, { type: 'json' }) || {
      date: today,
      total_requests: 0,
      cache_hits: 0,
      new_translations: 0,
      chinese_to_japanese: 0,
      japanese_to_chinese: 0,
      word_translations: 0,
      article_translations: 0,
      category_stats: {}
    };
    
    stats.total_requests++;
    
    if (type === 'cache_hit') {
      stats.cache_hits++;
    } else if (type === 'new_translation') {
      stats.new_translations++;
      if (language === '中文') {
        stats.chinese_to_japanese++;
      } else if (language === '日语') {
        stats.japanese_to_chinese++;
      }
      
      // 统计翻译类型
      if (translationType === 'word') {
        stats.word_translations++;
      } else if (translationType === 'article') {
        stats.article_translations++;
      }
    }
    
    // 只有词语翻译才记录分类统计
    if (category && translationType === 'word') {
      stats.category_stats[category] = (stats.category_stats[category] || 0) + 1;
    }
    
    await env.STATS.put(statsKey, JSON.stringify(stats));
  } catch (error) {
    console.error('统计更新失败:', error);
  }
}

// Pages Functions 导出处理函数
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS 头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { text } = await request.json();
    
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: '请输入要翻译的文本' 
      }), { status: 400, headers: corsHeaders });
    }

    const cleanText = text.trim();
    const textHash = simpleHash(cleanText);
    const cacheKey = `translation:${textHash}`;
    const sourceLang = detectLanguage(cleanText);
    const translationType = detectTranslationType(cleanText);
    const category = translationType === 'word' ? categorizeText(cleanText) : null;

    // 检查缓存
    const cached = await env.CACHE.get(cacheKey, { type: 'json' });
    if (cached) {
      cached.hit_count++;
      cached.last_accessed = new Date().toISOString();
      await env.CACHE.put(cacheKey, JSON.stringify(cached));
      await updateStats(env, 'cache_hit', sourceLang, category, translationType);
      
      return new Response(JSON.stringify({
        ...cached.translation_result,
        from_cache: true,
        cache_hit_count: cached.hit_count,
        processing_time: '<100ms'
      }), { headers: corsHeaders });
    }

    // 新翻译
    const startTime = Date.now();
    const translationResult = await translateText(cleanText, sourceLang, translationType, env);
    const processingTime = `${Date.now() - startTime}ms`;
    
    // 保存缓存
    const cacheData = {
      text_hash: textHash,
      source_text: cleanText,
      source_lang: sourceLang,
      target_lang: sourceLang === '中文' ? '日语' : '中文',
      translation_type: translationType,
      word_category: category,
      translation_result: translationResult,
      created_at: new Date().toISOString(),
      hit_count: 1,
      last_accessed: new Date().toISOString()
    };
    
    await env.CACHE.put(cacheKey, JSON.stringify(cacheData));
    await updateStats(env, 'new_translation', sourceLang, category, translationType);
    
    return new Response(JSON.stringify({
      ...translationResult,
      from_cache: false,
      cache_hit_count: 1,
      processing_time: processingTime
    }), { headers: corsHeaders });
    
  } catch (error) {
    console.error('翻译处理错误:', error);
    return new Response(JSON.stringify({ 
      error: '服务暂时不可用',
      details: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 处理 OPTIONS 请求（CORS 预检）
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
} 