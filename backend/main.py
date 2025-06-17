from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from .api import translate_text

app = FastAPI(title="中日翻译API", version="1.0.0")

# CORS中间件 - 使用现成的配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务 - 直接使用FastAPI内置功能
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

class TranslationRequest(BaseModel):
    text: str
    
class TranslationResponse(BaseModel):
    success: bool
    data: dict = None
    error: str = None

@app.get("/")
async def root():
    return {"message": "中日翻译API已启动"}

@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    """翻译接口"""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="输入文本不能为空")
    
    result = await translate_text(request.text.strip())
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return TranslationResponse(**result)

@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 