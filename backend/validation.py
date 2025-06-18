#!/usr/bin/env python3
"""
请求验证模块 - V2.0 安全和限制控制
包含速率限制、内容过滤、垃圾请求检测
"""
import re
import time
import hashlib
from typing import Dict, Any, Optional, Tuple
from collections import defaultdict, deque
from datetime import datetime, timedelta

class RequestValidator:
    def __init__(self):
        """初始化验证器"""
        # 速率限制: IP -> (请求次数, 时间窗口)
        self.rate_limits = defaultdict(lambda: deque())
        
        # 恶意IP黑名单
        self.blacklisted_ips = set()
        
        # 可疑请求记录
        self.suspicious_requests = defaultdict(int)
        
        # 配置
        self.MAX_REQUESTS_PER_MINUTE = 20  # 每分钟最多20个请求
        self.MAX_REQUESTS_PER_HOUR = 200   # 每小时最多200个请求
        self.MAX_TEXT_LENGTH = 500         # 最大文本长度
        self.MIN_TEXT_LENGTH = 1           # 最小文本长度
        
        # 恶意内容模式
        self.malicious_patterns = [
            r'<script.*?>.*?</script>',  # XSS脚本
            r'javascript:',              # JavaScript注入
            r'data:text/html',          # Data URI攻击
            r'vbscript:',               # VBScript注入
            r'\bUNION\b.*?\bSELECT\b',  # SQL注入
            r'\bDROP\b.*?\bTABLE\b',    # SQL删除
            r'\bINSERT\b.*?\bINTO\b',   # SQL插入
            r'\.\./',                   # 路径遍历
            r'\\x[0-9a-fA-F]{2}',       # 十六进制编码
        ]
        
        # 垃圾内容模式
        self.spam_patterns = [
            r'(.)\1{10,}',              # 重复字符
            r'[!@#$%^&*]{5,}',          # 大量特殊符号
            r'http[s]?://[^\s]+',       # URL链接
            r'\b\d{10,}\b',             # 长数字串
        ]
        
        # 编译正则表达式
        self.compiled_malicious = [re.compile(pattern, re.IGNORECASE) for pattern in self.malicious_patterns]
        self.compiled_spam = [re.compile(pattern, re.IGNORECASE) for pattern in self.spam_patterns]
    
    def validate_request(self, text: str, client_ip: str, user_agent: str = None) -> Tuple[bool, str]:
        """
        验证请求的合法性
        返回: (是否通过, 错误信息)
        """
        try:
            # 1. 检查IP黑名单
            if client_ip in self.blacklisted_ips:
                return False, "IP地址已被封禁"
            
            # 2. 速率限制检查
            rate_check, rate_msg = self._check_rate_limit(client_ip)
            if not rate_check:
                return False, rate_msg
            
            # 3. 文本长度验证
            if len(text) < self.MIN_TEXT_LENGTH:
                return False, "输入文本太短"
            
            if len(text) > self.MAX_TEXT_LENGTH:
                return False, f"输入文本超过{self.MAX_TEXT_LENGTH}字符限制"
            
            # 4. 恶意内容检测
            malicious_check, malicious_msg = self._check_malicious_content(text)
            if not malicious_check:
                self._record_suspicious_activity(client_ip, "恶意内容")
                return False, malicious_msg
            
            # 5. 垃圾内容检测
            spam_check, spam_msg = self._check_spam_content(text)
            if not spam_check:
                self._record_suspicious_activity(client_ip, "垃圾内容")
                return False, spam_msg
            
            # 6. 中日文内容验证
            content_check, content_msg = self._check_content_language(text)
            if not content_check:
                return False, content_msg
            
            # 7. User Agent验证（可选）
            if user_agent:
                ua_check, ua_msg = self._check_user_agent(user_agent)
                if not ua_check:
                    self._record_suspicious_activity(client_ip, "可疑User Agent")
                    # 不直接拒绝，只记录
            
            return True, "验证通过"
            
        except Exception as e:
            print(f"请求验证错误: {e}")
            return False, "验证过程出错"
    
    def _check_rate_limit(self, client_ip: str) -> Tuple[bool, str]:
        """检查速率限制"""
        current_time = time.time()
        
        # 清理过期请求记录
        rate_queue = self.rate_limits[client_ip]
        
        # 移除1小时前的记录
        while rate_queue and current_time - rate_queue[0] > 3600:
            rate_queue.popleft()
        
        # 检查小时限制
        if len(rate_queue) >= self.MAX_REQUESTS_PER_HOUR:
            return False, f"超过小时请求限制({self.MAX_REQUESTS_PER_HOUR}次/小时)"
        
        # 检查分钟限制
        minute_requests = sum(1 for req_time in rate_queue if current_time - req_time < 60)
        if minute_requests >= self.MAX_REQUESTS_PER_MINUTE:
            return False, f"请求过于频繁，请等待({self.MAX_REQUESTS_PER_MINUTE}次/分钟)"
        
        # 记录当前请求
        rate_queue.append(current_time)
        
        return True, ""
    
    def _check_malicious_content(self, text: str) -> Tuple[bool, str]:
        """检测恶意内容"""
        for pattern in self.compiled_malicious:
            if pattern.search(text):
                return False, "检测到恶意内容，请求被拒绝"
        return True, ""
    
    def _check_spam_content(self, text: str) -> Tuple[bool, str]:
        """检测垃圾内容"""
        # 检查重复字符
        for pattern in self.compiled_spam:
            if pattern.search(text):
                return False, "检测到垃圾内容，请输入有意义的文本"
        
        # 检查文本质量
        if len(set(text.strip())) < 2:  # 字符种类太少
            return False, "输入内容过于单一，请输入有意义的文本"
        
        return True, ""
    
    def _check_content_language(self, text: str) -> Tuple[bool, str]:
        """检查内容是否包含中日文"""
        # 中文字符范围
        chinese_pattern = r'[\u4e00-\u9fff]'
        # 日文字符范围（平假名、片假名、汉字）
        japanese_pattern = r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]'
        
        has_chinese = bool(re.search(chinese_pattern, text))
        has_japanese = bool(re.search(japanese_pattern, text))
        
        # 至少包含中文或日文
        if not (has_chinese or has_japanese):
            return False, "请输入中文或日文内容"
        
        return True, ""
    
    def _check_user_agent(self, user_agent: str) -> Tuple[bool, str]:
        """检查User Agent"""
        if not user_agent or len(user_agent) < 10:
            return False, "User Agent异常"
        
        # 检查是否为已知的恶意User Agent
        malicious_ua_patterns = [
            r'bot',
            r'crawler',
            r'spider',
            r'scraper',
            r'python-requests',
            r'curl/',
            r'wget',
        ]
        
        for pattern in malicious_ua_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                return False, f"检测到自动化工具: {pattern}"
        
        return True, ""
    
    def _record_suspicious_activity(self, client_ip: str, activity_type: str):
        """记录可疑活动"""
        self.suspicious_requests[client_ip] += 1
        
        # 如果可疑活动次数过多，加入黑名单
        if self.suspicious_requests[client_ip] >= 5:
            self.blacklisted_ips.add(client_ip)
            print(f"IP {client_ip} 已被加入黑名单，原因: {activity_type}")
    
    def get_client_status(self, client_ip: str) -> Dict[str, Any]:
        """获取客户端状态信息"""
        current_time = time.time()
        rate_queue = self.rate_limits[client_ip]
        
        # 计算最近的请求次数
        minute_requests = sum(1 for req_time in rate_queue if current_time - req_time < 60)
        hour_requests = len(rate_queue)
        
        return {
            "ip": client_ip,
            "is_blacklisted": client_ip in self.blacklisted_ips,
            "suspicious_count": self.suspicious_requests[client_ip],
            "requests_last_minute": minute_requests,
            "requests_last_hour": hour_requests,
            "minute_limit": self.MAX_REQUESTS_PER_MINUTE,
            "hour_limit": self.MAX_REQUESTS_PER_HOUR,
            "minute_remaining": max(0, self.MAX_REQUESTS_PER_MINUTE - minute_requests),
            "hour_remaining": max(0, self.MAX_REQUESTS_PER_HOUR - hour_requests)
        }
    
    def unblock_ip(self, client_ip: str) -> bool:
        """解除IP封禁"""
        if client_ip in self.blacklisted_ips:
            self.blacklisted_ips.remove(client_ip)
            self.suspicious_requests[client_ip] = 0
            return True
        return False
    
    def get_system_stats(self) -> Dict[str, Any]:
        """获取系统统计信息"""
        total_ips = len(self.rate_limits)
        blocked_ips = len(self.blacklisted_ips)
        suspicious_ips = len([ip for ip, count in self.suspicious_requests.items() if count > 0])
        
        return {
            "total_ips": total_ips,
            "blocked_ips": blocked_ips,
            "suspicious_ips": suspicious_ips,
            "rate_limit_rules": {
                "requests_per_minute": self.MAX_REQUESTS_PER_MINUTE,
                "requests_per_hour": self.MAX_REQUESTS_PER_HOUR,
                "max_text_length": self.MAX_TEXT_LENGTH
            }
        }

# 全局验证器实例
validator = RequestValidator() 