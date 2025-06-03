// custom_slack_ext.js
// This is your custom JavaScript file that will be injected into Slack.

console.log('SLACK EXTENSION: Loading...');

// Wrapped in try-catch to prevent any startup failures
try {
    // Function to add AI summarize button to message hover actions
    function addAISummarizeButton(messageActionsContainer) {
        try {
            // Check if button already exists in this container
            if (messageActionsContainer.querySelector('.slack-ai-summarize-button')) {
                return true;
            }

            // Find the message actions group
            const actionsGroup = messageActionsContainer.querySelector('.c-message_actions__group') ||
                               messageActionsContainer.querySelector('[role="group"]') ||
                               messageActionsContainer;

            if (!actionsGroup) {
                return false;
            }

            // Create the AI summarize button
            const aiButton = document.createElement('button');
            aiButton.className = 'c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default slack-ai-summarize-button';
            aiButton.type = 'button';
            aiButton.innerHTML = '✨';
            aiButton.title = 'Summarize with AI';
            aiButton.setAttribute('aria-label', 'Summarize message with AI');
            aiButton.style.cssText = 'font-size: 16px !important;';

            // Add click handler
            aiButton.addEventListener('click', async function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                const originalText = aiButton.innerHTML;
                
                try {
                    // Find the message element
                    const messageElement = messageActionsContainer.closest('[data-qa="virtual-list-item"]') ||
                                         messageActionsContainer.closest('.c-virtual_list__item') ||
                                         messageActionsContainer.closest('[role="listitem"]') ||
                                         messageActionsContainer.closest('.c-message_kit__message');
                    
                    if (!messageElement) return;
                    
                    const messageText = extractMessageText(messageElement);
                    if (!messageText || messageText.trim().length < 10) return;
                    
                    // Set button to loading state
                    aiButton.innerHTML = '⏳';
                    aiButton.disabled = true;
                    aiButton.style.opacity = '0.6';
                    
                    try {
                        const summary = await summarizeWithOpenAI(messageText);
                        
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

    // Function to extract text from a message element
    function extractMessageText(messageElement) {
        try {
            // Try different selectors for message content
            const messageContent = messageElement.querySelector('.c-message_kit__text') ||
                                 messageElement.querySelector('[data-qa="message-text"]') ||
                                 messageElement.querySelector('.p-rich_text_section') ||
                                 messageElement.querySelector('.c-message__body') ||
                                 messageElement.querySelector('.c-message_content');
            
            if (messageContent) {
                const text = messageContent.textContent || messageContent.innerText || '';
                return text.trim();
            } else {
                // Fallback: try to get all text from the message element
                const fallbackText = messageElement.textContent || messageElement.innerText || '';
                return fallbackText.trim();
            }
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error extracting message text:', error);
            return '';
        }
    }

    // Function to summarize text using OpenAI API
    async function summarizeWithOpenAI(text) {
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
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that summarizes Slack messages. Provide a concise, clear summary that captures the key points. Use proper formatting with line breaks where appropriate. (if the message is in hebrew so write it in hebrew)'
                        },
                        {
                            role: 'user',
                            content: `Please summarize this Slack message:\n\n${text}`
                        }
                    ],
                    max_tokens: 200,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const summary = data.choices?.[0]?.message?.content?.trim();
            
            if (!summary) {
                throw new Error('No summary generated');
            }

            return summary;

        } catch (error) {
            console.error('SLACK EXTENSION: Error summarizing with OpenAI:', error);
            throw error;
        }
    }

    // Function to display summary under a message
    function displaySummaryUnderMessage(messageElement, summary) {
        try {
            // Remove any existing summary for this message
            const existingSummary = messageElement.querySelector('.slack-ai-summary');
            if (existingSummary) {
                existingSummary.remove();
            }

            // Create summary container
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

            // Add summary header with AI icon
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

            // Add the summary text with proper line break handling
            const summaryText = document.createElement('div');
            summaryText.style.cssText = `
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                line-height: 1.5 !important;
            `;
            summaryText.textContent = summary;

            // Add close button
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

            // Assemble the summary
            summaryContainer.appendChild(summaryHeader);
            summaryContainer.appendChild(summaryText);
            summaryContainer.appendChild(closeButton);

            // Insert the summary after the message
            messageElement.appendChild(summaryContainer);

            // Smooth scroll to show the summary
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

    // Function to monitor for message action containers
    function setupMessageActionsMonitoring() {
        // First, check for any existing message action containers
        function checkExistingContainers() {
            // Use the correct selector found in debugging
            const existingContainers = document.querySelectorAll('.c-message_actions__container');
            
            existingContainers.forEach((container, index) => {
                addAISummarizeButton(container);
            });
        }
        
        // Check immediately
        checkExistingContainers();
        
        // Set up polling to check periodically
        setInterval(checkExistingContainers, 2000);
        
        if (typeof MutationObserver === 'undefined') {
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if this is a message actions container (fixed selector)
                            if (node.classList && node.classList.contains('c-message_actions__container')) {
                                setTimeout(() => addAISummarizeButton(node), 100);
                            }
                            
                            // Also check for containers that might be added inside the node
                            if (node.querySelector) {
                                const actionContainers = node.querySelectorAll('.c-message_actions__container');
                                actionContainers.forEach(container => {
                                    setTimeout(() => addAISummarizeButton(container), 100);
                                });
                            }
                        }
                    });
                    
                    // Also check if any removed nodes had our buttons
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('c-message_actions__container')) {
                        }
                    });
                }
                
                // Also check for attribute changes that might show/hide containers
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('c-message_actions__container')) {
                        setTimeout(() => addAISummarizeButton(target), 100);
                    }
                }
            });
        });

        // Start observing with more comprehensive options
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Also set up hover detection on messages themselves
        setupMessageHoverDetection();
    }
    
    // Function to set up hover detection on message elements
    function setupMessageHoverDetection() {
        // Set up event delegation for hover events
        document.addEventListener('mouseenter', function(event) {
            const target = event.target;
            
            // Check if target is an element node (not text node)
            if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') {
                return;
            }
            
            // Check if we're hovering over a message or message-related element
            const messageElement = target.closest('[data-qa="virtual-list-item"]') ||
                                 target.closest('.c-virtual_list__item') ||
                                 target.closest('[role="listitem"]') ||
                                 target.closest('.c-message_kit__message');
                                 
            if (messageElement) {
                // Look for message actions that might appear on hover (multiple attempts)
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
                
                // Try immediately
                if (!checkForActions()) {
                    // Try again after small delays
                    setTimeout(checkForActions, 50);
                    setTimeout(checkForActions, 100);
                    setTimeout(checkForActions, 200);
                }
            }
        }, true); // Use capture phase
    }

    // Function to add AI button to message composer
    function addAIButton() {
        try {
            // Check if button already exists
            if (document.getElementById('slack-ai-button')) {
                return true;
            }

            // Find the composer body container
            const composerBody = document.querySelector('.p-composer__body');
            if (!composerBody) {
                return false;
            }

            // Create the AI button
            const aiButton = document.createElement('button');
            aiButton.id = 'slack-ai-button';
            aiButton.type = 'button';
            aiButton.innerHTML = '✨ AI';
            aiButton.title = 'Enhance message with AI';
            
            // Explicitly prevent any form-related behavior
            aiButton.setAttribute('type', 'button');
            aiButton.setAttribute('role', 'button');
            aiButton.setAttribute('tabindex', '0');

            // Style the button to match Slack's design
            aiButton.style.cssText = `
                background: #007a5a !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                padding: 6px 12px !important;
                margin-left: 8px !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease !important;
                z-index: 1000 !important;
                position: relative !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 4px !important;
            `;

            // Add hover effect
            aiButton.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#005c40 !important';
            });
            
            aiButton.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '#007a5a !important';
            });

            // Add click handler with OpenAI integration
            aiButton.addEventListener('click', async function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                const originalText = aiButton.innerHTML;
                const originalDisabled = aiButton.disabled;
                const originalOpacity = aiButton.style.opacity;
                
                // Function to reset button to original state
                const resetButton = () => {
                    aiButton.innerHTML = originalText;
                    aiButton.disabled = originalDisabled;
                    aiButton.style.opacity = originalOpacity || '1';
                    console.log('SLACK EXTENSION: Button reset to original state');
                };
                
                try {
                    // Find the message input
                    const messageInput = document.querySelector('[data-qa="message_input"]') || 
                                       document.querySelector('.ql-editor') ||
                                       document.querySelector('[contenteditable="true"]');
                    
                    if (!messageInput) {
                        resetButton();
                        return;
                    }
                    
                    // Extract text properly from Quill editor (preserve newlines)
                    console.log('SLACK EXTENSION: === TEXT EXTRACTION DEBUG ===');
                    console.log('SLACK EXTENSION: messageInput element:', messageInput);
                    console.log('SLACK EXTENSION: messageInput.className:', messageInput.className);
                    console.log('SLACK EXTENSION: messageInput.innerHTML:', messageInput.innerHTML);
                    console.log('SLACK EXTENSION: messageInput.childNodes.length:', messageInput.childNodes.length);
                    console.log('SLACK EXTENSION: messageInput children:', Array.from(messageInput.children).map(child => ({
                        tagName: child.tagName,
                        className: child.className,
                        textContent: child.textContent
                    })));
                    
                    let currentText = '';
                    if (messageInput.classList.contains('ql-editor') || messageInput.classList.contains('ql-container') || messageInput.querySelector('.ql-editor')) {
                        // Find the actual ql-editor element (might be messageInput itself or a child)
                        const editorElement = messageInput.classList.contains('ql-editor') ? messageInput : messageInput.querySelector('.ql-editor');
                        
                        // Quill editor: each <p> is a line, extract with newlines
                        const paragraphs = editorElement ? editorElement.querySelectorAll('p') : messageInput.querySelectorAll('p');
                        paragraphs.forEach((p, index) => {
                            console.log(`SLACK EXTENSION: Paragraph ${index}:`, p.textContent);
                        });
                        
                        if (paragraphs.length > 0) {
                            currentText = Array.from(paragraphs)
                                .map(p => p.textContent || '')
                                .filter(text => text.trim()) // Remove empty paragraphs
                                .join('\n');
                        } else {
                            currentText = messageInput.textContent || messageInput.innerText || '';
                        }
                    } else {
                        currentText = messageInput.textContent || messageInput.innerText || '';
                    }
                    
                    console.log('SLACK EXTENSION: Current message text (raw):', currentText);
                    console.log('SLACK EXTENSION: Text with newlines (escaped):', JSON.stringify(currentText));
                    
                    // Clean the text by removing "Message" and anything after it (placeholder text)
                    const cleanedText = currentText.replace(/\s*Message\s+[.](0,10)$/i, '').trim();
                    console.log('SLACK EXTENSION: Cleaned message text:', cleanedText);
                    console.log('SLACK EXTENSION: Cleaned text with newlines (escaped):', JSON.stringify(cleanedText));
                    
                    if (!cleanedText.trim()) {
                        resetButton();
                        return;
                    }
                    
                    // Set button to loading state
                    aiButton.innerHTML = '⏳ AI';
                    aiButton.disabled = true;
                    aiButton.style.opacity = '0.6';
                    console.log('SLACK EXTENSION: Button set to loading state');
                    
                    try {
                        const enhancedText = await enhanceTextWithOpenAI(cleanedText);
                        
                        if (enhancedText) {
                            console.log('SLACK EXTENSION: Replacing message content...');
                            console.log('SLACK EXTENSION: Enhanced text length:', enhancedText.length);
                            console.log('SLACK EXTENSION: Enhanced text (with escapes):', JSON.stringify(enhancedText));
                            console.log('SLACK EXTENSION: Contains newlines:', enhancedText.includes('\n'));
                            console.log('SLACK EXTENSION: Newline count:', (enhancedText.match(/\n/g) || []).length);
                            
                            console.log('SLACK EXTENSION: messageInput.tagName:', messageInput.tagName);
                            console.log('SLACK EXTENSION: messageInput.contentEditable:', messageInput.contentEditable);
                            console.log('SLACK EXTENSION: messageInput.className:', messageInput.className);
                            console.log('SLACK EXTENSION: messageInput type:', typeof messageInput.value);
                            
                            // Try multiple approaches to update the message
                            let updateSuccess = false;
                            
                            // Approach 1: Quill Editor Specific (most likely for Slack)
                            if (messageInput.classList.contains('ql-editor') || messageInput.closest('.ql-container')) {
                                try {
                                    // Try to find the Quill instance first
                                    const quillContainer = messageInput.closest('.ql-container') || messageInput.parentElement;
                                    const quillInstance = quillContainer?.__quill || window.Quill?.find(quillContainer);
                                    
                                    if (quillInstance) {
                                        console.log('SLACK EXTENSION: Found Quill instance, using setText');
                                        quillInstance.setText(enhancedText);
                                        quillInstance.setSelection(enhancedText.length); // Move cursor to end
                                        updateSuccess = true;
                                        console.log('SLACK EXTENSION: Quill setText completed');
                                    } else {
                                        console.log('SLACK EXTENSION: No Quill instance found, using select-all and typing approach');
                                        
                                        // Focus on the editor
                                        messageInput.focus();
                                        messageInput.click();
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                        
                                        // Select ALL content (works for multi-line)
                                        document.execCommand('selectAll');
                                        await new Promise(resolve => setTimeout(resolve, 50));
                                        
                                        // Delete all selected content
                                        document.execCommand('delete');
                                        await new Promise(resolve => setTimeout(resolve, 50));
                                        
                                        // Type the enhanced text character by character
                                        for (let i = 0; i < enhancedText.length; i++) {
                                            const char = enhancedText[i];
                                            
                                            // Handle newlines specially for Quill editor
                                            if (char === '\n') {
                                                // Use insertParagraph for proper line breaks in Quill
                                                document.execCommand('insertParagraph');
                                                console.log('SLACK EXTENSION: Inserted line break');
                                            } else {
                                                // Regular character insertion
                                                document.execCommand('insertText', false, char);
                                            }
                                            
                                            // Small delay every 15 characters for realism
                                            if (i % 15 === 0 && i > 0) {
                                                await new Promise(resolve => setTimeout(resolve, 5));
                                            }
                                        }
                                        
                                        updateSuccess = true;
                                        console.log('SLACK EXTENSION: Character typing completed for multi-line content');
                                    }
                                } catch (error) {
                                    console.error('SLACK EXTENSION: Quill approach failed:', error);
                                }
                            }
                            
                            // Approach 2: Simulate actual typing (character by character)
                            if (!updateSuccess) {
                                try {
                                    messageInput.focus();
                                    messageInput.click();
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    // Clear existing content
                                    document.execCommand('selectAll');
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                    document.execCommand('delete');
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                    
                                    // Type each character with realistic timing
                                    for (let i = 0; i < enhancedText.length; i++) {
                                        const char = enhancedText[i];
                                        
                                        // Use execCommand insertText for each character
                                        document.execCommand('insertText', false, char);
                                        
                                        // Add small delays to make it more realistic
                                        if (i % 10 === 0 && i > 0) {
                                            await new Promise(resolve => setTimeout(resolve, 10));
                                        }
                                    }
                                    
                                    updateSuccess = true;
                                    console.log('SLACK EXTENSION: Character typing completed');
                                } catch (error) {
                                    console.error('SLACK EXTENSION: Character typing failed:', error);
                                }
                            }
                            
                            // Approach 3: Clipboard fallback
                            if (!updateSuccess) {
                                try {
                                    messageInput.focus();
                                    messageInput.click();
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    
                                    // Copy to clipboard
                                    await navigator.clipboard.writeText(enhancedText);
                                    
                                    // Select all and paste
                                    document.execCommand('selectAll');
                                    await new Promise(resolve => setTimeout(resolve, 50));
                                    document.execCommand('paste');
                                    
                                    updateSuccess = true;
                                    console.log('SLACK EXTENSION: Clipboard approach completed');
                                } catch (error) {
                                    console.error('SLACK EXTENSION: Clipboard approach failed:', error);
                                }
                            }
                            
                            if (updateSuccess) {
                                console.log('SLACK EXTENSION: Text enhanced and replaced successfully');
                            } else {
                                console.error('SLACK EXTENSION: All update approaches failed');
                            }
                            
                            // Focus back on the message input
                            try {
                                messageInput.focus();
                                console.log('SLACK EXTENSION: Focused message input');
                            } catch (focusError) {
                                console.log('SLACK EXTENSION: Could not focus input:', focusError);
                            }
                            
                        } else {
                            console.log('SLACK EXTENSION: No enhanced text returned from OpenAI');
                        }
                        
                    } catch (apiError) {
                        console.error('SLACK EXTENSION: OpenAI API error in click handler:', apiError);
                        // Reset button on API error
                        resetButton();
                        return;
                    }
                    
                } catch (error) {
                    console.error('SLACK EXTENSION: Error in AI button click handler:', error);
                    // Reset button on any error
                    resetButton();
                    return;
                } finally {
                    // Restore button state
                    resetButton();
                }
                
                return false;
            });
            
            // Function to enhance text using OpenAI API
            async function enhanceTextWithOpenAI(text) {
                // Get API key from localStorage first, fallback to environment variable
                const apiKey = getOpenAIKey() || window.SLACK_EXTENSION_OPENAI_KEY;
                
                if (!apiKey) {
                    throw new Error('OpenAI API key not found. Please set it using Ctrl+Alt+A.');
                }
                
                const requestBody = {
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: `This is a slack message, please correct my mistakes and keep the way I wrote it but improve it(write only the text.. without any introduction)\n\n${text}`
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                };
                
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify(requestBody)
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                    
                    const data = await response.json();
                    const result = data.choices?.[0]?.message?.content?.trim();
                    
                    if (result) {
                        return result;
                    }
                    
                    throw new Error('Invalid response format from OpenAI');
                    
                } catch (error) {
                    console.error('SLACK EXTENSION: === OPENAI CALL FAILED ===');
                    console.error('SLACK EXTENSION: Error type:', error.constructor.name);
                    console.error('SLACK EXTENSION: Error message:', error.message);
                    console.error('SLACK EXTENSION: Full error:', error);
                    console.error('SLACK EXTENSION: Error stack:', error.stack);
                    throw error;
                }
            }

            // Find the best place to insert the button
            // Look for existing buttons container or action buttons
            const actionButtons = composerBody.querySelector('.p-composer__actions') ||
                                composerBody.querySelector('[data-qa="composer_buttons"]') ||
                                composerBody.querySelector('.p-composer__action_buttons') ||
                                composerBody;

            if (actionButtons) {
                // Append as the last button
                actionButtons.appendChild(aiButton);
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.error('SLACK EXTENSION: Error adding AI button:', error);
            return false;
        }
    }

    // Function to try adding banner safely
    function tryAddBanner() {
        // Check if we have the necessary APIs
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return false;
        }
        
        console.log('SLACK EXTENSION: Environment check - process.type:', typeof process !== 'undefined' ? process.type : 'undefined');
        
        // Try to add banner
        return addVisualIndicator();
    }

    // Function to try adding AI button with retries
    function tryAddAIButton() {
        if (typeof document === 'undefined') {
            return false;
        }

        return addAIButton();
    }

    // Main initialization function
    function initializeExtension() {
        console.log('SLACK EXTENSION: Initializing extension...');
        
        // Add banner
        tryAddBanner();
        
        // Debug DOM structure immediately and with delay
        console.log('SLACK EXTENSION: About to call debugDOMStructure immediately...');
        debugDOMStructure();
        
        console.log('SLACK EXTENSION: Setting up delayed debug call...');
        setTimeout(() => {
            console.log('SLACK EXTENSION: Delayed debug call executing...');
            debugDOMStructure();
        }, 3000);
        
        setTimeout(() => {
            console.log('SLACK EXTENSION: Second delayed debug call executing...');
            debugDOMStructure();
        }, 10000);
        
        // Try to add AI button immediately
        if (!tryAddAIButton()) {
            // If it fails, set up a watcher for when the composer appears
            setupComposerWatcher();
        }
        
        // Set up message actions monitoring for summarize buttons
        setupMessageActionsMonitoring();
        
        // Always set up the enhanced monitoring system
        setupButtonMonitoring();
    }

    // Function to set up a watcher for the composer
    function setupComposerWatcher() {
        let attempts = 0;
        const maxAttempts = 20;
        
        const watcherInterval = setInterval(() => {
            attempts++;
            console.log(`SLACK EXTENSION: Composer watch attempt ${attempts}/${maxAttempts}`);
            
            if (tryAddAIButton() || attempts >= maxAttempts) {
                clearInterval(watcherInterval);
                if (attempts >= maxAttempts) {
                    console.log('SLACK EXTENSION: Max attempts reached for AI button');
                }
            }
        }, 2000); // Check every 2 seconds
    }

    // Enhanced monitoring system to keep button alive
    function setupButtonMonitoring() {
        // Method 1: MutationObserver to detect DOM changes
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                let shouldCheck = false;
                
                mutations.forEach((mutation) => {
                    // Check if composer-related elements were added/removed
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
                            if (node.nodeType === 1 && node.id === 'slack-ai-button') {
                                console.log('SLACK EXTENSION: AI button was removed, will re-add');
                                shouldCheck = true;
                            }
                        });
                    }
                });
                
                if (shouldCheck) {
                    setTimeout(() => {
                        if (!document.getElementById('slack-ai-button')) {
                            tryAddAIButton();
                        }
                    }, 500); // Small delay to let DOM settle
                }
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Method 2: Polling backup (every 3 seconds)
        setInterval(() => {
            if (!document.getElementById('slack-ai-button')) {
                tryAddAIButton();
            }
        }, 3000);
        
        // Method 3: URL change detection (Slack uses pushState for navigation)
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                setTimeout(() => {
                    if (!document.getElementById('slack-ai-button')) {
                        tryAddAIButton();
                    }
                }, 1000); // Longer delay for navigation
            }
        }, 1000);
    }

    // Safe injection approach
    console.log('SLACK EXTENSION: Setting up safe injection...');
    
    // COMMENTED OUT OLD INITIALIZATION TO PREVENT CONFLICTS
    // Try immediately if DOM is ready
    // if (typeof document !== 'undefined' && document.readyState !== 'loading') {
    //     setTimeout(initializeExtension, 1000);
    // }
    
    // Listen for DOM ready
    // if (typeof document !== 'undefined') {
    //     document.addEventListener('DOMContentLoaded', () => {
    //         console.log('SLACK EXTENSION: DOMContentLoaded fired');
    //         setTimeout(initializeExtension, 1500);
    //     });
    // }
    
    // Listen for window load
    // if (typeof window !== 'undefined') {
    //     window.addEventListener('load', () => {
    //         console.log('SLACK EXTENSION: Window load fired');
    //         setTimeout(initializeExtension, 2000);
    //     });
    // }
    
    // Fallback polling (limited attempts)
    // let attempts = 0;
    // const maxAttempts = 5;
    // const pollInterval = setInterval(() => {
    //     attempts++;
    //     console.log(`SLACK EXTENSION: Poll attempt ${attempts}/${maxAttempts}`);
    //     
    //     if (tryAddBanner() || attempts >= maxAttempts) {
    //         // Also try AI button during polling
    //         tryAddAIButton();
    //         
    //         if (attempts >= maxAttempts) {
    //             clearInterval(pollInterval);
    //             // Set up the composer watcher as a final fallback
    //             setTimeout(setupComposerWatcher, 3000);
    //         }
    //     }
    // }, 5000);

    console.log('SLACK EXTENSION: Setup complete');

    // LocalStorage functions for API key management
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

    // Function to create and show API key management overlay
    function showAPIKeyOverlay() {
        try {
            // Remove existing overlay if present
            const existingOverlay = document.getElementById('slack-extension-api-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
                return; // Toggle behavior - close if already open
            }
            
            // Create overlay background
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
            
            // Create modal container
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white !important;
                border-radius: 12px !important;
                padding: 30px !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
                max-width: 500px !important;
                width: 90% !important;
                max-height: 80vh !important;
                overflow-y: auto !important;
                position: relative !important;
                transform: scale(0.9) !important;
                transition: transform 0.2s ease !important;
            `;
            
            // Title
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
            title.innerHTML = '🚀 Slack Extension - API Key Settings';
            
            // Subtitle
            const subtitle = document.createElement('p');
            subtitle.style.cssText = `
                margin: 0 0 25px 0 !important;
                font-size: 14px !important;
                color: #616061 !important;
                line-height: 1.4 !important;
            `;
            subtitle.textContent = 'Enter your OpenAI API key to enable AI-powered message summarization. Your key is stored securely in your browser\'s localStorage.';
            
            // Current status
            const currentKey = getOpenAIKey();
            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = `
                margin-bottom: 20px !important;
                padding: 12px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
            `;
            
            if (currentKey) {
                statusDiv.style.background = '#d4edda';
                statusDiv.style.color = '#155724';
                statusDiv.style.border = '1px solid #c3e6cb';
                statusDiv.innerHTML = '✅ API key is set (•••' + currentKey.slice(-4) + ')';
            } else {
                statusDiv.style.background = '#f8d7da';
                statusDiv.style.color = '#721c24';
                statusDiv.style.border = '1px solid #f5c6cb';
                statusDiv.innerHTML = '❌ No API key set';
            }
            
            // Input section
            const inputLabel = document.createElement('label');
            inputLabel.style.cssText = `
                display: block !important;
                margin-bottom: 8px !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                color: #1d1c1d !important;
            `;
            inputLabel.textContent = 'OpenAI API Key:';
            
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = `
                display: flex !important;
                gap: 10px !important;
                margin-bottom: 15px !important;
            `;
            
            // API key input
            const apiKeyInput = document.createElement('input');
            apiKeyInput.id = 'slack-extension-modal-api-input';
            apiKeyInput.type = 'password';
            apiKeyInput.placeholder = 'sk-proj-...';
            apiKeyInput.value = currentKey || '';
            apiKeyInput.style.cssText = `
                flex: 1 !important;
                padding: 12px 16px !important;
                border: 2px solid #e1e5e9 !important;
                border-radius: 6px !important;
                font-size: 14px !important;
                font-family: Monaco, Consolas, monospace !important;
                transition: border-color 0.2s ease !important;
            `;
            
            // Show/hide toggle
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
            
            // Button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex !important;
                gap: 10px !important;
                margin-top: 20px !important;
            `;
            
            // Save button
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
            
            // Clear button
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
            
            // Test button
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
            
            // Close button
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
            
            // Status message area
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
            
            // Instructions
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
                    • Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #007a5a;">OpenAI Platform</a><br>
                    • Hover over any message and click the ✨ button to summarize<br>
                    • Use <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">Ctrl+Alt+A</code> to open this settings panel
                </div>
            `;
            
            // Event handlers
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
                if (!apiKey) {
                    showStatus('Please enter an API key', 'error');
                    return;
                }
                
                if (!apiKey.startsWith('sk-')) {
                    showStatus('API key should start with "sk-"', 'error');
                    return;
                }
                
                if (saveOpenAIKey(apiKey)) {
                    showStatus('✅ API key saved successfully!', 'success');
                    // Update status display
                    statusDiv.style.background = '#d4edda';
                    statusDiv.style.color = '#155724';
                    statusDiv.innerHTML = '✅ API key is set (•••' + apiKey.slice(-4) + ')';
                } else {
                    showStatus('Failed to save API key', 'error');
                }
            });
            
            clearButton.addEventListener('click', function() {
                apiKeyInput.value = '';
                removeOpenAIKey();
                showStatus('🗑️ API key cleared', 'info');
                // Update status display
                statusDiv.style.background = '#f8d7da';
                statusDiv.style.color = '#721c24';
                statusDiv.innerHTML = '❌ No API key set';
            });
            
            testButton.addEventListener('click', async function() {
                const apiKey = apiKeyInput.value.trim();
                if (!apiKey) {
                    showStatus('Please enter an API key to test', 'error');
                    return;
                }
                
                testButton.textContent = '⏳ Testing...';
                testButton.disabled = true;
                
                try {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    
                    if (response.ok) {
                        showStatus('🎉 API key is working correctly!', 'success');
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
            
            // Close on outside click
            overlayBackground.addEventListener('click', function(event) {
                if (event.target === overlayBackground) {
                    overlayBackground.remove();
                }
            });
            
            // Close on Escape key
            function handleKeyDown(event) {
                if (event.key === 'Escape') {
                    overlayBackground.remove();
                    document.removeEventListener('keydown', handleKeyDown);
                }
            }
            document.addEventListener('keydown', handleKeyDown);
            
            // Focus input on open
            setTimeout(() => {
                apiKeyInput.focus();
                if (currentKey) {
                    apiKeyInput.select();
                }
            }, 300);
            
            // Hover effects
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
            
            // Focus effects for input
            apiKeyInput.addEventListener('focus', () => {
                apiKeyInput.style.borderColor = '#007a5a';
                apiKeyInput.style.boxShadow = '0 0 0 3px rgba(0, 122, 90, 0.1)';
            });
            apiKeyInput.addEventListener('blur', () => {
                apiKeyInput.style.borderColor = '#e1e5e9';
                apiKeyInput.style.boxShadow = 'none';
            });
            
            // Assemble the modal
            inputContainer.appendChild(apiKeyInput);
            inputContainer.appendChild(toggleButton);
            
            buttonContainer.appendChild(saveButton);
            buttonContainer.appendChild(testButton);
            buttonContainer.appendChild(clearButton);
            
            modal.appendChild(title);
            modal.appendChild(subtitle);
            modal.appendChild(statusDiv);
            modal.appendChild(inputLabel);
            modal.appendChild(inputContainer);
            modal.appendChild(buttonContainer);
            modal.appendChild(statusMessage);
            modal.appendChild(instructions);
            modal.appendChild(closeButton);
            
            overlayBackground.appendChild(modal);
            document.body.appendChild(overlayBackground);
            
            // Animate in
            setTimeout(() => {
                modal.style.transform = 'scale(1)';
            }, 10);
            
            return true;
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error showing API key overlay:', error);
            return false;
        }
    }

    // Setup keyboard shortcuts for extension features
    function setupKeyboardShortcuts() {
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', (event) => {
                // Try multiple combinations for API Key Settings
                // Ctrl+Alt+A = API Key Settings (A for AI) - Primary
                if (event.ctrlKey && event.altKey && (event.key === 'A' || event.key === 'a')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
                
                // Alternative: Ctrl+Shift+A = API Key Settings
                if (event.ctrlKey && event.shiftKey && (event.key === 'A' || event.key === 'a')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
                
                // Alternative: Ctrl+Alt+K = API Key Settings (K for Key)
                if (event.ctrlKey && event.altKey && (event.key === 'K' || event.key === 'k')) {
                    event.preventDefault();
                    showAPIKeyOverlay();
                    return;
                }
                
                // Alternative: Ctrl+Shift+K = API Key Settings
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
    // Don't re-throw to avoid breaking Slack startup
}

// ========================
// INITIALIZATION
// ========================

console.log('SLACK EXTENSION: ✅ Loaded successfully!');

// Set up all monitoring functions
setTimeout(() => {
    // Set up message action monitoring (for AI buttons)
    setupMessageActionsMonitoring();
    
    // Set up keyboard shortcuts (including API key settings)
    setupKeyboardShortcuts();
    
    // Add the composer AI enhancement button
    if (!tryAddAIButton()) {
        // If it fails initially, set up a watcher for when the composer appears
        setupComposerWatcher();
    }
    
    // Set up enhanced monitoring to keep the composer button alive
    setupButtonMonitoring();
}, 2000);

// Make API overlay available globally for manual testing
if (typeof window !== 'undefined') {
    window.slackExtensionAPIKey = showAPIKeyOverlay;
} 