// Cloudflare Pages Functions - 统计API
// 路径: /api/stats

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
    }), { 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      } 
    });
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
  }), { 
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    } 
  });
}

// Pages Functions GET 处理函数
export async function onRequestGet(context) {
  const { request, env } = context;
  
  try {
    return await handleStats(request, env);
  } catch (error) {
    console.error('统计查询错误:', error);
    return new Response(JSON.stringify({ 
      error: '统计服务暂时不可用',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
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