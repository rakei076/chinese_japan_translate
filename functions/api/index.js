// Cloudflare Pages Functions - API信息页面
// 路径: /api

export async function onRequestGet(context) {
  const { env } = context;
  
  const apiInfo = {
    name: "中日翻译API V2.0 - Pages版",
    version: env.VERSION || "2.0-pages",
    platform: "Cloudflare Pages",
    description: "基于 DeepSeek AI 的智能中日双向翻译平台",
    
    // 核心功能介绍
    capabilities: {
      "我可以做什么": {
        "双向翻译": "支持中文到日语、日语到中文的智能翻译",
        "智能识别": "自动检测输入语言和内容类型（词语/文章）",
        "专业分类": "智能识别并分类词汇（地名、大学、计算机、医学、法律等9大类别）",
        "读音标注": "为日语翻译自动生成平假名读音",
        "缓存加速": "智能缓存热门翻译，响应速度 < 100ms",
        "全球服务": "基于 Cloudflare 边缘计算，300+ 全球节点"
      },
      
      "支持的翻译类型": {
        "词语翻译": "单词、短语的精确翻译，包含详细释义和例句",
        "句子翻译": "完整句子的自然流畅翻译",
        "文章翻译": "长篇文本、段落的专业翻译，保持格式和语气",
        "专业术语": "计算机、医学、法律、经济等专业领域术语翻译"
      },
      
      "智能特性": {
        "语言检测": "自动识别中文或日语输入",
        "场景适配": "根据内容长度和类型选择最佳翻译策略", 
        "词汇分类": "自动分类为地名、大学、交通、计算机、医学、法律、经济、机构、通用词汇",
        "性能优化": "智能缓存系统，相同内容翻译速度极快"
      },
      
      "技术优势": {
        "AI驱动": "基于 DeepSeek 大语言模型，翻译质量优异",
        "边缘计算": "Cloudflare 全球 CDN，就近响应",
        "无字数限制": "支持最大 10,000 字符的长文本翻译",
        "高可用性": "99.99% 服务可用性，稳定可靠"
      }
    },
    
    endpoints: {
      translate: "POST /api/translate",
      stats: "GET /api/stats",
      daily_stats: "GET /api/stats/daily?days=7"
    },
    
    usage_examples: {
      "词语翻译": {
        "request": "POST /api/translate",
        "body": { "text": "东京大学" },
        "response": "返回翻译结果、读音、分类等详细信息"
      },
      "文章翻译": {
        "request": "POST /api/translate", 
        "body": { "text": "多段落长文本内容..." },
        "response": "返回完整文章翻译，保持原有格式"
      }
    },
    
    features: ["智能缓存", "统计分析", "词汇分类", "全球分布", "双向翻译", "读音标注"],
    documentation: "https://github.com/rakei076/chinese_japan_translate"
  };
  
  return new Response(JSON.stringify(apiInfo, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
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