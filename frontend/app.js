// 中日翻译应用主要逻辑 - 使用现成的axios和DOM API
class TranslationApp {
    constructor() {
        this.apiUrl = '/api/translate';
        this.init();
    }

    init() {
        // 绑定事件监听器
        this.bindEvents();
        // 初始化字符计数
        this.updateCharCount();
    }

    bindEvents() {
        const inputText = document.getElementById('inputText');
        const translateBtn = document.getElementById('translateBtn');
        const clearBtn = document.getElementById('clearBtn');

        // 输入框字符计数
        inputText.addEventListener('input', () => this.updateCharCount());
        
        // 翻译按钮
        translateBtn.addEventListener('click', () => this.handleTranslate());
        
        // 清空按钮
        clearBtn.addEventListener('click', () => this.handleClear());
        
        // 回车键快捷翻译
        inputText.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleTranslate();
            }
        });
    }

    updateCharCount() {
        const inputText = document.getElementById('inputText');
        const charCount = document.getElementById('charCount');
        const count = inputText.value.length;
        
        charCount.textContent = count;
        
        // 字符数接近限制时显示警告颜色
        if (count > 450) {
            charCount.parentElement.classList.add('text-warning');
        } else {
            charCount.parentElement.classList.remove('text-warning');
        }
    }

    async handleTranslate() {
        const inputText = document.getElementById('inputText');
        const text = inputText.value.trim();
        
        if (!text) {
            this.showAlert('请输入要翻译的文本', 'warning');
            return;
        }

        if (text.length > 500) {
            this.showAlert('文本长度超过500字符限制', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const response = await this.callTranslateAPI(text);
            this.displayResult(response.data);
        } catch (error) {
            console.error('翻译失败:', error);
            this.showAlert('翻译失败，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async callTranslateAPI(text) {
        // 使用axios进行HTTP请求 - 现成的库
        const response = await axios.post(this.apiUrl, {
            text: text
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response;
    }

    displayResult(data) {
        const resultDiv = document.getElementById('resultDiv');
        
        // 检查数据结构
        if (data.detected_language && data.translation) {
            resultDiv.innerHTML = this.generateCloudflareResult(data);
        } 
        // 如果AI返回了结构化数据
        else if (data.translations && data.translations.length > 0) {
            resultDiv.innerHTML = this.generateStructuredResult(data);
        } 
        // 如果AI返回了原始文本
        else if (data.raw_response) {
            resultDiv.innerHTML = this.generateRawResult(data.raw_response);
        }
        
        resultDiv.style.display = 'block';
        // 平滑滚动到结果区域
        resultDiv.scrollIntoView({ behavior: 'smooth' });
    }

    generateCloudflareResult(data) {
        return `
            <div class="alert alert-success border-0 shadow-sm">
                <h5 class="alert-heading">
                    <i class="bi bi-check-circle"></i> 翻译结果
                    <span class="badge bg-secondary ms-2">${data.detected_language}</span>
                </h5>
                
                <!-- 主要翻译 -->
                <div class="row mb-3">
                    <div class="col-md-12">
                        <strong>翻译:</strong>
                        <div class="bg-primary text-white p-3 rounded fs-5">${data.translation}</div>
                    </div>
                </div>

                <!-- 输入法指导 -->
                ${data.input_methods && data.input_methods.length > 0 ? `
                    <div class="mb-3">
                        <strong><i class="bi bi-keyboard"></i> 输入法建议:</strong>
                        <div class="bg-info bg-opacity-10 p-2 rounded">
                            ${data.input_methods.map(method => `<span class="badge bg-info me-1">${method}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 例句 -->
                ${data.examples && data.examples.length > 0 ? `
                    <div class="mb-3">
                        <strong><i class="bi bi-chat-quote"></i> 例句:</strong>
                        <ul class="list-unstyled mt-2">
                            ${data.examples.map(example => `<li class="mb-1">• ${example}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <!-- 其他表达 -->
                ${data.alternatives && data.alternatives.length > 0 ? `
                    <div class="mb-3">
                        <strong><i class="bi bi-arrow-repeat"></i> 其他表达:</strong>
                        <div class="d-flex flex-wrap gap-2 mt-1">
                            ${data.alternatives.map(alt => 
                                `<span class="badge bg-outline-secondary">${alt}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 学习提示 -->
                ${data.tips ? `
                    <div class="mt-3 pt-3 border-top">
                        <small class="text-muted">
                            <i class="bi bi-lightbulb"></i> ${data.tips}
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateStructuredResult(data) {
        const translation = data.translations[0];
        
        return `
            <div class="alert alert-success border-0 shadow-sm">
                <h5 class="alert-heading">
                    <i class="bi bi-check-circle"></i> 翻译结果
                    <span class="badge bg-secondary ms-2">${data.detected_language}</span>
                </h5>
                
                <!-- 主要翻译 -->
                <div class="row mb-3">
                    <div class="col-md-6">
                        <strong>原文:</strong>
                        <div class="bg-light p-3 rounded">${translation.original}</div>
                    </div>
                    <div class="col-md-6">
                        <strong>翻译:</strong>
                        <div class="bg-primary text-white p-3 rounded">${translation.target}</div>
                    </div>
                </div>

                <!-- 读音信息 -->
                ${this.generateReadingInfo(translation.reading)}

                <!-- 释义和用法 -->
                <div class="mb-3">
                    <strong><i class="bi bi-book"></i> 释义:</strong>
                    <p class="mb-1">${translation.meaning}</p>
                    <small class="text-muted">${translation.usage}</small>
                </div>

                <!-- 输入法指导 -->
                ${translation.input_method ? `
                    <div class="mb-3">
                        <strong><i class="bi bi-keyboard"></i> 输入法:</strong>
                        <div class="bg-info bg-opacity-10 p-2 rounded">
                            ${translation.input_method}
                        </div>
                    </div>
                ` : ''}

                <!-- 例句 -->
                ${this.generateExamples(translation.examples)}

                <!-- 其他表达 -->
                ${translation.alternatives && translation.alternatives.length > 0 ? `
                    <div class="mb-3">
                        <strong><i class="bi bi-arrow-repeat"></i> 其他表达:</strong>
                        <div class="d-flex flex-wrap gap-2 mt-1">
                            ${translation.alternatives.map(alt => 
                                `<span class="badge bg-outline-secondary">${alt}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- 学习提示 -->
                ${data.tips ? `
                    <div class="mt-3 pt-3 border-top">
                        <small class="text-muted">
                            <i class="bi bi-lightbulb"></i> ${data.tips}
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateReadingInfo(reading) {
        if (!reading) return '';
        
        let readingHtml = '<div class="mb-3"><strong><i class="bi bi-volume-up"></i> 读音:</strong><br>';
        
        if (reading.hiragana) {
            readingHtml += `<span class="badge bg-light text-dark me-2">假名: ${reading.hiragana}</span>`;
        }
        if (reading.romaji) {
            readingHtml += `<span class="badge bg-light text-dark me-2">罗马字: ${reading.romaji}</span>`;
        }
        if (reading.pinyin) {
            readingHtml += `<span class="badge bg-light text-dark me-2">拼音: ${reading.pinyin}</span>`;
        }
        
        readingHtml += '</div>';
        return readingHtml;
    }

    generateExamples(examples) {
        if (!examples || examples.length === 0) return '';
        
        let examplesHtml = '<div class="mb-3"><strong><i class="bi bi-chat-quote"></i> 例句:</strong>';
        
        examples.forEach((example, index) => {
            examplesHtml += `
                <div class="border-start border-primary border-3 ps-3 ms-2 mt-2">
                    <div>${example.sentence}</div>
                    <small class="text-muted">${example.translation}</small>
                    ${example.context ? `<br><small class="text-info">场景: ${example.context}</small>` : ''}
                </div>
            `;
        });
        
        examplesHtml += '</div>';
        return examplesHtml;
    }

    generateRawResult(rawResponse) {
        return `
            <div class="alert alert-info">
                <h5 class="alert-heading"><i class="bi bi-info-circle"></i> 翻译结果</h5>
                <div class="bg-light p-3 rounded">
                    <pre class="mb-0">${rawResponse}</pre>
                </div>
            </div>
        `;
    }

    handleClear() {
        document.getElementById('inputText').value = '';
        document.getElementById('resultDiv').style.display = 'none';
        this.updateCharCount();
        document.getElementById('inputText').focus();
    }

    showLoading(show) {
        const loadingDiv = document.getElementById('loadingDiv');
        const translateBtn = document.getElementById('translateBtn');
        
        if (show) {
            loadingDiv.style.display = 'block';
            translateBtn.disabled = true;
            translateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> 翻译中...';
        } else {
            loadingDiv.style.display = 'none';
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="bi bi-arrow-left-right"></i> 开始翻译';
        }
    }

    showAlert(message, type = 'info') {
        // 使用SweetAlert2现成的通知库
        const icon = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
        
        Swal.fire({
            icon: icon,
            title: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TranslationApp();
}); 