#!/usr/bin/env python3
"""
数据库模块 - V2.0 翻译历史存储
支持翻译缓存、历史查询、统计分析
"""
import sqlite3
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

class TranslationDatabase:
    def __init__(self, db_path: str = "translation_cache.db"):
        """初始化数据库连接"""
        self.db_path = Path(db_path)
        self.init_database()
    
    def init_database(self):
        """初始化数据库表结构"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS translation_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text_hash TEXT UNIQUE NOT NULL,
                    source_text TEXT NOT NULL,
                    source_lang TEXT NOT NULL,
                    target_lang TEXT NOT NULL,
                    word_category TEXT NOT NULL,
                    translation_result TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    hit_count INTEGER DEFAULT 1,
                    user_ip TEXT,
                    user_agent TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS translation_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    total_requests INTEGER DEFAULT 0,
                    cache_hits INTEGER DEFAULT 0,
                    new_translations INTEGER DEFAULT 0,
                    chinese_to_japanese INTEGER DEFAULT 0,
                    japanese_to_chinese INTEGER DEFAULT 0,
                    category_stats TEXT DEFAULT '{}',
                    UNIQUE(date)
                )
            """)
            
            # 创建索引优化查询
            conn.execute("CREATE INDEX IF NOT EXISTS idx_text_hash ON translation_cache(text_hash)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_source_lang ON translation_cache(source_lang)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_category ON translation_cache(word_category)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON translation_cache(created_at)")
    
    def _generate_text_hash(self, text: str) -> str:
        """生成文本哈希值用于缓存查找"""
        return hashlib.md5(text.strip().lower().encode('utf-8')).hexdigest()
    
    def get_cached_translation(self, text: str) -> Optional[Dict[str, Any]]:
        """获取缓存的翻译结果"""
        text_hash = self._generate_text_hash(text)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM translation_cache 
                WHERE text_hash = ? 
                ORDER BY updated_at DESC 
                LIMIT 1
            """, (text_hash,))
            
            row = cursor.fetchone()
            if row:
                # 更新命中次数和时间
                conn.execute("""
                    UPDATE translation_cache 
                    SET hit_count = hit_count + 1, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, (row['id'],))
                
                # 解析翻译结果
                translation_result = json.loads(row['translation_result'])
                return {
                    "from_cache": True,
                    "cache_hit_count": row['hit_count'] + 1,
                    **translation_result
                }
        return None
    
    def save_translation(self, text: str, result: Dict[str, Any], 
                        user_ip: str = None, user_agent: str = None) -> bool:
        """保存翻译结果到数据库"""
        try:
            text_hash = self._generate_text_hash(text)
            
            # 提取必要信息
            source_lang = result.get('detected_language', '未知')
            direction = result.get('translation_direction', '')
            target_lang = '日语' if '→日' in direction else '中文' if '→中' in direction else '未知'
            category = result.get('word_category', '通用词汇')
            
            with sqlite3.connect(self.db_path) as conn:
                # 尝试插入新记录，如果已存在则更新
                conn.execute("""
                    INSERT OR REPLACE INTO translation_cache 
                    (text_hash, source_text, source_lang, target_lang, word_category, 
                     translation_result, user_ip, user_agent, hit_count, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 
                           COALESCE((SELECT hit_count FROM translation_cache WHERE text_hash = ?), 1),
                           CURRENT_TIMESTAMP)
                """, (text_hash, text, source_lang, target_lang, category, 
                     json.dumps(result, ensure_ascii=False), user_ip, user_agent, text_hash))
                
                # 更新统计信息
                self._update_daily_stats(conn, source_lang, target_lang, category, is_cache_hit=False)
                
            return True
        except Exception as e:
            print(f"保存翻译结果失败: {e}")
            return False
    
    def _update_daily_stats(self, conn, source_lang: str, target_lang: str, 
                          category: str, is_cache_hit: bool = False):
        """更新每日统计信息"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 获取或创建今日统计
        cursor = conn.execute("SELECT * FROM translation_stats WHERE date = ?", (today,))
        row = cursor.fetchone()
        
        if row:
            # 更新现有统计
            stats_data = json.loads(row[3] if row[3] else '{}')  # category_stats
            stats_data[category] = stats_data.get(category, 0) + 1
            
            direction_field = ""
            if source_lang == "中文":
                direction_field = "chinese_to_japanese = chinese_to_japanese + 1"
            elif source_lang == "日语":
                direction_field = "japanese_to_chinese = japanese_to_chinese + 1"
            
            cache_update = "cache_hits = cache_hits + 1" if is_cache_hit else "new_translations = new_translations + 1"
            
            if direction_field:
                conn.execute(f"""
                    UPDATE translation_stats 
                    SET total_requests = total_requests + 1,
                        {cache_update},
                        {direction_field},
                        category_stats = ?
                    WHERE date = ?
                """, (json.dumps(stats_data, ensure_ascii=False), today))
            else:
                conn.execute(f"""
                    UPDATE translation_stats 
                    SET total_requests = total_requests + 1,
                        {cache_update},
                        category_stats = ?
                    WHERE date = ?
                """, (json.dumps(stats_data, ensure_ascii=False), today))
        else:
            # 创建新的统计记录
            stats_data = {category: 1}
            chinese_to_japanese = 1 if source_lang == "中文" else 0
            japanese_to_chinese = 1 if source_lang == "日语" else 0
            cache_hits = 1 if is_cache_hit else 0
            new_translations = 0 if is_cache_hit else 1
            
            conn.execute("""
                INSERT INTO translation_stats 
                (date, total_requests, cache_hits, new_translations, 
                 chinese_to_japanese, japanese_to_chinese, category_stats)
                VALUES (?, 1, ?, ?, ?, ?, ?)
            """, (today, cache_hits, new_translations, chinese_to_japanese, 
                 japanese_to_chinese, json.dumps(stats_data, ensure_ascii=False)))
    
    def get_translation_history(self, limit: int = 50, category: str = None) -> List[Dict[str, Any]]:
        """获取翻译历史"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            query = """
                SELECT source_text, source_lang, target_lang, word_category, 
                       translation_result, created_at, hit_count
                FROM translation_cache 
            """
            params = []
            
            if category:
                query += " WHERE word_category = ?"
                params.append(category)
            
            query += " ORDER BY updated_at DESC LIMIT ?"
            params.append(limit)
            
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            history = []
            for row in rows:
                translation_data = json.loads(row['translation_result'])
                history.append({
                    'source_text': row['source_text'],
                    'source_lang': row['source_lang'],
                    'target_lang': row['target_lang'],
                    'category': row['word_category'],
                    'translation': translation_data.get('translations', [{}])[0].get('target', ''),
                    'created_at': row['created_at'],
                    'hit_count': row['hit_count']
                })
            
            return history
    
    def get_daily_stats(self, days: int = 7) -> List[Dict[str, Any]]:
        """获取每日统计信息"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM translation_stats 
                ORDER BY date DESC 
                LIMIT ?
            """, (days,))
            
            stats = []
            for row in cursor.fetchall():
                category_stats = json.loads(row['category_stats']) if row['category_stats'] else {}
                stats.append({
                    'date': row['date'],
                    'total_requests': row['total_requests'],
                    'cache_hits': row['cache_hits'],
                    'new_translations': row['new_translations'],
                    'chinese_to_japanese': row['chinese_to_japanese'],
                    'japanese_to_chinese': row['japanese_to_chinese'],
                    'category_stats': category_stats,
                    'cache_hit_rate': round(row['cache_hits'] / max(row['total_requests'], 1) * 100, 2)
                })
            
            return stats
    
    def get_popular_translations(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取热门翻译"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT source_text, word_category, translation_result, hit_count
                FROM translation_cache 
                WHERE hit_count > 1
                ORDER BY hit_count DESC, updated_at DESC
                LIMIT ?
            """, (limit,))
            
            popular = []
            for row in cursor.fetchall():
                translation_data = json.loads(row['translation_result'])
                translation = translation_data.get('translations', [{}])[0]
                popular.append({
                    'source_text': row['source_text'],
                    'category': row['word_category'],
                    'target': translation.get('target', ''),
                    'reading': translation.get('reading', {}).get('hiragana', ''),
                    'hit_count': row['hit_count']
                })
            
            return popular

# 全局数据库实例
db = TranslationDatabase() 