// Cloudflare Workers 中日翻译 V2.1
// 支持智能缓存、统计分析、多路由 + 网页界面

// 嵌入HTML页面
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>中日翻译 V2.1</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .translate-form {
            margin-bottom: 30px;
        }
        input[type="text"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 15px;
            box-sizing: border-box;
        }
        button {
            background: #007bff;
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
        }
        button:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }
        .result {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            border-left: 4px solid #28a745;
        }
        .error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
        }
        .loading {
            text-align: center;
            color: #666;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .stat-item {
            background: #f1f3f5;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #007bff;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🈳 中日翻译 V2.1</h1>
        
        <div class="translate-form">
            <input type="text" id="textInput" placeholder="输入中文或日文..." value="你好世界">
            <button onclick="translate()">🚀 开始翻译</button>
        </div>

        <div id="result"></div>

        <div class="stats" id="stats" style="display: none;">
            <div class="stat-item">
                <div class="stat-value" id="processingTime">-</div>
                <div class="stat-label">处理时间</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="confidence">-</div>
                <div class="stat-label">置信度</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="cacheHits">-</div>
                <div class="stat-label">缓存命中</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="category">-</div>
                <div class="stat-label">词汇分类</div>
            </div>
        </div>
    </div>

    <script>
        async function translate() {
            const text = document.getElementById('textInput').value.trim();
            const resultDiv = document.getElementById('result');
            const statsDiv = document.getElementById('stats');
            
            if (!text) {
                alert('请输入要翻译的文本');
                return;
            }

            resultDiv.innerHTML = '<div class="loading">🔄 翻译中...</div>';
            resultDiv.className = 'result';

            try {
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text })
                });

                if (!response.ok) {
                    throw new Error(\`HTTP错误: \${response.status}\`);
                }

                const data = await response.json();
                
                resultDiv.innerHTML = \`
                    <h3>✅ 翻译结果</h3>
                    <p><strong>原文:</strong> \${text}</p>
                    <p><strong>译文:</strong> \${data.translations[0]}</p>
                    <p><strong>语言:</strong> \${data.detected_language}</p>
                    <p><strong>方向:</strong> \${data.translation_direction}</p>
                    <p><strong>来源:</strong> \${data.source} \${data.from_cache ? '(缓存)' : '(新翻译)'}</p>
                \`;

                document.getElementById('processingTime').textContent = data.processing_time;
                document.getElementById('confidence').textContent = Math.round(data.confidence * 100) + '%';
                document.getElementById('cacheHits').textContent = data.cache_hit_count;
                document.getElementById('category').textContent = data.word_category;
                statsDiv.style.display = 'grid';

            } catch (error) {
                resultDiv.innerHTML = \`
                    <h3>❌ 翻译失败</h3>
                    <p>错误信息: \${error.message}</p>
                \`;
                resultDiv.className = 'result error';
            }
        }

        document.getElementById('textInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                translate();
            }
        });
    </script>
</body>
</html>`;

// 简化哈希实现
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

// 智能词汇分类
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

// DeepSeek AI翻译引擎
async function translateText(text, sourceLang, env) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // 降级到简单翻译
    const simpleTranslations = {
      '你好': 'こんにちは',
      '谢谢': 'ありがとう', 
      '再见': 'さようなら',
      '东京': '東京',
      '編程': 'プログラミング',
      'こんにちは': '你好',
      'ありがとう': '谢谢',
      'さようなら': '再见', 
      '東京': '东京',
      'プログラミング': '编程'
    };
    
    const directTranslation = simpleTranslations[text];
    const category = categorizeText(text);
    
    return {
      detected_language: sourceLang,
      translation_direction: sourceLang === '中文' ? '中→日' : '日→中',
      word_category: category,
      translations: directTranslation ? [directTranslation] : [`${text}(翻译)`],
      romanization: directTranslation || text,
      confidence: directTranslation ? 0.95 : 0.6,
      source: 'fallback'
    };
  }

  // DeepSeek AI翻译
  const prompt = `请翻译以下文本并返回JSON格式：

文本：${text}

JSON格式：
{
  "detected_language": "中文|日语",
  "translation_direction": "中→日|日→中",
  "word_category": "地名|大学|交通|计算机|医学|法律|经济|机构|通用词汇",
  "translations": ["翻译结果"],
  "romanization": "假名读音（如果是日语）",
  "confidence": 0.95
}`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;
    
    // 解析JSON响应
    try {
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      const jsonStr = aiResponse.slice(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);
      
      return {
        ...parsed,
        source: 'deepseek'
      };
    } catch (parseError) {
      // JSON解析失败，返回基本结构
      const category = categorizeText(text);
      return {
        detected_language: sourceLang,
        translation_direction: sourceLang === '中文' ? '中→日' : '日→中',
        word_category: category,
        translations: [aiResponse.replace(/```json|```/g, '').trim()],
        romanization: text,
        confidence: 0.8,
        source: 'deepseek-raw'
      };
    }
  } catch (error) {
    console.error('DeepSeek API调用失败:', error);
    
    // 降级到简单翻译
    const category = categorizeText(text);
    return {
      detected_language: sourceLang,
      translation_direction: sourceLang === '中文' ? '中→日' : '日→中',
      word_category: category,
      translations: [`${text}(API错误)`],
      romanization: text,
      confidence: 0.3,
      source: 'error-fallback',
      error: error.message
    };
  }
}

// 统计数据更新
async function updateStats(env, type, language, category) {
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
    }
    
    if (category) {
      stats.category_stats[category] = (stats.category_stats[category] || 0) + 1;
    }
    
    await env.STATS.put(statsKey, JSON.stringify(stats));
  } catch (error) {
    console.error('统计更新失败:', error);
  }
}

// 处理翻译请求
async function handleTranslate(request, env) {
  const { text } = await request.json();
  
  if (!text || text.trim().length === 0) {
    return new Response(JSON.stringify({ 
      error: '请输入要翻译的文本' 
    }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const cleanText = text.trim();
  const textHash = simpleHash(cleanText);
  const cacheKey = `translation:${textHash}`;
  const sourceLang = detectLanguage(cleanText);
  const category = categorizeText(cleanText);

  // 检查缓存
  const cached = await env.CACHE.get(cacheKey, { type: 'json' });
  if (cached) {
    cached.hit_count++;
    cached.last_accessed = new Date().toISOString();
    await env.CACHE.put(cacheKey, JSON.stringify(cached));
    await updateStats(env, 'cache_hit', sourceLang, category);
    
    return new Response(JSON.stringify({
      ...cached.translation_result,
      from_cache: true,
      cache_hit_count: cached.hit_count,
      processing_time: '<100ms'
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // 新翻译
  const startTime = Date.now();
  const translationResult = await translateText(cleanText, sourceLang, env);
  const processingTime = `${Date.now() - startTime}ms`;
  
  // 保存缓存
  const cacheData = {
    text_hash: textHash,
    source_text: cleanText,
    source_lang: sourceLang,
    target_lang: sourceLang === '中文' ? '日语' : '中文',
    word_category: category,
    translation_result: translationResult,
    created_at: new Date().toISOString(),
    hit_count: 1,
    last_accessed: new Date().toISOString()
  };
  
  await env.CACHE.put(cacheKey, JSON.stringify(cacheData));
  await updateStats(env, 'new_translation', sourceLang, category);
  
  return new Response(JSON.stringify({
    ...translationResult,
    from_cache: false,
    cache_hit_count: 1,
    processing_time: processingTime
  }), { headers: { 'Content-Type': 'application/json' } });
}

// 处理统计请求
async function handleStats(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path.includes('/daily')) {
    const days = parseInt(url.searchParams.get('days')) || 7;
    const stats = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = await env.STATS.get(`stats:${dateStr}`, { type: 'json' });
      if (dayStats) {
        stats.push({
          ...dayStats,
          cache_rate: dayStats.total_requests > 0 ? 
            Math.round((dayStats.cache_hits / dayStats.total_requests) * 100) : 0
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: stats.reverse(),
      period: `${days}天`
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  // 默认概览统计
  const today = new Date().toISOString().split('T')[0];
  const todayStats = await env.STATS.get(`stats:${today}`, { type: 'json' });
  
  return new Response(JSON.stringify({
    success: true,
    data: {
      today_requests: todayStats?.total_requests || 0,
      today_cache_hits: todayStats?.cache_hits || 0,
      today_cache_rate: todayStats?.total_requests > 0 ? 
        Math.round((todayStats.cache_hits / todayStats.total_requests) * 100) : 0,
      category_distribution: todayStats?.category_stats || {},
      language_distribution: {
        chinese_to_japanese: todayStats?.chinese_to_japanese || 0,
        japanese_to_chinese: todayStats?.japanese_to_chinese || 0
      }
    }
  }), { headers: { 'Content-Type': 'application/json' } });
}

// 主入口
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // 路由处理
      if (path.includes('/api/translate')) {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }
        const response = await handleTranslate(request, env);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }
      
      if (path.includes('/api/stats')) {
        if (request.method !== 'GET') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }
        const response = await handleStats(request, env);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }
      
      // API信息路径
      if (path === '/api') {
        return new Response(JSON.stringify({
          name: "中日翻译API V2.1",
          version: env.VERSION || "2.1",
          ai_engine: env.DEEPSEEK_API_KEY ? "DeepSeek" : "简化引擎",
          endpoints: {
            translate: "POST /api/translate",
            stats: "GET /api/stats",
            daily_stats: "GET /api/stats/daily?days=7"
          },
          features: ["智能缓存", "统计分析", "词汇分类", "全球分布", "AI翻译"]
        }), { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        });
      }
      
      // 根路径返回网页界面
      if (path === '/') {
        return new Response(HTML_PAGE, { 
          headers: { 
            'Content-Type': 'text/html',
            ...corsHeaders 
          } 
        });
      }
      
      return new Response('Not Found', { status: 404, headers: corsHeaders });
      
    } catch (error) {
      console.error('请求处理错误:', error);
      return new Response(JSON.stringify({ 
        error: '服务暂时不可用',
        details: error.message 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }
  }
}; 