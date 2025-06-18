// 中日翻译应用 JavaScript

// 检查字符数
function checkCharCount() {
    const input = document.getElementById('inputText');
    const charCount = document.getElementById('charCount');
    const currentLength = input.value.length;
    
    charCount.textContent = `${currentLength}`;
    
    if (currentLength > 400) {
        charCount.className = 'text-warning';
    } else if (currentLength > 450) {
        charCount.className = 'text-danger';
    } else {
        charCount.className = 'text-muted';
    }
}

// 清空输入
function clearInput() {
    document.getElementById('inputText').value = '';
    document.getElementById('resultDiv').style.display = 'none';
    checkCharCount();
}

// 翻译函数
async function translateText() {
    const inputText = document.getElementById('inputText').value.trim();
    
    if (!inputText) {
        alert('请输入要翻译的文本');
        return;
    }
    
    if (inputText.length > 500) {
        alert('输入文本超过500字符限制');
        return;
    }
    
    // 显示加载状态
    const loadingDiv = document.getElementById('loadingDiv');
    const resultDiv = document.getElementById('resultDiv');
    
    loadingDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    
    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: inputText
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('收到翻译数据:', data); // 调试信息
        
        // 隐藏加载状态
        loadingDiv.style.display = 'none';
        
        // 显示美化的翻译结果
        displayTranslationResult(data);
        
    } catch (error) {
        console.error('翻译错误:', error);
        loadingDiv.style.display = 'none';
        
        // 显示错误信息
        resultDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>翻译失败</strong><br>
                ${error.message}
            </div>
        `;
        resultDiv.style.display = 'block';
    }
}

// 美化显示翻译结果
function displayTranslationResult(data) {
    const resultDiv = document.getElementById('resultDiv');
    console.log('开始显示翻译结果:', data); // 调试信息
    
    try {
        // 检查数据结构
        if (!data) {
            throw new Error('没有接收到翻译数据');
        }
        
        let translationData;
        
        // 处理后端返回的数据结构
        if (data.success && data.data && data.data.raw_response) {
            // 从raw_response中提取JSON数据
            let rawResponse = data.data.raw_response;
            
            // 移除markdown的json代码块标记
            rawResponse = rawResponse.replace(/```json\n?/g, '').replace(/\n?```/g, '');
            
            // 解析JSON
            translationData = JSON.parse(rawResponse);
        } else if (data.detected_language || data.translations) {
            // 直接使用数据
            translationData = data;
        } else {
            // 如果数据结构不符合预期，显示原始JSON用于调试
            resultDiv.innerHTML = `
                <div class="alert alert-info" role="alert">
                    <h4 class="alert-heading">翻译结果 (调试模式)</h4>
                    <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 12px;">${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
            resultDiv.style.display = 'block';
            return;
        }
        
        console.log('解析后的翻译数据:', translationData);
        
        // 构建美化的HTML
        let html = '<div class="alert alert-success" role="alert">';
        html += '<h4 class="alert-heading"><i class="bi bi-translate me-2"></i>翻译结果</h4>';
        
        // 检测到的语言
        if (translationData.detected_language) {
            const langDisplay = translationData.detected_language === '中文' ? '中文 → 日语' : '日语 → 中文';
            html += `<div class="mb-3">
                <span class="badge bg-primary fs-6">
                    <i class="bi bi-globe me-1"></i>${langDisplay}
                </span>
            </div>`;
        }
        
        // 主要翻译结果
        if (translationData.translations && translationData.translations.length > 0) {
            const translation = translationData.translations[0];
            
            // 原文
            html += `<div class="row mb-4">
                <div class="col-12">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-muted">
                                <i class="bi bi-file-text me-1"></i>原文
                            </h6>
                            <h5 class="card-title mb-0">${translation.original}</h5>
                        </div>
                    </div>
                </div>
            </div>`;
            
            // 翻译结果
            html += `<div class="row mb-4">
                <div class="col-12">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <h6 class="card-subtitle mb-2 text-white-50">
                                <i class="bi bi-arrow-right-circle me-1"></i>翻译
                            </h6>
                            <h4 class="card-title mb-0">${translation.target}</h4>
                        </div>
                    </div>
                </div>
            </div>`;
            
            // 读音信息
            if (translation.reading) {
                html += `<div class="row mb-4">
                    <div class="col-12">
                        <h6 class="mb-3"><i class="bi bi-volume-up me-1"></i>读音</h6>
                        <div class="d-flex flex-wrap gap-2">`;
                
                if (translation.reading.hiragana) {
                    html += `<span class="badge bg-light text-dark">${translation.reading.hiragana}</span>`;
                }
                if (translation.reading.romaji) {
                    html += `<span class="badge bg-secondary">${translation.reading.romaji}</span>`;
                }
                
                html += `</div>
                    </div>
                </div>`;
            }
            
            // 词汇含义
            if (translation.meaning) {
                html += `<div class="row mb-4">
                    <div class="col-12">
                        <h6 class="mb-2"><i class="bi bi-book me-1"></i>含义解释</h6>
                        <p class="text-muted mb-0">${translation.meaning}</p>
                    </div>
                </div>`;
            }
            
            // 使用场景
            if (translation.usage) {
                html += `<div class="row mb-4">
                    <div class="col-12">
                        <h6 class="mb-2"><i class="bi bi-lightbulb me-1"></i>使用场景</h6>
                        <p class="text-muted mb-0">${translation.usage}</p>
                    </div>
                </div>`;
            }
            
            // 输入法指导
            if (translation.input_method) {
                html += `<div class="row mb-4">
                    <div class="col-12">
                        <div class="alert alert-info mb-0">
                            <h6 class="mb-2"><i class="bi bi-keyboard me-1"></i>输入法指导</h6>
                            <p class="mb-0">${translation.input_method}</p>
                        </div>
                    </div>
                </div>`;
            }
            
            // 例句
            if (translation.examples && translation.examples.length > 0) {
                html += `<div class="row mb-4">
                    <div class="col-12">
                        <h6 class="mb-3"><i class="bi bi-chat-quote me-1"></i>例句</h6>`;
                
                translation.examples.forEach((example, index) => {
                    html += `<div class="card mb-3 border-start border-primary">
                        <div class="card-body py-3">
                            <div class="mb-2">
                                <strong>${example.sentence}</strong>
                            </div>
                            <div class="text-muted mb-1">
                                ${example.translation}
                            </div>`;
                    
                    if (example.context) {
                        html += `<small class="text-success">
                            <i class="bi bi-info-circle me-1"></i>${example.context}
                        </small>`;
                    }
                    
                    html += `</div></div>`;
                });
                
                html += `</div></div>`;
            }
            
            // 其他翻译选项
            if (translation.alternatives && translation.alternatives.length > 0) {
                html += `<div class="row mb-4">
                    <div class="col-12">
                        <h6 class="mb-3"><i class="bi bi-arrow-left-right me-1"></i>其他翻译</h6>
                        <div class="d-flex flex-wrap gap-2">`;
                
                translation.alternatives.forEach(alt => {
                    html += `<span class="badge bg-outline-secondary border">${alt}</span>`;
                });
                
                html += `</div>
                    </div>
                </div>`;
            }
            
            // 级别提示
            if (translation.level) {
                html += `<div class="row mb-3">
                    <div class="col-12">
                        <small class="text-muted">
                            <i class="bi bi-star me-1"></i>难度级别：${translation.level}
                        </small>
                    </div>
                </div>`;
            }
            
            // 学习提示
            if (translation.tips) {
                html += `<div class="row">
                    <div class="col-12">
                        <div class="alert alert-light mb-0">
                            <small>
                                <i class="bi bi-lightbulb-fill me-1"></i>
                                <strong>学习提示：</strong>${translation.tips}
                            </small>
                        </div>
                    </div>
                </div>`;
            }
        }
        
        html += '</div>';
        
        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';
        
        // 平滑滚动到结果
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('解析翻译结果错误:', error);
        resultDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>解析错误</strong><br>
                无法解析翻译结果，请重试。<br>
                错误详情: ${error.message}<br>
                <details style="margin-top: 10px;">
                    <summary>原始数据</summary>
                    <pre style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 11px; margin-top: 5px;">${JSON.stringify(data, null, 2)}</pre>
                </details>
            </div>
        `;
        resultDiv.style.display = 'block';
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定输入框事件
    const inputText = document.getElementById('inputText');
    inputText.addEventListener('input', checkCharCount);
    
    // 回车键翻译
    inputText.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translateText();
        }
    });
    
    // 初始化字符计数
    checkCharCount();
}); 