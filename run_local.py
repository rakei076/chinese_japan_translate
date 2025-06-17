#!/usr/bin/env python3
"""
本地运行脚本 - 用于开发测试
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    """启动本地开发服务器"""
    # 切换到后端目录
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    
    # 检查虚拟环境
    if not (Path.cwd() / "venv").exists():
        print("创建虚拟环境...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # 激活虚拟环境并安装依赖
    if os.name == 'nt':  # Windows
        pip_cmd = "venv\\Scripts\\pip"
        python_cmd = "venv\\Scripts\\python"
    else:  # Unix/Linux/macOS
        pip_cmd = "venv/bin/pip"
        python_cmd = "venv/bin/python"
    
    print("安装依赖...")
    subprocess.run([pip_cmd, "install", "-r", "requirements.txt"])
    
    # 启动FastAPI服务器
    print("启动开发服务器...")
    print(f"访问地址: http://localhost:8000")
    print(f"静态文件: http://localhost:8000/static/index.html")
    
    subprocess.run([python_cmd, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])

if __name__ == "__main__":
    main() 