#!/usr/bin/env python3
"""
简单的本地测试服务器 - V2.0极简版
同时提供静态文件和API服务
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
import sys
import os
import pathlib
import uvicorn

# 添加backend目录到Python路径
backend_dir = pathlib.Path(__file__).parent / "backend"
sys.path.append(str(backend_dir))

# 导入翻译功能
from api import translate_text

app = FastAPI(title="中日翻译V2.0", description="极简智能翻译和标签系统")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 获取项目根目录
root_dir = pathlib.Path(__file__).parent.absolute()

class TranslationRequest(BaseModel):
    text: str

@app.get("/")
async def serve_index():
    """提供主页"""
    return FileResponse(root_dir / "index.html")

@app.post("/api/translate")
async def translate_endpoint(request: TranslationRequest):
    """V2.0极简翻译API"""
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="请输入要翻译的文本")
        
        if len(request.text) > 500:
            raise HTTPException(status_code=400, detail="文本长度不能超过500字符")
        
        result = await translate_text(request.text)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 检查是否有success结构，如果有则提取data部分
        if "success" in result and "data" in result:
            return result["data"]  # 返回data部分给前端
        else:
            return result  # 直接返回结果
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"翻译错误: {e}")
        raise HTTPException(status_code=500, detail=f"翻译失败: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy", 
        "version": "V2.0 极简版",
        "features": ["AI智能检测", "彩色分类标签", "极简架构"]
    }

if __name__ == "__main__":
    print("🎉 启动中日翻译V2.0极简版...")
    print(f"📁 项目目录: {root_dir}")
    print("🌐 访问地址: http://localhost:8080")
    print("📡 API地址: http://localhost:8080/api/translate")
    print("❤️  健康检查: http://localhost:8080/health")
    print("🚀 V2.0特性: AI智能检测 + 彩色标签 + 极简架构")
    
    uvicorn.run(app, host="0.0.0.0", port=8080) 