// Cloudflare Pages Functions - API信息页面
// 路径: /api

export async function onRequestGet(context) {
  const { env } = context;
  
  const apiInfo = {
    name: "中日翻译API V2.0 - Pages版",
    version: env.VERSION || "2.0-pages",
    platform: "Cloudflare Pages",
    endpoints: {
      translate: "POST /api/translate",
      stats: "GET /api/stats",
      daily_stats: "GET /api/stats/daily?days=7"
    },
    features: ["智能缓存", "统计分析", "词汇分类", "全球分布"],
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