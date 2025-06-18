from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from api import translate_text
import os
import pathlib

app = FastAPI(title="中日翻译API", description="基于DeepSeek的中日双向翻译服务")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 获取正确的前端文件路径
backend_dir = pathlib.Path(__file__).parent.absolute()
frontend_dir = backend_dir.parent / "frontend"

# 挂载静态文件服务
app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

class TranslationRequest(BaseModel):
    text: str

class TranslationResponse(BaseModel):
    detected_language: str
    translations: list

@app.get("/")
async def serve_frontend():
    """提供前端页面"""
    return FileResponse(frontend_dir / 'index.html')

@app.get("/style.css")
async def serve_css():
    """提供CSS文件"""
    return FileResponse(frontend_dir / 'style.css')

@app.get("/script.js")
async def serve_js():
    """提供JavaScript文件"""
    return FileResponse(frontend_dir / 'script.js')

@app.post("/translate", response_model=dict)
async def translate_endpoint(request: TranslationRequest):
    """翻译接口"""
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="输入文本不能为空")
        
        if len(request.text) > 500:
            raise HTTPException(status_code=400, detail="输入文本超过500字符限制")
        
        result = await translate_text(request.text)
        return result
        
    except Exception as e:
        print(f"翻译错误: {e}")
        raise HTTPException(status_code=500, detail=f"翻译失败: {str(e)}")

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "message": "翻译服务运行正常"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 启动中日翻译服务...")
    print(f"📁 前端目录: {frontend_dir}")
    print("📱 前端页面: http://localhost:8000")
    print("📡 API文档: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000) 