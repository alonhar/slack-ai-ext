
console.log('SLACK EXTENSION: Loading...');

try {
    const testKey = 'slack_extension_test_' + Date.now();
    localStorage.setItem(testKey, 'test');
    const testValue = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    console.log('SLACK EXTENSION: localStorage test successful:', testValue === 'test');
    
    const existingApiKey = localStorage.getItem('slack_extension_openai_key');
    const existingOps = localStorage.getItem('slack_extension_custom_operations');
    const existingLang = localStorage.getItem('slack_extension_summarization_language');
    console.log('SLACK EXTENSION: Existing data check:', {
        hasApiKey: !!existingApiKey,
        hasCustomOps: !!existingOps,
        customOpsData: existingOps ? JSON.parse(existingOps) : null,
        hasLanguage: !!existingLang,
        languageValue: existingLang
    });
} catch (error) {
    console.error('SLACK EXTENSION: localStorage test failed:', error);
}

try {
    function addAISummarizeButton(messageActionsContainer) {
        try {
            if (messageActionsContainer.querySelector('.slack-ai-summarize-button')) {
                return true;
            }

            const actionsGroup = messageActionsContainer.querySelector('.c-message_actions__group') ||
                               messageActionsContainer.querySelector('[role="group"]') ||
                               messageActionsContainer;

            if (!actionsGroup) {
                return false;
            }

            const aiButton = document.createElement('button');
            aiButton.className = 'c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default slack-ai-summarize-button';
            aiButton.type = 'button';
            aiButton.innerHTML = '✨';
            aiButton.title = 'Summarize with AI';
            aiButton.setAttribute('aria-label', 'Summarize message with AI');
            aiButton.style.cssText = 'font-size: 16px !important;';

            aiButton.addEventListener('click', async function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                const originalText = aiButton.innerHTML;
                
                try {
                    const messageElement = messageActionsContainer.closest('[data-qa="virtual-list-item"]') ||
                                         messageActionsContainer.closest('.c-virtual_list__item') ||
                                         messageActionsContainer.closest('[role="listitem"]') ||
                                         messageActionsContainer.closest('.c-message_kit__message');
                    
                    if (!messageElement) return;
                    
                    const messageText = extractMessageText(messageElement);
                    if (!messageText || messageText.trim().length < 10) return;
                    
                    aiButton.innerHTML = '⏳';
                    aiButton.disabled = true;
                    aiButton.style.opacity = '0.6';
                    
                    try {
                        const summary = await summarizeWithAI(messageText);
                        
                        if (summary) {
                            displaySummaryUnderMessage(messageElement, summary);
                            aiButton.innerHTML = '✅';
                            setTimeout(() => {
                                aiButton.innerHTML = originalText;
                                aiButton.disabled = false;
                                aiButton.style.opacity = '1';
                            }, 2000);
                        } else {
                            throw new Error('No summary returned');
                        }
                        
                    } catch (apiError) {
                        console.error('SLACK EXTENSION: API error:', apiError.message);
                        aiButton.innerHTML = '❌';
                        setTimeout(() => {
                            aiButton.innerHTML = originalText;
                            aiButton.disabled = false;
                            aiButton.style.opacity = '1';
                        }, 2000);
                    }
                    
                } catch (error) {
                    console.error('SLACK EXTENSION: Error in summarize handler:', error);
                    aiButton.innerHTML = originalText;
                    aiButton.disabled = false;
                    aiButton.style.opacity = '1';
                }
            });

            actionsGroup.appendChild(aiButton);
            return true;

        } catch (error) {
            console.error('SLACK EXTENSION: Error adding AI summarize button:', error);
            return false;
        }
    }

    function extractMessageText(messageElement) {
        try {
            const messageContent = messageElement.querySelector('.c-message_kit__text') ||
                                 messageElement.querySelector('[data-qa="message-text"]') ||
                                 messageElement.querySelector('.p-rich_text_section') ||
                                 messageElement.querySelector('.c-message__body') ||
                                 messageElement.querySelector('.c-message_content');
            
            if (messageContent) {
                const text = messageContent.textContent || messageContent.innerText || '';
                return text.trim();
            } else {
                const fallbackText = messageElement.textContent || messageElement.innerText || '';
                return fallbackText.trim();
            }
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error extracting message text:', error);
            return '';
        }
    }

    async function callAI(messages, options = {}) {
        const provider = getAIProvider();
        const maxTokens = options.maxTokens || 200;
        const temperature = options.temperature || 0.3;
        
        if (provider === 'gemini') {
            return await callGemini(messages, { maxTokens, temperature });
        } else {
            return await callOpenAI(messages, { maxTokens, temperature });
        }
    }

    async function callOpenAI(messages, options = {}) {
        try {
            const apiKey = getOpenAIKey();
            if (!apiKey) {
                throw new Error('No OpenAI API key found. Please set your API key using Ctrl+Alt+A.');
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: messages,
                    max_tokens: options.maxTokens || 200,
                    temperature: options.temperature || 0.3
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();
            
            if (!content) {
                throw new Error('No response generated');
            }

            return content;

        } catch (error) {
            console.error('SLACK EXTENSION: Error calling OpenAI:', error);
            throw error;
        }
    }

    async function callGemini(messages, options = {}) {
        try {
            const apiKey = getGeminiKey();
            if (!apiKey) {
                throw new Error('No Gemini API key found. Please set your API key using Ctrl+Alt+A.');
            }

            let prompt = '';
            messages.forEach(msg => {
                if (msg.role === 'system') {
                    prompt += `Instructions: ${msg.content}\n\n`;
                } else if (msg.role === 'user') {
                    prompt += msg.content;
                }
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: options.maxTokens || 200,
                        temperature: options.temperature || 0.3
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            
            if (!content) {
                throw new Error('No response generated');
            }

            return content;

        } catch (error) {
            console.error('SLACK EXTENSION: Error calling Gemini:', error);
            throw error;
        }
    }

    async function summarizeWithAI(text) {
        try {
            const selectedLanguage = getSummarizationLanguage();
            
            let systemPrompt = 'You are a helpful assistant that summarizes Slack messages. Provide a concise, clear summary that captures the key points. Use proper formatting with line breaks where appropriate and bullet points where appropriate.';
            
            if (selectedLanguage === 'auto') {
                systemPrompt += ' Respond in the same language as the original message.';
            } else {
                systemPrompt += ` Always respond in ${selectedLanguage}.`;
            }

            const messages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `Please summarize this Slack message:\n\n${text}`
                }
            ];

            return await callAI(messages, { maxTokens: 200, temperature: 0.3 });

        } catch (error) {
            console.error('SLACK EXTENSION: Error summarizing with AI:', error);
            throw error;
        }
    }

    function displaySummaryUnderMessage(messageElement, summary) {
        try {
            const existingSummary = messageElement.querySelector('.slack-ai-summary');
            if (existingSummary) {
                existingSummary.remove();
            }

            const summaryContainer = document.createElement('div');
            summaryContainer.className = 'slack-ai-summary';
            summaryContainer.style.cssText = `
                margin: 8px 16px 8px 52px !important;
                padding: 12px !important;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 8px !important;
                font-size: 13px !important;
                line-height: 1.4 !important;
                color: #495057 !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                position: relative !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
            `;

            const summaryHeader = document.createElement('div');
            summaryHeader.style.cssText = `
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                margin-bottom: 8px !important;
                font-weight: 600 !important;
                color: #6c757d !important;
                font-size: 12px !important;
            `;
            summaryHeader.innerHTML = '🤖 AI Summary';

            const summaryText = document.createElement('div');
            summaryText.style.cssText = `
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                line-height: 1.5 !important;
            `;
            summaryText.textContent = summary;

            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                background: none !important;
                border: none !important;
                font-size: 16px !important;
                cursor: pointer !important;
                color: #6c757d !important;
                padding: 0 !important;
                width: 20px !important;
                height: 20px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                opacity: 0.7 !important;
                transition: all 0.2s ease !important;
            `;

            closeButton.addEventListener('click', function() {
                summaryContainer.remove();
            });

            closeButton.addEventListener('mouseenter', function() {
                closeButton.style.backgroundColor = '#e9ecef';
                closeButton.style.opacity = '1';
            });

            closeButton.addEventListener('mouseleave', function() {
                closeButton.style.backgroundColor = 'transparent';
                closeButton.style.opacity = '0.7';
            });

            summaryContainer.appendChild(summaryHeader);
            summaryContainer.appendChild(summaryText);
            summaryContainer.appendChild(closeButton);

            messageElement.appendChild(summaryContainer);

            setTimeout(() => {
                summaryContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 100);

        } catch (error) {
            console.error('SLACK EXTENSION: Error displaying summary:', error);
        }
    }

    function setupMessageActionsMonitoring() {
        function checkExistingContainers() {
            const existingContainers = document.querySelectorAll('.c-message_actions__container');
            
            existingContainers.forEach((container, index) => {
                addAISummarizeButton(container);
            });
        }
        
        checkExistingContainers();
        
        setInterval(checkExistingContainers, 2000);
        
        if (typeof MutationObserver === 'undefined') {
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && node.classList.contains('c-message_actions__container')) {
                                setTimeout(() => addAISummarizeButton(node), 100);
                            }
                            
                            if (node.querySelector) {
                                const actionContainers = node.querySelectorAll('.c-message_actions__container');
                                actionContainers.forEach(container => {
                                    setTimeout(() => addAISummarizeButton(container), 100);
                                });
                            }
                        }
                    });
                    
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('c-message_actions__container')) {
                        }
                    });
                }
                
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('c-message_actions__container')) {
                        setTimeout(() => addAISummarizeButton(target), 100);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        setupMessageHoverDetection();
    }
    
    function setupMessageHoverDetection() {
        document.addEventListener('mouseenter', function(event) {
            const target = event.target;
            
            if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') {
                return;
            }
            
            const messageElement = target.closest('[data-qa="virtual-list-item"]') ||
                                 target.closest('.c-virtual_list__item') ||
                                 target.closest('[role="listitem"]') ||
                                 target.closest('.c-message_kit__message');
                                 
            if (messageElement) {
                const checkForActions = () => {
                    const actionContainers = messageElement.querySelectorAll('.c-message_actions__container');
                    if (actionContainers.length > 0) {
                        actionContainers.forEach(container => {
                            addAISummarizeButton(container);
                        });
                        return true;
                    }
                    return false;
                };
                
                if (!checkForActions()) {
                    setTimeout(checkForActions, 50);
                    setTimeout(checkForActions, 100);
                    setTimeout(checkForActions, 200);
                }
            }
        }, true); // Use capture phase
    }

    function addAIButton() {
        console.log('SLACK EXTENSION: addAIButton() called');
        try {
            if (document.querySelector('.slack-ai-composer-container')) {
                return true;
            }

            const composerBody = document.querySelector('.p-composer__body');
            if (!composerBody) return false;

            const menu = document.createElement('div');
            menu.className = 'slack-ai-composer-menu';
            menu.style.cssText = `
                display: none; position: absolute; bottom: 35px; right: 0;
                background-color: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: 1px solid #ddd; z-index: 1001; overflow: hidden; width: 200px;
            `;

            const improveButton = document.createElement('button');
            improveButton.innerHTML = '📝 Improve Writing';
            improveButton.dataset.action = 'improve';
            improveButton.style.cssText = `display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: none; background: none; text-align: left; cursor: pointer; font-size: 14px;`;
            
            const translateButton = document.createElement('button');
            translateButton.innerHTML = '🌐 Translate to English';
            translateButton.dataset.action = 'translate';
            translateButton.style.cssText = improveButton.style.cssText;

            const fixButton = document.createElement('button');
            fixButton.innerHTML = '🔧 Fix Spelling & Grammar';
            fixButton.dataset.action = 'fix';
            fixButton.style.cssText = improveButton.style.cssText;

            const professionalButton = document.createElement('button');
            professionalButton.innerHTML = '👔 Make Professional';
            professionalButton.dataset.action = 'professional';
            professionalButton.style.cssText = improveButton.style.cssText;

            const casualButton = document.createElement('button');
            casualButton.innerHTML = '😊 Make Casual';
            casualButton.dataset.action = 'casual';
            casualButton.style.cssText = improveButton.style.cssText;

            const shortenButton = document.createElement('button');
            shortenButton.innerHTML = '✂️ Make Shorter';
            shortenButton.dataset.action = 'shorten';
            shortenButton.style.cssText = improveButton.style.cssText;
            
            const separator = document.createElement('div');
            separator.style.cssText = 'height: 1px; background-color: #eee; margin: 4px 0;';

            const setHoverEffect = btn => {
                btn.onmouseover = () => btn.style.backgroundColor = '#f8f8f8';
                btn.onmouseout = () => btn.style.backgroundColor = 'transparent';
            };
            setHoverEffect(improveButton);
            setHoverEffect(translateButton);
            setHoverEffect(fixButton);
            setHoverEffect(professionalButton);
            setHoverEffect(casualButton);
            setHoverEffect(shortenButton);
            
            menu.appendChild(improveButton);
            menu.appendChild(translateButton);
            menu.appendChild(separator);
            menu.appendChild(fixButton);
            menu.appendChild(professionalButton);
            menu.appendChild(casualButton);
            menu.appendChild(shortenButton);
            
            const customOperations = getCustomOperations();
            console.log('SLACK EXTENSION: Loading custom operations:', customOperations);
            if (customOperations.length > 0) {
                const customSeparator = document.createElement('div');
                customSeparator.style.cssText = 'height: 1px; background-color: #eee; margin: 4px 0;';
                menu.appendChild(customSeparator);
                
                customOperations.forEach(customOp => {
                    const customButton = document.createElement('button');
                    customButton.innerHTML = `⚡ ${customOp.title}`;
                    customButton.dataset.action = `custom_${customOp.id}`;
                    customButton.style.cssText = improveButton.style.cssText;
                    setHoverEffect(customButton);
                    
                    customButton.addEventListener('click', () => handleAIAction(`custom_${customOp.id}`));
                    
                    menu.appendChild(customButton);
                });
            }
            
            const manageSeparator = document.createElement('div');
            manageSeparator.style.cssText = 'height: 1px; background-color: #eee; margin: 4px 0;';
            menu.appendChild(manageSeparator);
            
            const manageButton = document.createElement('button');
            manageButton.innerHTML = '⚙️ Manage Operations';
            manageButton.style.cssText = `${improveButton.style.cssText} color: #666; font-style: italic;`;
            setHoverEffect(manageButton);
            menu.appendChild(manageButton);

            const aiButtonContainer = document.createElement('div');
            aiButtonContainer.id = 'slack-ai-button-container';
            aiButtonContainer.style.cssText = `
                display: inline-flex !important;
                align-items: center !important;
                margin-left: 8px !important;
                margin-top: 2px !important;
                border-radius: 4px !important;
                background: #007a5a !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                border: 1px solid #005c40;
                box-shadow: 0 1px 1px rgba(0,0,0,0.05);
            `;

            const actionPart = document.createElement('button');
            actionPart.innerHTML = '<span style="font-size: 13px; line-height: 1;">✨</span><span style="line-height: 1;">AI</span>';
            actionPart.title = 'Improve Writing';
            actionPart.setAttribute('type', 'button');
            actionPart.style.cssText = `
                background: none !important; color: white !important; border: none !important;
                padding: 6px 10px !important; cursor: pointer !important; display: inline-flex !important;
                align-items: center !important; gap: 4px !important;
                border-right: 1px solid rgba(255, 255, 255, 0.3) !important;
                transition: background-color 0.2s ease !important;
                font-size: 12px !important; font-weight: 600 !important;
            `;

            const menuPart = document.createElement('button');
            menuPart.innerHTML = '▾';
            menuPart.title = 'More AI Tools';
            menuPart.setAttribute('type', 'button');
            menuPart.style.cssText = `
                background: none !important; color: white !important; border: none !important;
                padding: 6px 8px !important; cursor: pointer !important;
                transition: background-color 0.2s ease !important; font-size: 10px;
                display: flex !important; align-items: center !important;
            `;

            actionPart.addEventListener('mouseenter', () => actionPart.style.backgroundColor = 'rgba(0,0,0,0.15) !important');
            actionPart.addEventListener('mouseleave', () => actionPart.style.backgroundColor = 'transparent !important');
            menuPart.addEventListener('mouseenter', () => menuPart.style.backgroundColor = 'rgba(0,0,0,0.15) !important');
            menuPart.addEventListener('mouseleave', () => menuPart.style.backgroundColor = 'transparent !important');
            
            aiButtonContainer.appendChild(actionPart);
            aiButtonContainer.appendChild(menuPart);

            aiButtonContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showAPIKeyOverlay();
            });

            const container = document.createElement('div');
            container.className = 'slack-ai-composer-container';
            container.style.position = 'relative';
            container.appendChild(aiButtonContainer);
            container.appendChild(menu);

            actionPart.addEventListener('click', () => handleAIAction('improve'));
            
            menuPart.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
            
            document.addEventListener('click', () => {
                if (menu.style.display === 'block') menu.style.display = 'none';
            });

            const handleAIAction = async (mode) => {
                menu.style.display = 'none'; // Close menu on action
                const originalActionHTML = actionPart.innerHTML;
                actionPart.innerHTML = '⏳';
                actionPart.disabled = true;
                menuPart.disabled = true;

                try {
                    const messageInput = document.querySelector('[data-qa="message_input"]') || document.querySelector('.ql-editor') || document.querySelector('[contenteditable="true"]');
                    if (!messageInput) throw new Error("Could not find message input");

                    let currentText = '';
                    if (messageInput.classList.contains('ql-editor') || messageInput.classList.contains('ql-container') || messageInput.querySelector('.ql-editor')) {
                        const editorElement = messageInput.classList.contains('ql-editor') ? messageInput : messageInput.querySelector('.ql-editor');
                        
                        const paragraphs = editorElement ? editorElement.querySelectorAll('p') : [];
                        
                        if (paragraphs.length > 0) {
                            currentText = Array.from(paragraphs)
                                .map(p => p.textContent || '')
                                .join('\n');
                        } else {
                            currentText = editorElement ? editorElement.innerText : messageInput.innerText;
                        }
                    } else {
                        currentText = messageInput.innerText || messageInput.textContent || '';
                    }

                    const cleanedText = currentText.replace(/\s*Message\s+.*$/i, '').trim();
                    if (!cleanedText) throw new Error("Input is empty");
                    
                                            const enhancedText = await enhanceTextWithAI(cleanedText, mode);
                    if (!enhancedText) throw new Error("No text returned from AI");
                    
                    const editor = messageInput.closest('.ql-editor');
                    if (editor && typeof window.Quill !== 'undefined') {
                        const quill = window.Quill.find(editor);
                        if (quill) {
                            quill.setText(enhancedText + '\n'); // Use setText to replace content
                            quill.setSelection(quill.getLength(), 0); // Move cursor to the end
                        } else {
                            editor.focus();
                            document.execCommand('selectAll', false, null);
                            await new Promise(r => setTimeout(r, 50));
                            document.execCommand('insertText', false, enhancedText);
                        }
                    } else {
                        messageInput.focus();
                        document.execCommand('selectAll', false, null);
                        await new Promise(r => setTimeout(r, 50));
                        document.execCommand('insertText', false, enhancedText);
                    }
                    
                    actionPart.innerHTML = '✅';
                } catch (error) {
                    console.error('SLACK EXTENSION: AI Action Error:', error);
                    actionPart.innerHTML = '❌';
                } finally {
                    setTimeout(() => {
                        actionPart.innerHTML = originalActionHTML;
                        actionPart.disabled = false;
                        menuPart.disabled = false;
                    }, 2000);
                }
            };
            
            improveButton.addEventListener('click', () => handleAIAction('improve'));
            translateButton.addEventListener('click', () => handleAIAction('translate'));
            fixButton.addEventListener('click', () => handleAIAction('fix'));
            professionalButton.addEventListener('click', () => handleAIAction('professional'));
            casualButton.addEventListener('click', () => handleAIAction('casual'));
            shortenButton.addEventListener('click', () => handleAIAction('shorten'));
            
            
            manageButton.addEventListener('click', () => {
                menu.style.display = 'none';
                showAPIKeyOverlay();
            });
            
            const actionButtons = composerBody.querySelector('.p-composer__actions') || composerBody;
            actionButtons.appendChild(container);
            console.log('SLACK EXTENSION: AI button successfully added with', customOperations.length, 'custom operations');
            return true;

        } catch (error) {
            console.error('SLACK EXTENSION: Error adding AI button UI:', error);
            return false;
        }
    }

    async function enhanceTextWithAI(text, mode = 'improve') {
        const provider = getAIProvider();
        const apiKey = provider === 'gemini' ? getGeminiKey() : getOpenAIKey();
        if (!apiKey) {
            throw new Error(`${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key not found. Please set it using Ctrl+Alt+A.`);
        }

        let userPrompt;
        
        if (mode.startsWith('custom_')) {
            const customId = mode.replace('custom_', '');
            const customOperations = getCustomOperations();
            const customOp = customOperations.find(op => op.id === customId);
            if (customOp) {
                userPrompt = `${customOp.prompt}\n\nReturn ONLY the response text, without any additional comments, introductions, or formatting.\n\n${text}`;
            } else {
                throw new Error('Custom operation not found');
            }
        } else if (mode === 'translate') {
            userPrompt = `Translate the following text to English. Return ONLY the translated text, without any additional comments or introductions or formatting.\n\n${text}`;
        } else if (mode === 'fix') {
            userPrompt = `Fix all spelling and grammar mistakes in the following text. Do not change the tone or meaning. Return only the corrected text.\n\n${text}`;
        } else if (mode === 'professional') {
            userPrompt = `Rewrite the following text to have a more professional and formal tone. Return only the rewritten text.\n\n${text}`;
        } else if (mode === 'casual') {
            userPrompt = `Rewrite the following text to have a more casual and friendly tone. Return only the rewritten text.\n\n${text}`;
        } else if (mode === 'shorten') {
            userPrompt = `Make the following text more concise and to the point. Remove any unnecessary words or sentences. Return only the shortened text.\n\n${text}`;
        } else { // default to 'improve'
            userPrompt = `This is a slack message, please correct my mistakes and keep the way I wrote it but improve it(write only the text.. without any introduction)\n\n${text}`;
        }

        console.log(`SLACK EXTENSION: Sending to ${provider} (mode: ${mode}):`, JSON.stringify({ prompt: userPrompt }, null, 2));

        const messages = [
            {
                role: 'user',
                content: userPrompt
            }
        ];

        const enhancedText = await callAI(messages, { maxTokens: 500, temperature: 0.7 });
        
        console.log(`SLACK EXTENSION: Received from ${provider}:`, JSON.stringify({ enhancedText }, null, 2));
        
        if (!enhancedText) {
            throw new Error(`Invalid response format from ${provider}`);
        }

        return enhancedText;
    }

    function addVisualIndicator() {
        try {
            console.log('SLACK EXTENSION: ✅ Extension loaded and active');
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error adding visual indicator:', error);
            return false;
        }
    }

    function tryAddBanner() {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return false;
        }
        
        console.log('SLACK EXTENSION: Environment check - process.type:', typeof process !== 'undefined' ? process.type : 'undefined');
        
        return addVisualIndicator();
    }

    function refreshAIButton() {
        console.log('SLACK EXTENSION: refreshAIButton called');
        const existingContainer = document.querySelector('.slack-ai-composer-container');
        if (existingContainer) {
            console.log('SLACK EXTENSION: Removing existing AI button container');
            existingContainer.remove();
        } else {
            console.log('SLACK EXTENSION: No existing AI button container found');
        }
        const result = addAIButton();
        console.log('SLACK EXTENSION: addAIButton result:', result);
        return result;
    }

    function tryAddAIButton() {
        if (typeof document === 'undefined') {
            return false;
        }

        return addAIButton();
    }

    function initializeExtension() {
        console.log('SLACK EXTENSION: Initializing extension...');
        
        tryAddBanner();
        
        console.log('SLACK EXTENSION: DOM structure check - composer elements:', {
            composerBody: !!document.querySelector('.p-composer__body'),
            composerActions: !!document.querySelector('.p-composer__actions'),
            messageInput: !!document.querySelector('[data-qa="message_input"]')
        });
        
        if (!tryAddAIButton()) {
            setupComposerWatcher();
        }
        
        setupMessageActionsMonitoring();
        
        setupButtonMonitoring();
    }

    function setupComposerWatcher() {
        let attempts = 0;
        const maxAttempts = 40;
        
        const watcherInterval = setInterval(() => {
            attempts++;
            console.log(`SLACK EXTENSION: Composer watch attempt ${attempts}/${maxAttempts}`);
            
            if (tryAddAIButton() || attempts >= maxAttempts) {
                clearInterval(watcherInterval);
                if (attempts >= maxAttempts) {
                    console.log('SLACK EXTENSION: Max attempts reached for AI button');
                }
            }
        }, 200); // Check every 0.5 seconds
    }

    function setupButtonMonitoring() {
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                let shouldCheck = false;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                if (node.classList && (
                                    node.classList.contains('p-composer') ||
                                    node.classList.contains('p-composer__body') ||
                                    node.querySelector && node.querySelector('.p-composer')
                                )) {
                                    shouldCheck = true;
                                }
                            }
                        });
                        
                        mutation.removedNodes.forEach((node) => {
                            if (node.nodeType === 1 && (node.id === 'slack-ai-button-container' || node.classList.contains('slack-ai-composer-container'))) {
                                console.log('SLACK EXTENSION: AI button was removed, will re-add');
                                shouldCheck = true;
                            }
                        });
                    }
                });
                
                if (shouldCheck) {
                    setTimeout(() => {
                        if (!document.querySelector('.slack-ai-composer-container')) {
                            tryAddAIButton();
                        }
                    }, 500); // Small delay to let DOM settle
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        setInterval(() => {
            if (!document.querySelector('.slack-ai-composer-container')) {
                tryAddAIButton();
            }
        }, 1000);
        
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                setTimeout(() => {
                    if (!document.querySelector('.slack-ai-composer-container')) {
                        tryAddAIButton();
                    }
                }, 1000); // Longer delay for navigation
            }
        }, 1000);
    }

    console.log('SLACK EXTENSION: Setting up safe injection...');
    
    
    
    

    console.log('SLACK EXTENSION: Setup complete');
    
    setTimeout(() => {
        console.log('SLACK EXTENSION: Force initialization starting...');
        initializeExtension();
    }, 2000);
    
    setTimeout(() => {
        console.log('SLACK EXTENSION: Secondary initialization attempt...');
        if (!document.querySelector('.slack-ai-composer-container')) {
            console.log('SLACK EXTENSION: AI button not found, attempting to add...');
            tryAddAIButton();
        } else {
            console.log('SLACK EXTENSION: AI button already exists');
        }
    }, 5000);
    
    window.testSlackExtensionStorage = function() {
        console.log('=== SLACK EXTENSION STORAGE TEST ===');
        
        const testApiKey = 'test-key-' + Date.now();
        console.log('1. Testing API key storage...');
        saveOpenAIKey(testApiKey);
        const retrievedKey = getOpenAIKey();
        console.log('Saved:', testApiKey, 'Retrieved:', retrievedKey, 'Match:', testApiKey === retrievedKey);
        
        console.log('2. Testing custom operations storage...');
        const testOp = { id: 'test-' + Date.now(), title: 'Test Operation', prompt: 'Test prompt' };
        const currentOps = getCustomOperations();
        console.log('Current operations:', currentOps);
        
        const newOp = addCustomOperation(testOp.title, testOp.prompt);
        console.log('Added operation:', newOp);
        
        const updatedOps = getCustomOperations();
        console.log('Updated operations:', updatedOps);
        
        if (newOp) {
            deleteCustomOperation(newOp.id);
            console.log('Cleaned up test operation');
        }
        removeOpenAIKey();
        console.log('Cleaned up test API key');
        
        console.log('=== STORAGE TEST COMPLETE ===');
    };
    
    window.refreshSlackExtensionButton = function() {
        console.log('=== MANUALLY REFRESHING AI BUTTON ===');
        const result = refreshAIButton();
        console.log('Refresh result:', result);
        const customOps = getCustomOperations();
        console.log('Current custom operations:', customOps);
        console.log('=== REFRESH COMPLETE ===');
    };

    function saveOpenAIKey(apiKey) {
        try {
            localStorage.setItem('slack_extension_openai_key', apiKey);
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error saving API key:', error);
            return false;
        }
    }
    
    function getOpenAIKey() {
        try {
            const key = localStorage.getItem('slack_extension_openai_key');
            return key;
        } catch (error) {
            console.error('SLACK EXTENSION: Error retrieving API key:', error);
            return null;
        }
    }
    
    function removeOpenAIKey() {
        try {
            localStorage.removeItem('slack_extension_openai_key');
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error removing API key:', error);
            return false;
        }
    }

    function saveSummarizationLanguage(language) {
        try {
            localStorage.setItem('slack_extension_summarization_language', language);
            console.log('SLACK EXTENSION: Summarization language saved:', language);
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error saving summarization language:', error);
            return false;
        }
    }

    function getSummarizationLanguage() {
        try {
            return localStorage.getItem('slack_extension_summarization_language') || 'auto';
        } catch (error) {
            console.error('SLACK EXTENSION: Error getting summarization language:', error);
            return 'auto';
        }
    }

    function saveAIProvider(provider) {
        try {
            localStorage.setItem('slack_extension_ai_provider', provider);
            console.log('SLACK EXTENSION: AI provider saved:', provider);
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error saving AI provider:', error);
            return false;
        }
    }

    function getAIProvider() {
        try {
            return localStorage.getItem('slack_extension_ai_provider') || 'openai';
        } catch (error) {
            console.error('SLACK EXTENSION: Error getting AI provider:', error);
            return 'openai';
        }
    }

    function saveGeminiKey(apiKey) {
        try {
            localStorage.setItem('slack_extension_gemini_key', apiKey);
            console.log('SLACK EXTENSION: Gemini API key saved to localStorage');
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error saving Gemini API key:', error);
            return false;
        }
    }

    function getGeminiKey() {
        try {
            return localStorage.getItem('slack_extension_gemini_key') || '';
        } catch (error) {
            console.error('SLACK EXTENSION: Error getting Gemini API key:', error);
            return '';
        }
    }

    function removeGeminiKey() {
        try {
            localStorage.removeItem('slack_extension_gemini_key');
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error removing Gemini API key:', error);
            return false;
        }
    }

    function getCustomOperations() {
        try {
            const stored = localStorage.getItem('slack_extension_custom_operations');
            const result = stored ? JSON.parse(stored) : [];
            console.log('SLACK EXTENSION: Retrieved custom operations from localStorage:', result);
            return result;
        } catch (error) {
            console.error('SLACK EXTENSION: Error getting custom operations:', error);
            return [];
        }
    }

    function saveCustomOperations(operations) {
        try {
            localStorage.setItem('slack_extension_custom_operations', JSON.stringify(operations));
            console.log('SLACK EXTENSION: Custom operations saved to localStorage');
            return true;
        } catch (error) {
            console.error('SLACK EXTENSION: Error saving custom operations:', error);
            return false;
        }
    }

    function addCustomOperation(title, prompt) {
        try {
            const operations = getCustomOperations();
            const newOperation = {
                id: Date.now().toString(),
                title: title.trim(),
                prompt: prompt.trim()
            };
            operations.push(newOperation);
            return saveCustomOperations(operations) ? newOperation : null;
        } catch (error) {
            console.error('SLACK EXTENSION: Error adding custom operation:', error);
            return null;
        }
    }

    function updateCustomOperation(id, title, prompt) {
        try {
            const operations = getCustomOperations();
            const index = operations.findIndex(op => op.id === id);
            if (index !== -1) {
                operations[index] = { id, title: title.trim(), prompt: prompt.trim() };
                return saveCustomOperations(operations);
            }
            return false;
        } catch (error) {
            console.error('SLACK EXTENSION: Error updating custom operation:', error);
            return false;
        }
    }

    function deleteCustomOperation(id) {
        try {
            const operations = getCustomOperations();
            const filtered = operations.filter(op => op.id !== id);
            return saveCustomOperations(filtered);
        } catch (error) {
            console.error('SLACK EXTENSION: Error deleting custom operation:', error);
            return false;
        }
    }

    function createCustomOperationsSection() {
        console.log('SLACK EXTENSION: createCustomOperationsSection called');
        const customOperations = getCustomOperations();
        console.log('SLACK EXTENSION: createCustomOperationsSection found', customOperations.length, 'operations');
        
        const section = document.createElement('div');
        section.style.cssText = `
            margin-top: 25px !important;
            padding-top: 20px !important;
            border-top: 1px solid #e1e5e9 !important;
        `;
        
        const customTitle = document.createElement('h3');
        customTitle.style.cssText = `
            margin: 0 0 15px 0 !important;
            font-size: 18px !important;
            font-weight: 600 !important;
            color: #1d1c1d !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        `;
        customTitle.innerHTML = '⚡ Custom Operations';
        
        const addButton = document.createElement('button');
        addButton.innerHTML = '+ Add Operation';
        addButton.style.cssText = `
            padding: 8px 16px !important;
            background: #007a5a !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            margin-bottom: 15px !important;
            transition: background-color 0.2s ease !important;
        `;
        
        const operationsList = document.createElement('div');
        operationsList.id = 'custom-operations-list';
        
        function renderOperations() {
            operationsList.innerHTML = '';
            const currentOperations = getCustomOperations();
            console.log('SLACK EXTENSION: renderOperations called, found', currentOperations.length, 'operations:', currentOperations);
            
            if (currentOperations.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.style.cssText = `
                    padding: 20px !important;
                    text-align: center !important;
                    color: #666 !important;
                    font-style: italic !important;
                    background: #f8f9fa !important;
                    border-radius: 6px !important;
                    border: 1px dashed #ddd !important;
                `;
                emptyMessage.textContent = 'No custom operations yet. Click "Add Operation" to create your first one.';
                operationsList.appendChild(emptyMessage);
                return;
            }
            
            currentOperations.forEach(op => {
                const opItem = document.createElement('div');
                opItem.style.cssText = `
                    padding: 12px !important;
                    border: 1px solid #e1e5e9 !important;
                    border-radius: 6px !important;
                    margin-bottom: 10px !important;
                    background: #f8f9fa !important;
                `;
                
                const opHeader = document.createElement('div');
                opHeader.style.cssText = `
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                `;
                
                const opTitle = document.createElement('strong');
                opTitle.textContent = op.title;
                opTitle.style.cssText = `
                    color: #1d1c1d !important;
                    font-size: 14px !important;
                `;
                
                const opActions = document.createElement('div');
                opActions.style.cssText = `
                    display: flex !important;
                    gap: 5px !important;
                `;
                
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '✏️';
                editBtn.title = 'Edit';
                editBtn.style.cssText = `
                    padding: 4px 8px !important;
                    background: #0066cc !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 3px !important;
                    cursor: pointer !important;
                    font-size: 12px !important;
                `;
                
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.title = 'Delete';
                deleteBtn.style.cssText = `
                    padding: 4px 8px !important;
                    background: #dc3545 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 3px !important;
                    cursor: pointer !important;
                    font-size: 12px !important;
                `;
                
                const opPrompt = document.createElement('div');
                opPrompt.textContent = op.prompt.length > 100 ? op.prompt.substring(0, 100) + '...' : op.prompt;
                opPrompt.style.cssText = `
                    color: #666 !important;
                    font-size: 12px !important;
                    line-height: 1.4 !important;
                    font-family: Monaco, Consolas, monospace !important;
                    background: white !important;
                    padding: 8px !important;
                    border-radius: 4px !important;
                    border: 1px solid #e1e5e9 !important;
                `;
                
                editBtn.addEventListener('click', () => showOperationForm(op));
                                 deleteBtn.addEventListener('click', () => {
                     deleteCustomOperation(op.id);
                     renderOperations();
                     refreshAIButton(); // Refresh the AI menu to remove deleted operation
                 });
                
                opActions.appendChild(editBtn);
                opActions.appendChild(deleteBtn);
                opHeader.appendChild(opTitle);
                opHeader.appendChild(opActions);
                opItem.appendChild(opHeader);
                opItem.appendChild(opPrompt);
                operationsList.appendChild(opItem);
            });
        }
        
        function showOperationForm(existingOp = null) {
            const formOverlay = document.createElement('div');
            formOverlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 1000000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;
            
            const form = document.createElement('div');
            form.style.cssText = `
                background: white !important;
                padding: 25px !important;
                border-radius: 8px !important;
                width: 90% !important;
                max-width: 500px !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
            `;
            
            const formTitle = document.createElement('h3');
            formTitle.textContent = existingOp ? 'Edit Operation' : 'Add New Operation';
            formTitle.style.cssText = `
                margin: 0 0 20px 0 !important;
                color: #1d1c1d !important;
            `;
            
            const titleLabel = document.createElement('label');
            titleLabel.textContent = 'Operation Title:';
            titleLabel.style.cssText = `
                display: block !important;
                margin-bottom: 5px !important;
                font-weight: 600 !important;
                color: #1d1c1d !important;
            `;
            
            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.placeholder = 'e.g., Make Funny, Summarize, etc.';
            titleInput.value = existingOp ? existingOp.title : '';
            titleInput.style.cssText = `
                width: 100% !important;
                padding: 10px !important;
                border: 1px solid #e1e5e9 !important;
                border-radius: 4px !important;
                margin-bottom: 15px !important;
                font-size: 14px !important;
                box-sizing: border-box !important;
            `;
            
            const promptLabel = document.createElement('label');
            promptLabel.textContent = 'Prompt (the instruction will be automatically appended to return only the response):';
            promptLabel.style.cssText = `
                display: block !important;
                margin-bottom: 5px !important;
                font-weight: 600 !important;
                color: #1d1c1d !important;
            `;
            
            const promptInput = document.createElement('textarea');
            promptInput.placeholder = 'e.g., Rewrite this text to be funny and entertaining...';
            promptInput.value = existingOp ? existingOp.prompt : '';
            promptInput.rows = 4;
            promptInput.style.cssText = `
                width: 100% !important;
                padding: 10px !important;
                border: 1px solid #e1e5e9 !important;
                border-radius: 4px !important;
                margin-bottom: 15px !important;
                font-size: 14px !important;
                font-family: inherit !important;
                resize: vertical !important;
                box-sizing: border-box !important;
            `;
            
            const formButtons = document.createElement('div');
            formButtons.style.cssText = `
                display: flex !important;
                gap: 10px !important;
                justify-content: flex-end !important;
            `;
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                padding: 10px 20px !important;
                background: #6c757d !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
            `;
            
            const saveBtn = document.createElement('button');
            saveBtn.textContent = existingOp ? 'Update' : 'Add';
            saveBtn.style.cssText = `
                padding: 10px 20px !important;
                background: #007a5a !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
            `;
            
            cancelBtn.addEventListener('click', () => formOverlay.remove());
            const errorMsg = document.createElement('div');
            errorMsg.style.cssText = `
                background: #f8d7da !important;
                color: #721c24 !important;
                border: 1px solid #f5c6cb !important;
                border-radius: 4px !important;
                padding: 10px !important;
                margin-bottom: 15px !important;
                font-size: 14px !important;
                display: none !important;
            `;
            errorMsg.textContent = 'Please fill in both title and prompt';
            
            saveBtn.addEventListener('click', () => {
                const title = titleInput.value.trim();
                const prompt = promptInput.value.trim();
                
                if (!title || !prompt) {
                    errorMsg.style.display = 'block';
                    if (!title) {
                        titleInput.focus();
                        titleInput.style.borderColor = '#dc3545';
                    } else if (!prompt) {
                        promptInput.focus();
                        promptInput.style.borderColor = '#dc3545';
                    }
                    return;
                }
                
                errorMsg.style.display = 'none';
                titleInput.style.borderColor = '#e1e5e9';
                promptInput.style.borderColor = '#e1e5e9';
                
                                 if (existingOp) {
                     console.log('SLACK EXTENSION: Updating existing operation:', existingOp.id, title);
                     updateCustomOperation(existingOp.id, title, prompt);
                 } else {
                     console.log('SLACK EXTENSION: Adding new operation:', title);
                     const newOp = addCustomOperation(title, prompt);
                     console.log('SLACK EXTENSION: New operation result:', newOp);
                 }
                 
                 console.log('SLACK EXTENSION: Re-rendering operations list...');
                 renderOperations();
                 console.log('SLACK EXTENSION: Refreshing AI button...');
                 refreshAIButton(); // Refresh the AI menu to include new/updated operations
                 formOverlay.remove();
            });
            
            formButtons.appendChild(cancelBtn);
            formButtons.appendChild(saveBtn);
            
            form.appendChild(formTitle);
            form.appendChild(titleLabel);
            form.appendChild(titleInput);
            form.appendChild(promptLabel);
            form.appendChild(promptInput);
            form.appendChild(errorMsg);
            form.appendChild(formButtons);
            
            formOverlay.appendChild(form);
            document.body.appendChild(formOverlay);
            
            titleInput.addEventListener('input', () => {
                if (titleInput.value.trim()) {
                    titleInput.style.borderColor = '#e1e5e9';
                    if (titleInput.value.trim() && promptInput.value.trim()) {
                        errorMsg.style.display = 'none';
                    }
                }
            });
            
            promptInput.addEventListener('input', () => {
                if (promptInput.value.trim()) {
                    promptInput.style.borderColor = '#e1e5e9';
                    if (titleInput.value.trim() && promptInput.value.trim()) {
                        errorMsg.style.display = 'none';
                    }
                }
            });
            
            titleInput.focus();
        }
        
        addButton.addEventListener('click', () => showOperationForm());
        
        section.appendChild(customTitle);
        section.appendChild(addButton);
        section.appendChild(operationsList);
        
        renderOperations();
        
        return section;
    }

    function showAPIKeyOverlay() {
        try {
            const existingOverlay = document.getElementById('slack-extension-api-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
                return; // Toggle behavior - close if already open
            }
            
            const overlayBackground = document.createElement('div');
            overlayBackground.id = 'slack-extension-api-overlay';
            overlayBackground.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.7) !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(3px) !important;
            `;
            
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white !important;
                border-radius: 12px !important;
                padding: 30px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
                max-width: 600px !important;
                width: 95% !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                position: relative !important;
                transform: scale(0.9) !important;
                transition: transform 0.2s ease !important;
            `;
            
            const title = document.createElement('h2');
            title.style.cssText = `
                margin: 0 0 10px 0 !important;
                font-size: 24px !important;
                font-weight: 600 !important;
                color: #1d1c1d !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            `;
            title.innerHTML = '🚀 Slack Extension - Settings';
            
            const subtitle = document.createElement('p');
            subtitle.style.cssText = `
                margin: 0 0 25px 0 !important;
                font-size: 14px !important;
                color: #616061 !important;
                line-height: 1.4 !important;
            `;
            subtitle.textContent = 'Configure your AI provider and API keys. All settings are stored securely in your browser\'s localStorage.';
            
            const providerSection = document.createElement('div');
            providerSection.style.cssText = `
                margin-bottom: 20px !important;
                padding: 15px !important;
                background: #f8f9fa !important;
                border-radius: 6px !important;
                border-left: 4px solid #007a5a !important;
            `;
            
            const providerTitle = document.createElement('div');
            providerTitle.style.cssText = `
                font-weight: 600 !important;
                color: #007a5a !important;
                margin-bottom: 10px !important;
                font-size: 14px !important;
            `;
            providerTitle.innerHTML = '🤖 AI Provider';
            
            const providerLabel = document.createElement('label');
            providerLabel.style.cssText = `
                display: block !important;
                margin-bottom: 8px !important;
                font-size: 13px !important;
                color: #616061 !important;
            `;
            providerLabel.textContent = 'Choose your AI provider:';
            
            const providerSelect = document.createElement('select');
            providerSelect.id = 'slack-extension-provider-select';
            providerSelect.style.cssText = `
                width: 100% !important;
                padding: 8px 12px !important;
                border: 2px solid #e1e5e9 !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                background: white !important;
                cursor: pointer !important;
                transition: border-color 0.2s ease !important;
                margin-bottom: 10px !important;
            `;
            
            const providers = [
                { value: 'openai', label: 'OpenAI (GPT-4)' },
                { value: 'gemini', label: 'Google Gemini' }
            ];
            
            const currentProvider = getAIProvider();
            providers.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.value;
                option.textContent = provider.label;
                if (provider.value === currentProvider) {
                    option.selected = true;
                }
                providerSelect.appendChild(option);
            });
            
            providerSelect.addEventListener('change', function() {
                const selectedProvider = providerSelect.value;
                console.log('SLACK EXTENSION: Provider changed to:', selectedProvider);
                
                if (saveAIProvider(selectedProvider)) {
                    updateStatusDisplay();
                    updateInputLabel();
                    updateApiKeyInput();
                    showStatus(`🤖 AI provider changed to ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'}`, 'success');
                } else {
                    showStatus('Failed to save AI provider preference', 'error');
                }
            });
            
            providerSection.appendChild(providerTitle);
            providerSection.appendChild(providerLabel);
            providerSection.appendChild(providerSelect);
            
            const currentOpenAIKey = getOpenAIKey();
            const currentGeminiKey = getGeminiKey();
            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = `
                margin-bottom: 20px !important;
                padding: 12px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
            `;
            
            function updateStatusDisplay() {
                const selectedProvider = providerSelect.value;
                const currentKey = selectedProvider === 'gemini' ? currentGeminiKey : currentOpenAIKey;
                const providerName = selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI';
                
                if (currentKey) {
                    statusDiv.style.background = '#d4edda';
                    statusDiv.style.color = '#155724';
                    statusDiv.style.border = '1px solid #c3e6cb';
                    statusDiv.innerHTML = `✅ ${providerName} API key is set (•••${currentKey.slice(-4)})`;
                } else {
                    statusDiv.style.background = '#f8d7da';
                    statusDiv.style.color = '#721c24';
                    statusDiv.style.border = '1px solid #f5c6cb';
                    statusDiv.innerHTML = `❌ No ${providerName} API key set`;
                }
            }
            
            updateStatusDisplay();
            
            const inputLabel = document.createElement('label');
            inputLabel.style.cssText = `
                display: block !important;
                margin-bottom: 8px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                color: #1d1c1d !important;
            `;
            
            function updateInputLabel() {
                const selectedProvider = providerSelect.value;
                inputLabel.textContent = selectedProvider === 'gemini' ? 'Gemini API Key:' : 'OpenAI API Key:';
            }
            
            updateInputLabel();
            
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = `
                display: flex !important;
                gap: 10px !important;
                margin-bottom: 15px !important;
            `;
            
            const apiKeyInput = document.createElement('input');
            apiKeyInput.id = 'slack-extension-modal-api-input';
            apiKeyInput.type = 'password';
            
            function updateApiKeyInput() {
                const selectedProvider = providerSelect.value;
                if (selectedProvider === 'gemini') {
                    apiKeyInput.placeholder = 'AIza...';
                    apiKeyInput.value = currentGeminiKey || '';
                } else {
                    apiKeyInput.placeholder = 'sk-proj-...';
                    apiKeyInput.value = currentOpenAIKey || '';
                }
            }
            
            updateApiKeyInput();
            apiKeyInput.style.cssText = `
                flex: 1 !important;
                padding: 12px 16px !important;
                border: 2px solid #e1e5e9 !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-family: Monaco, Consolas, monospace !important;
                transition: border-color 0.2s ease !important;
            `;
            
            const toggleButton = document.createElement('button');
            toggleButton.innerHTML = '👁️';
            toggleButton.style.cssText = `
                padding: 12px !important;
                background: #f1f3f4 !important;
                border: 2px solid #e1e5e9 !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 16px !important;
                transition: background-color 0.2s ease !important;
            `;
            
            toggleButton.addEventListener('click', function() {
                if (apiKeyInput.type === 'password') {
                    apiKeyInput.type = 'text';
                    toggleButton.innerHTML = '🙈';
                } else {
                    apiKeyInput.type = 'password';
                    toggleButton.innerHTML = '👁️';
                }
            });
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex !important;
                gap: 10px !important;
                margin-top: 20px !important;
            `;
            
            const saveButton = document.createElement('button');
            saveButton.textContent = '💾 Save Key';
            saveButton.style.cssText = `
                flex: 1 !important;
                padding: 12px 20px !important;
                background: #007a5a !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease !important;
            `;
            
            const clearButton = document.createElement('button');
            clearButton.textContent = '🗑️ Clear';
            clearButton.style.cssText = `
                padding: 12px 20px !important;
                background: #dc3545 !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease !important;
            `;
            
            const testButton = document.createElement('button');
            testButton.textContent = '🧪 Test';
            testButton.style.cssText = `
                padding: 12px 20px !important;
                background: #0066cc !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease !important;
            `;
            
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '✕';
            closeButton.style.cssText = `
                position: absolute !important;
                top: 15px !important;
                right: 15px !important;
                background: none !important;
                border: none !important;
                font-size: 24px !important;
                color: #868e96 !important;
                cursor: pointer !important;
                padding: 5px !important;
                width: 30px !important;
                height: 30px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                transition: all 0.2s ease !important;
            `;
            
            const statusMessage = document.createElement('div');
            statusMessage.id = 'slack-extension-modal-status';
            statusMessage.style.cssText = `
                margin-top: 15px !important;
                padding: 10px 15px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                display: none !important;
                transition: all 0.3s ease !important;
            `;
            
            const languageSection = document.createElement('div');
            languageSection.style.cssText = `
                margin-top: 20px !important;
                padding: 15px !important;
                background: #f8f9fa !important;
                border-radius: 6px !important;
                border-left: 4px solid #007a5a !important;
            `;
            
            const languageTitle = document.createElement('div');
            languageTitle.style.cssText = `
                font-weight: 600 !important;
                color: #007a5a !important;
                margin-bottom: 10px !important;
                font-size: 14px !important;
            `;
            languageTitle.innerHTML = '🌍 Summarization Language';
            
            const languages = [
                { value: 'auto', label: 'Auto (same as message)' },
                { value: 'English', label: 'English' },
                { value: 'Hebrew', label: 'Hebrew (עברית)' },
                { value: 'Spanish', label: 'Spanish (Español)' },
                { value: 'French', label: 'French (Français)' },
                { value: 'German', label: 'German (Deutsch)' },
                { value: 'Italian', label: 'Italian (Italiano)' },
                { value: 'Portuguese', label: 'Portuguese (Português)' },
                { value: 'Russian', label: 'Russian (Русский)' },
                { value: 'Chinese', label: 'Chinese (中文)' },
                { value: 'Japanese', label: 'Japanese (日本語)' },
                { value: 'Korean', label: 'Korean (한국어)' },
                { value: 'Arabic', label: 'Arabic (العربية)' },
                { value: 'Dutch', label: 'Dutch (Nederlands)' },
                { value: 'Polish', label: 'Polish (Polski)' }
            ];
            
            const languageLabel = document.createElement('label');
            languageLabel.style.cssText = `
                display: block !important;
                margin-bottom: 8px !important;
                font-size: 13px !important;
                color: #616061 !important;
            `;
            languageLabel.textContent = 'Choose the language for AI summaries:';
            
            const currentLanguageStatus = document.createElement('div');
            currentLanguageStatus.style.cssText = `
                margin-bottom: 8px !important;
                padding: 8px !important;
                background: #e3f2fd !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                color: #1565c0 !important;
                border: 1px solid #bbdefb !important;
            `;
            const currentLang = getSummarizationLanguage();
            const currentLangLabel = languages.find(l => l.value === currentLang)?.label || currentLang;
            currentLanguageStatus.innerHTML = `📋 Current setting: <strong>${currentLangLabel}</strong>`;
            

            const languageSelect = document.createElement('select');
            languageSelect.id = 'slack-extension-language-select';
            languageSelect.style.cssText = `
                width: 100% !important;
                padding: 8px 12px !important;
                border: 2px solid #e1e5e9 !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                background: white !important;
                cursor: pointer !important;
                transition: border-color 0.2s ease !important;
            `;
            
            const currentLanguage = getSummarizationLanguage();
            languages.forEach(lang => {
                const option = document.createElement('option');
                option.value = lang.value;
                option.textContent = lang.label;
                if (lang.value === currentLanguage) {
                    option.selected = true;
                }
                languageSelect.appendChild(option);
            });
            
            languageSelect.addEventListener('change', function() {
                const selectedLanguage = languageSelect.value;
                console.log('SLACK EXTENSION: Language dropdown changed to:', selectedLanguage);
                
                if (saveSummarizationLanguage(selectedLanguage)) {
                    const selectedLabel = languages.find(l => l.value === selectedLanguage)?.label;
                    showStatus(`🌍 Language preference saved: ${selectedLabel}`, 'success');
                    
                    currentLanguageStatus.innerHTML = `📋 Current setting: <strong>${selectedLabel}</strong>`;
                    
                    console.log('SLACK EXTENSION: Language saved successfully. New value:', selectedLanguage);
                } else {
                    showStatus('Failed to save language preference', 'error');
                    console.error('SLACK EXTENSION: Failed to save language preference');
                }
            });
            

            
            languageSection.appendChild(languageTitle);
            languageSection.appendChild(languageLabel);
            languageSection.appendChild(currentLanguageStatus);
            languageSection.appendChild(languageSelect);

            const instructions = document.createElement('div');
            instructions.style.cssText = `
                margin-top: 20px !important;
                padding: 15px !important;
                background: #f8f9fa !important;
                border-radius: 6px !important;
                border-left: 4px solid #007a5a !important;
            `;
            instructions.innerHTML = `
                <div style="font-weight: 600; color: #007a5a; margin-bottom: 8px;">📋 Quick Guide:</div>
                <div style="font-size: 13px; color: #616061; line-height: 1.5;">
                    • Get OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #007a5a;">OpenAI Platform</a><br>
                    • Get Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #007a5a;">Google AI Studio</a><br>
                    • Hover over any message and click the ✨ button to summarize<br>
                    • Use <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">Ctrl+Alt+A</code> to open this settings panel
                </div>
            `;
            
            function showStatus(message, type) {
                statusMessage.textContent = message;
                statusMessage.style.display = 'block';
                
                if (type === 'success') {
                    statusMessage.style.background = '#d4edda';
                    statusMessage.style.color = '#155724';
                    statusMessage.style.border = '1px solid #c3e6cb';
                } else if (type === 'error') {
                    statusMessage.style.background = '#f8d7da';
                    statusMessage.style.color = '#721c24';
                    statusMessage.style.border = '1px solid #f5c6cb';
                } else if (type === 'info') {
                    statusMessage.style.background = '#d1ecf1';
                    statusMessage.style.color = '#0c5460';
                    statusMessage.style.border = '1px solid #bee5eb';
                } else if (type === 'warning') {
                    statusMessage.style.background = '#fff3cd';
                    statusMessage.style.color = '#856404';
                    statusMessage.style.border = '1px solid #ffeaa7';
                }
                
                setTimeout(() => {
                    statusMessage.style.display = 'none';
                }, 4000);
            }
            
            saveButton.addEventListener('click', function() {
                const apiKey = apiKeyInput.value.trim();
                const selectedProvider = providerSelect.value;
                
                if (!apiKey) {
                    showStatus('Please enter an API key', 'error');
                    return;
                }
                
                if (selectedProvider === 'gemini') {
                    if (!apiKey.startsWith('AIza')) {
                        showStatus('Gemini API key should start with "AIza"', 'error');
                        return;
                    }
                } else {
                    if (!apiKey.startsWith('sk-')) {
                        showStatus('OpenAI API key should start with "sk-"', 'error');
                        return;
                    }
                }
                
                const saveSuccess = selectedProvider === 'gemini' ? 
                    saveGeminiKey(apiKey) : 
                    saveOpenAIKey(apiKey);
                
                if (saveSuccess) {
                    showStatus(`✅ ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key saved successfully!`, 'success');
                    updateStatusDisplay();
                } else {
                    showStatus('Failed to save API key', 'error');
                }
            });
            
            clearButton.addEventListener('click', function() {
                const selectedProvider = providerSelect.value;
                apiKeyInput.value = '';
                
                if (selectedProvider === 'gemini') {
                    removeGeminiKey();
                } else {
                    removeOpenAIKey();
                }
                
                showStatus(`🗑️ ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key cleared`, 'info');
                updateStatusDisplay();
            });
            
            testButton.addEventListener('click', async function() {
                const apiKey = apiKeyInput.value.trim();
                const selectedProvider = providerSelect.value;
                
                if (!apiKey) {
                    showStatus('Please enter an API key to test', 'error');
                    return;
                }
                
                testButton.textContent = '⏳ Testing...';
                testButton.disabled = true;
                
                try {
                    let response;
                    
                    if (selectedProvider === 'gemini') {
                        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: 'Say "API test successful"'
                                    }]
                                }],
                                generationConfig: {
                                    maxOutputTokens: 10
                                }
                            })
                        });
                    } else {
                        response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify({
                                model: 'gpt-4o',
                                messages: [{ role: 'user', content: 'Say "API test successful"' }],
                                max_tokens: 10
                            })
                        });
                    }
                    
                    if (response.ok) {
                        showStatus(`🎉 ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key is working correctly!`, 'success');
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        showStatus(`❌ API test failed: ${errorData.error?.message || 'Unknown error'}`, 'error');
                    }
                } catch (error) {
                    showStatus(`❌ API test failed: ${error.message}`, 'error');
                } finally {
                    testButton.textContent = '🧪 Test';
                    testButton.disabled = false;
                }
            });
            
            closeButton.addEventListener('click', function() {
                overlayBackground.remove();
            });
            
            overlayBackground.addEventListener('click', function(event) {
                if (event.target === overlayBackground) {
                    overlayBackground.remove();
                }
            });
            
            function handleKeyDown(event) {
                if (event.key === 'Escape') {
                    overlayBackground.remove();
                    document.removeEventListener('keydown', handleKeyDown);
                }
            }
            document.addEventListener('keydown', handleKeyDown);
            
            setTimeout(() => {
                apiKeyInput.focus();
                if (apiKeyInput.value) {
                    apiKeyInput.select();
                }
            }, 300);
            
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.backgroundColor = '#f1f3f4';
            });
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.backgroundColor = 'transparent';
            });
            
            [saveButton, clearButton, testButton].forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-1px)';
                    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = 'none';
                });
            });
            
            apiKeyInput.addEventListener('focus', () => {
                apiKeyInput.style.borderColor = '#007a5a';
                apiKeyInput.style.boxShadow = '0 0 0 3px rgba(0, 122, 90, 0.1)';
            });
            apiKeyInput.addEventListener('blur', () => {
                apiKeyInput.style.borderColor = '#e1e5e9';
                apiKeyInput.style.boxShadow = 'none';
            });
            
            inputContainer.appendChild(apiKeyInput);
            inputContainer.appendChild(toggleButton);
            
            buttonContainer.appendChild(saveButton);
            buttonContainer.appendChild(testButton);
            buttonContainer.appendChild(clearButton);
            
            const customOperationsSection = createCustomOperationsSection();
            
            modal.appendChild(title);
            modal.appendChild(subtitle);
            modal.appendChild(providerSection);
            modal.appendChild(statusDiv);
            modal.appendChild(inputLabel);
            modal.appendChild(inputContainer);
            modal.appendChild(buttonContainer);
            modal.appendChild(statusMessage);
            modal.appendChild(languageSection);
            modal.appendChild(instructions);
            modal.appendChild(customOperationsSection);
            modal.appendChild(closeButton);
            
            overlayBackground.appendChild(modal);
            document.body.appendChild(overlayBackground);
            
            setTimeout(() => {
                modal.style.transform = 'scale(1)';
            }, 10);
            
            return true;
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error showing API key overlay:', error);
            return false;
        }
    }

    function setupKeyboardShortcuts() {
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', (event) => {
                if (event.ctrlKey && event.altKey && (event.key === 'A' || event.key === 'a')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
                
                if (event.ctrlKey && event.shiftKey && (event.key === 'A' || event.key === 'a')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
                
                if (event.ctrlKey && event.altKey && (event.key === 'K' || event.key === 'k')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
                
                if (event.ctrlKey && event.shiftKey && (event.key === 'K' || event.key === 'k')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
            });
        }
    }

} catch (error) {
    console.error('SLACK EXTENSION: Critical error in main script:', error);
}


console.log('SLACK EXTENSION: ✅ Loaded successfully!');

setTimeout(() => {
    setupMessageActionsMonitoring();
    
    setupKeyboardShortcuts();
    
    if (!tryAddAIButton()) {
        setupComposerWatcher();
    }
    
    setupButtonMonitoring();
}, 2000);

function testLanguageStorage() {
    console.log('=== SLACK EXTENSION: Language Storage Test ===');
    
    try {
        const currentLang = getSummarizationLanguage();
        console.log('Current language:', currentLang);
        
        console.log('Testing save Hebrew...');
        const saveResult = saveSummarizationLanguage('Hebrew');
        console.log('Save result:', saveResult);
        
        const retrievedLang = getSummarizationLanguage();
        console.log('Retrieved language:', retrievedLang);
        
        const directValue = localStorage.getItem('slack_extension_summarization_language');
        console.log('Direct localStorage value:', directValue);
        
        console.log('All localStorage keys with slack_extension:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('slack_extension')) {
                console.log(`  ${key}: ${localStorage.getItem(key)}`);
            }
        }
        
        console.log('=== Language Storage Test Complete ===');
        return {
            currentLang,
            saveResult,
            retrievedLang,
            directValue,
            success: saveResult && retrievedLang === 'Hebrew'
        };
        
    } catch (error) {
        console.error('Language storage test failed:', error);
        return { success: false, error: error.message };
    }
}

if (typeof window !== 'undefined') {
    window.slackExtensionAPIKey = showAPIKeyOverlay;
    window.getSummarizationLanguage = getSummarizationLanguage;
    window.saveSummarizationLanguage = saveSummarizationLanguage;
    window.testLanguageStorage = testLanguageStorage;
} 