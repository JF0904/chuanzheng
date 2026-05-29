// ai-chatbot.js - AI小助手（阿里云百炼版）
(function() {
    // ========== 阿里云百炼配置 ==========
    // 请替换为您的阿里云百炼 API Key（以 sk- 开头）
    const API_KEY = 'sk-b30d3ab8f9be4ecb89e84eeea4200594';  // ← 在这里填入您的 API Key
    
    // 百炼的 OpenAI 兼容接口地址
    const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    
    // 模型名称（使用 DeepSeek 模型）
    const MODEL_NAME = 'deepseek-v3';
    
    // ========== 系统提示词 ==========
    const SYSTEM_PROMPT = `你是一位专业的福建船政文化讲解员，名叫“船政小助手”。你的任务是回答关于福建船政文化的问题。

关于福建船政的背景知识：
- 福建船政由左宗棠于1866年创立，位于福州马尾
- 首任总理船政大臣是沈葆桢（林则徐女婿）
- 船政创办了近代中国第一所海军学校——船政学堂
- 培养出严复、邓世昌、刘步蟾、詹天佑等杰出人才
- 制造了中国第一艘千吨级蒸汽兵船“万年清”
- 在中国近代海军建设、工业发展、教育革新方面具有重要地位

回答要求：
1. 如果用户问的是船政文化相关的问题，用热情、专业的语气回答
2. 如果用户问无关问题，礼貌地引导回船政主题
3. 回答要简明扼要，控制在150字以内
4. 可以适当使用表情符号增加亲和力`;

    // 聊天记录
    let messages = [
        { role: "system", content: SYSTEM_PROMPT }
    ];
    
    // DOM 元素引用
    let button, windowEl, messagesContainer, input, sendBtn;
    
    // 创建AI助手DOM结构
    function createChatbot() {
        const chatbotHTML = `
            <div class="ai-chatbot-container">
                <div class="ai-chatbot-button" id="chatbot-toggle">
                    <span>💬</span>
                </div>
                <div class="ai-chatbot-window hidden" id="chatbot-window">
                    <div class="ai-chatbot-header" id="chatbot-header">
                        <h3>
                            <span>🤖</span>
                            船政文化小助手
                        </h3>
                        <button class="close-btn" id="chatbot-close">✕</button>
                    </div>
                    <div class="ai-chatbot-messages" id="chatbot-messages">
                        <div class="message bot">
                            <div class="message-avatar">🤖</div>
                            <div class="message-content">
                                你好！我是船政文化小助手 🚢<br>
                                关于福建船政的历史、人物、舰船，都可以问我哦～<br>
                                有什么想了解的吗？
                            </div>
                        </div>
                    </div>
                    <div class="ai-chatbot-input">
                        <input type="text" id="chatbot-input" placeholder="输入你的问题..." autocomplete="off">
                        <button id="chatbot-send">发送</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
        
        button = document.getElementById('chatbot-toggle');
        windowEl = document.getElementById('chatbot-window');
        messagesContainer = document.getElementById('chatbot-messages');
        input = document.getElementById('chatbot-input');
        sendBtn = document.getElementById('chatbot-send');
        const closeBtn = document.getElementById('chatbot-close');
        const header = document.getElementById('chatbot-header');
        
        // 绑定事件
        button.addEventListener('click', toggleWindow);
        closeBtn.addEventListener('click', closeWindow);
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // 拖拽功能
        let isDragging = false;
        let offsetX, offsetY;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - windowEl.offsetLeft;
            offsetY = e.clientY - windowEl.offsetTop;
            windowEl.style.position = 'fixed';
            windowEl.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            left = Math.max(10, Math.min(left, window.innerWidth - windowEl.offsetWidth - 10));
            top = Math.max(10, Math.min(top, window.innerHeight - windowEl.offsetHeight - 10));
            windowEl.style.left = left + 'px';
            windowEl.style.top = top + 'px';
            windowEl.style.right = 'auto';
            windowEl.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            if (windowEl) windowEl.style.cursor = '';
        });
    }
    
    function toggleWindow() {
        windowEl.classList.toggle('hidden');
        if (!windowEl.classList.contains('hidden')) {
            input.focus();
        }
    }
    
    function closeWindow() {
        windowEl.classList.add('hidden');
    }
    
    // 添加消息到界面
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        messageDiv.innerHTML = `
            <div class="message-avatar">${isUser ? '👤' : '🤖'}</div>
            <div class="message-content">${text.replace(/\n/g, '<br>')}</div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv;
    }
    
    // 显示打字中状态
    function showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }
    
    // 调用阿里云百炼 API
    async function callBailianAPI(userMessage) {
        // 构建消息列表（不包含 system，因为会在请求中处理）
        const apiMessages = messages.filter(m => m.role !== 'system').concat([
            { role: "user", content: userMessage }
        ]);
        
        // 重新构建完整消息（包含 system）
        const fullMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...apiMessages
        ];
        
        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: fullMessages,
                    stream: false,
                    max_tokens: 500,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API错误详情:', errorText);
                
                if (response.status === 401) {
                    throw new Error('API Key 无效，请检查是否正确配置');
                } else if (response.status === 429) {
                    throw new Error('请求过于频繁，请稍后再试');
                } else if (response.status === 402) {
                    throw new Error('账户余额不足，请前往阿里云百炼控制台充值');
                } else {
                    throw new Error(`API错误: ${response.status}`);
                }
            }
            
            const data = await response.json();
            const reply = data.choices[0].message.content;
            
            // 更新聊天记录
            messages.push({ role: "user", content: userMessage });
            messages.push({ role: "assistant", content: reply });
            
            // 保持记录不超过20条（保留system）
            while (messages.length > 20) {
                if (messages[0].role !== 'system') {
                    messages.shift();
                } else if (messages.length > 21) {
                    messages.splice(1, 1);
                } else {
                    break;
                }
            }
            
            return reply;
        } catch (error) {
            console.error('API调用失败:', error);
            return `抱歉，我暂时无法回答。${error.message || '请稍后再试。'}😅`;
        }
    }
    
    // 发送消息
    async function sendMessage() {
        const userInput = input.value.trim();
        if (!userInput) return;
        
        // 清空输入框
        input.value = '';
        
        // 显示用户消息
        addMessage(userInput, true);
        
        // 显示打字动画
        showTyping();
        
        // 调用API
        let reply = await callBailianAPI(userInput);
        
        // 隐藏打字动画
        hideTyping();
        
        // 显示回复
        addMessage(reply, false);
    }
    
    // 初始化
    function init() {
        createChatbot();
        console.log('🤖 AI小助手已启动 | 使用阿里云百炼 DeepSeek 模型');
        
        // 检查API Key
        if (API_KEY === 'sk-b30d3ab8f9be4ecb89e84eeea4200594') {
            console.warn('⚠️ 请配置阿里云百炼 API Key！');
            setTimeout(() => {
                addMessage('⚠️ 提示：AI小助手需要配置阿里云百炼 API Key 才能使用。\n请在 ai-chatbot.js 文件中设置正确的 API Key。', false);
            }, 1000);
        }
    }
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();