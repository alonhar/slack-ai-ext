// custom_slack_ext.js
// This is your custom JavaScript file that will be injected into Slack.

console.log('SLACK EXTENSION: Script started loading...');

// Wrapped in try-catch to prevent any startup failures
try {
    // Function to add our visual indicator
    function addVisualIndicator() {
        console.log('SLACK EXTENSION: Attempting to add visual indicator...');
        
        try {
            // Remove any existing banner first
            const existingBanner = document.getElementById('slack-extension-banner-main');
            if (existingBanner) {
                existingBanner.remove();
            }

            // Create a bright blue banner at the top of the page
            const banner = document.createElement('div');
            banner.innerHTML = '🚀 SLACK EXTENSION ACTIVE! 🚀';
            banner.id = 'slack-extension-banner-main';
            banner.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                background-color: #0066ff !important;
                color: #ffffff !important;
                text-align: center !important;
                padding: 10px !important;
                font-size: 16px !important;
                font-weight: bold !important;
                z-index: 9999999 !important;
                border-bottom: 3px solid #0044cc !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;
            `;
            
            // Add it to the page
            if (document.body) {
                document.body.appendChild(banner);
                console.log('SLACK EXTENSION: Banner added to body!');
                return true;
            } else if (document.documentElement) {
                document.documentElement.appendChild(banner);
                console.log('SLACK EXTENSION: Banner added to html!');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error adding visual elements:', error);
            return false;
        }
    }

    // Function to add AI summarize button to message hover actions
    function addAISummarizeButton(messageActionsContainer) {
        console.log('SLACK EXTENSION: Attempting to add AI summarize button...');
        
        try {
            // Check if button already exists in this container
            if (messageActionsContainer.querySelector('.slack-ai-summarize-button')) {
                console.log('SLACK EXTENSION: AI summarize button already exists in this container');
                return true;
            }

            // Find the message actions group (use the correct selector from debugging)
            const actionsGroup = messageActionsContainer.querySelector('.c-message_actions__group') ||
                               messageActionsContainer.querySelector('[role="group"]') ||
                               messageActionsContainer;

            if (!actionsGroup) {
                console.log('SLACK EXTENSION: Could not find actions group in container');
                return false;
            }

            console.log('SLACK EXTENSION: Found actions group, creating AI summarize button...');

            // Create the AI summarize button with the exact same classes as existing buttons
            const aiButton = document.createElement('button');
            aiButton.className = 'c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default slack-ai-summarize-button';
            aiButton.type = 'button';
            aiButton.innerHTML = '✨';
            aiButton.title = 'Summarize with AI';
            aiButton.setAttribute('aria-label', 'Summarize message with AI');
            
            // Use minimal styling since we're using the same classes as existing buttons
            aiButton.style.cssText = `
                font-size: 16px !important;
            `;

            // Add click handler with OpenAI summarization
            aiButton.addEventListener('click', async function(event) {
                console.log('SLACK EXTENSION: AI Summarize button clicked!');
                event.preventDefault();
                event.stopPropagation();
                
                // Store original button state
                const originalText = aiButton.innerHTML;
                const originalDisabled = aiButton.disabled;
                
                try {
                    // Find the message element
                    const messageElement = messageActionsContainer.closest('[data-qa="virtual-list-item"]') ||
                                         messageActionsContainer.closest('.c-virtual_list__item') ||
                                         messageActionsContainer.closest('[role="listitem"]') ||
                                         messageActionsContainer.closest('.c-message_kit__message');
                    
                    if (!messageElement) {
                        console.log('SLACK EXTENSION: Could not find parent message element');
                        return;
                    }

                    console.log('SLACK EXTENSION: Found message element:', messageElement);
                    
                    // Try to extract message text
                    const messageText = extractMessageText(messageElement);
                    console.log('SLACK EXTENSION: Extracted message text:', messageText);
                    
                    if (!messageText || messageText.trim().length < 10) {
                        console.log('SLACK EXTENSION: Message text too short to summarize');
                        return;
                    }
                    
                    // Set button to loading state
                    aiButton.innerHTML = '⏳';
                    aiButton.disabled = true;
                    aiButton.style.opacity = '0.6';
                    
                    try {
                        console.log('SLACK EXTENSION: Calling OpenAI for summarization...');
                        
                        // Call OpenAI to summarize
                        const summary = await summarizeWithOpenAI(messageText);
                        
                        if (summary) {
                            console.log('SLACK EXTENSION: Got summary from OpenAI:', summary);
                            
                            // Display the summary under the message
                            displaySummaryUnderMessage(messageElement, summary);
                            
                            // Change button to indicate success
                            aiButton.innerHTML = '✅';
                            setTimeout(() => {
                                aiButton.innerHTML = originalText;
                                aiButton.disabled = originalDisabled;
                                aiButton.style.opacity = '1';
                            }, 2000);
                            
                        } else {
                            console.log('SLACK EXTENSION: No summary returned from OpenAI');
                            throw new Error('No summary returned');
                        }
                        
                    } catch (apiError) {
                        console.error('SLACK EXTENSION: OpenAI API error:', apiError);
                        
                        // Show error state
                        aiButton.innerHTML = '❌';
                        setTimeout(() => {
                            aiButton.innerHTML = originalText;
                            aiButton.disabled = originalDisabled;
                            aiButton.style.opacity = '1';
                        }, 2000);
                    }
                    
                } catch (error) {
                    console.error('SLACK EXTENSION: Error in summarize button click handler:', error);
                    
                    // Reset button on any error
                    aiButton.innerHTML = originalText;
                    aiButton.disabled = originalDisabled;
                    aiButton.style.opacity = '1';
                }
            });

            // Add the button to the actions group
            actionsGroup.appendChild(aiButton);
            
            console.log('SLACK EXTENSION: AI summarize button added successfully!');
            return true;

        } catch (error) {
            console.error('SLACK EXTENSION: Error adding AI summarize button:', error);
            return false;
        }
    }

    // Function to extract text from a message element
    function extractMessageText(messageElement) {
        console.log('SLACK EXTENSION: Extracting text from message element...');
        
        try {
            // Try different selectors for message content
            const messageContent = messageElement.querySelector('.c-message_kit__text') ||
                                 messageElement.querySelector('[data-qa="message-text"]') ||
                                 messageElement.querySelector('.p-rich_text_section') ||
                                 messageElement.querySelector('.c-message__body') ||
                                 messageElement.querySelector('.c-message_content');
            
            if (messageContent) {
                const text = messageContent.textContent || messageContent.innerText || '';
                console.log('SLACK EXTENSION: Found message content:', text.substring(0, 100) + '...');
                return text.trim();
            } else {
                console.log('SLACK EXTENSION: Could not find message content with known selectors');
                // Fallback: try to get all text from the message element
                const fallbackText = messageElement.textContent || messageElement.innerText || '';
                console.log('SLACK EXTENSION: Fallback text:', fallbackText.substring(0, 100) + '...');
                return fallbackText.trim();
            }
            
        } catch (error) {
            console.error('SLACK EXTENSION: Error extracting message text:', error);
            return '';
        }
    }

    // Function to monitor for message action containers
    function setupMessageActionsMonitoring() {
        console.log('SLACK EXTENSION: Setting up message actions monitoring...');
        
        // First, check for any existing message action containers
        function checkExistingContainers() {
            console.log('SLACK EXTENSION: Checking for existing message action containers...');
            // Use the correct selector found in debugging
            const existingContainers = document.querySelectorAll('.c-message_actions__container');
            console.log('SLACK EXTENSION: Found', existingContainers.length, 'existing containers');
            
            existingContainers.forEach((container, index) => {
                console.log(`SLACK EXTENSION: Processing existing container ${index + 1}:`, container);
                addAISummarizeButton(container);
            });
        }
        
        // Check immediately
        checkExistingContainers();
        
        // Set up polling to check periodically
        setInterval(checkExistingContainers, 2000);
        
        if (typeof MutationObserver === 'undefined') {
            console.log('SLACK EXTENSION: MutationObserver not available, using polling only');
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if this is a message actions container (fixed selector)
                            if (node.classList && node.classList.contains('c-message_actions__container')) {
                                console.log('SLACK EXTENSION: Message actions container detected via observer:', node);
                                setTimeout(() => addAISummarizeButton(node), 100);
                            }
                            
                            // Also check for containers that might be added inside the node
                            if (node.querySelector) {
                                const actionContainers = node.querySelectorAll('.c-message_actions__container');
                                actionContainers.forEach(container => {
                                    console.log('SLACK EXTENSION: Message actions container found in subtree via observer:', container);
                                    setTimeout(() => addAISummarizeButton(container), 100);
                                });
                            }
                        }
                    });
                    
                    // Also check if any removed nodes had our buttons
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('c-message_actions__container')) {
                            console.log('SLACK EXTENSION: Message actions container removed:', node);
                        }
                    });
                }
                
                // Also check for attribute changes that might show/hide containers
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('c-message_actions__container')) {
                        console.log('SLACK EXTENSION: Message actions container attributes changed:', target);
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

        console.log('SLACK EXTENSION: Message actions monitoring active (observer + polling)');
        
        // Also set up hover detection on messages themselves
        setupMessageHoverDetection();
    }
    
    // Function to set up hover detection on message elements
    function setupMessageHoverDetection() {
        console.log('SLACK EXTENSION: Setting up message hover detection...');
        
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
                console.log('SLACK EXTENSION: Mouse entered message element:', messageElement);
                
                // Look for message actions that might appear on hover (multiple attempts)
                const checkForActions = () => {
                    const actionContainers = messageElement.querySelectorAll('.c-message_actions__container');
                    if (actionContainers.length > 0) {
                        console.log('SLACK EXTENSION: Found action containers on hover:', actionContainers.length);
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
        
        console.log('SLACK EXTENSION: Message hover detection active');
    }

    // Function to add AI button to message composer
    function addAIButton() {
        console.log('SLACK EXTENSION: Attempting to add AI button...');
        
        try {
            // Check if button already exists
            if (document.getElementById('slack-ai-button')) {
                console.log('SLACK EXTENSION: AI button already exists');
                return true;
            }

            // Find the composer body container
            const composerBody = document.querySelector('.p-composer__body');
            if (!composerBody) {
                console.log('SLACK EXTENSION: Composer body not found (.p-composer__body)');
                return false;
            }

            console.log('SLACK EXTENSION: Found composer body, adding AI button...');

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
                console.log('SLACK EXTENSION: AI button clicked!');
                
                // Prevent any default button behaviors
                event.preventDefault();
                event.stopPropagation();
                
                // Store original button state
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
                        console.log('SLACK EXTENSION: No message input found');
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
                        console.log('SLACK EXTENSION: Detected as Quill editor');
                        
                        // Find the actual ql-editor element (might be messageInput itself or a child)
                        const editorElement = messageInput.classList.contains('ql-editor') ? messageInput : messageInput.querySelector('.ql-editor');
                        console.log('SLACK EXTENSION: Editor element:', editorElement);
                        
                        // Quill editor: each <p> is a line, extract with newlines
                        const paragraphs = editorElement ? editorElement.querySelectorAll('p') : messageInput.querySelectorAll('p');
                        console.log('SLACK EXTENSION: Found paragraphs:', paragraphs.length);
                        paragraphs.forEach((p, index) => {
                            console.log(`SLACK EXTENSION: Paragraph ${index}:`, p.textContent);
                        });
                        
                        if (paragraphs.length > 0) {
                            currentText = Array.from(paragraphs)
                                .map(p => p.textContent || '')
                                .filter(text => text.trim()) // Remove empty paragraphs
                                .join('\n');
                        } else {
                            console.log('SLACK EXTENSION: No paragraphs found, using fallback');
                            currentText = messageInput.textContent || messageInput.innerText || '';
                        }
                    } else {
                        console.log('SLACK EXTENSION: Not detected as Quill editor, using regular extraction');
                        currentText = messageInput.textContent || messageInput.innerText || '';
                    }
                    
                    console.log('SLACK EXTENSION: Current message text (raw):', currentText);
                    console.log('SLACK EXTENSION: Text with newlines (escaped):', JSON.stringify(currentText));
                    
                    // Clean the text by removing "Message" and anything after it (placeholder text)
                    const cleanedText = currentText.replace(/\s*Message\s+[.](0,10)$/i, '').trim();
                    console.log('SLACK EXTENSION: Cleaned message text:', cleanedText);
                    console.log('SLACK EXTENSION: Cleaned text with newlines (escaped):', JSON.stringify(cleanedText));
                    
                    if (!cleanedText.trim()) {
                        console.log('SLACK EXTENSION: No text to enhance after cleaning');
                        resetButton();
                        return;
                    }
                    
                    // Set button to loading state
                    aiButton.innerHTML = '⏳ AI';
                    aiButton.disabled = true;
                    aiButton.style.opacity = '0.6';
                    console.log('SLACK EXTENSION: Button set to loading state');
                    
                    try {
                        console.log('SLACK EXTENSION: About to call enhanceTextWithOpenAI...');
                        
                        // Make OpenAI API call
                        const enhancedText = await enhanceTextWithOpenAI(cleanedText);
                        
                        console.log('SLACK EXTENSION: enhanceTextWithOpenAI returned:', enhancedText);
                        
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
                                console.log('SLACK EXTENSION: Detected Quill editor - using Quill-specific approach');
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
                                console.log('SLACK EXTENSION: Using character-by-character typing simulation');
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
                                console.log('SLACK EXTENSION: Using clipboard as last resort');
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
                console.log('SLACK EXTENSION: === STARTING OPENAI CALL ===');
                console.log('SLACK EXTENSION: Input text:', text);
                
                // The API key will be injected by the patcher
                const apiKey = window.SLACK_EXTENSION_OPENAI_KEY;
                console.log('SLACK EXTENSION: API key exists:', !!apiKey);
                console.log('SLACK EXTENSION: API key length:', apiKey ? apiKey.length : 0);
                
                if (!apiKey) {
                    console.error('SLACK EXTENSION: No OpenAI API key found');
                    console.log('SLACK EXTENSION: window.SLACK_EXTENSION_OPENAI_KEY value:', window.SLACK_EXTENSION_OPENAI_KEY);
                    return null;
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
                
                console.log('SLACK EXTENSION: Request body:', JSON.stringify(requestBody, null, 2));
                
                try {
                    console.log('SLACK EXTENSION: Making fetch request to OpenAI...');
                    
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: JSON.stringify(requestBody)
                    });
                    
                    console.log('SLACK EXTENSION: Fetch completed');
                    console.log('SLACK EXTENSION: Response status:', response.status);
                    console.log('SLACK EXTENSION: Response statusText:', response.statusText);
                    console.log('SLACK EXTENSION: Response headers:', response.headers);
                    
                    if (!response.ok) {
                        console.error('SLACK EXTENSION: Response not ok');
                        const errorText = await response.text();
                        console.error('SLACK EXTENSION: Error response body:', errorText);
                        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
                    }
                    
                    console.log('SLACK EXTENSION: Parsing response JSON...');
                    const data = await response.json();
                    console.log('SLACK EXTENSION: OpenAI response data:', JSON.stringify(data, null, 2));
                    
                    if (data.choices && data.choices[0] && data.choices[0].message) {
                        const result = data.choices[0].message.content.trim();
                        console.log('SLACK EXTENSION: Extracted result:', result);
                        console.log('SLACK EXTENSION: === OPENAI CALL SUCCESSFUL ===');
                        return result;
                    }
                    
                    console.error('SLACK EXTENSION: Invalid response format');
                    console.error('SLACK EXTENSION: Expected choices[0].message but got:', data);
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
                console.log('SLACK EXTENSION: AI button added successfully!');
                console.log('SLACK EXTENSION: Button parent element:', actionButtons);
                console.log('SLACK EXTENSION: Button element:', aiButton);
                console.log('SLACK EXTENSION: Button type:', aiButton.type);
                console.log('SLACK EXTENSION: Button attributes:', aiButton.attributes);
                return true;
            } else {
                console.log('SLACK EXTENSION: Could not find suitable container for AI button');
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
            console.log('SLACK EXTENSION: Missing window or document - not in renderer context');
            return false;
        }
        
        console.log('SLACK EXTENSION: Environment check - process.type:', typeof process !== 'undefined' ? process.type : 'undefined');
        
        // Try to add banner
        return addVisualIndicator();
    }

    // Function to try adding AI button with retries
    function tryAddAIButton() {
        console.log('SLACK EXTENSION: Attempting to add AI button...');
        
        if (typeof document === 'undefined') {
            console.log('SLACK EXTENSION: Document not available');
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
        console.log('SLACK EXTENSION: Setting up composer watcher...');
        
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
        console.log('SLACK EXTENSION: Setting up enhanced button monitoring...');
        
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
                    console.log('SLACK EXTENSION: DOM change detected, checking button...');
                    setTimeout(() => {
                        if (!document.getElementById('slack-ai-button')) {
                            console.log('SLACK EXTENSION: Button missing after DOM change, re-adding...');
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
            
            console.log('SLACK EXTENSION: MutationObserver set up');
        }
        
        // Method 2: Polling backup (every 3 seconds)
        setInterval(() => {
            if (!document.getElementById('slack-ai-button')) {
                console.log('SLACK EXTENSION: Button missing during poll, re-adding...');
                tryAddAIButton();
            }
        }, 3000);
        
        // Method 3: URL change detection (Slack uses pushState for navigation)
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                console.log('SLACK EXTENSION: URL changed, checking button...');
                lastUrl = window.location.href;
                setTimeout(() => {
                    if (!document.getElementById('slack-ai-button')) {
                        console.log('SLACK EXTENSION: Button missing after navigation, re-adding...');
                        tryAddAIButton();
                    }
                }, 1000); // Longer delay for navigation
            }
        }, 1000);
        
        console.log('SLACK EXTENSION: All monitoring methods activated');
    }

    // Safe injection approach
    console.log('SLACK EXTENSION: Setting up safe injection...');
    
    // Add keyboard shortcuts for visual debugging
    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+D = Visual DOM Debug
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                console.log('SLACK EXTENSION: Visual DOM debug triggered');
                visualDebugDOMStructure();
            }
            
            // Ctrl+Shift+I = Toggle Message Inspector
            if (event.ctrlKey && event.shiftKey && event.key === 'I') {
                event.preventDefault();
                console.log('SLACK EXTENSION: Message inspector toggled');
                if (typeof window.slackExtensionVisualInspect === 'function') {
                    window.slackExtensionVisualInspect();
                }
            }
        });
        
        console.log('SLACK EXTENSION: Keyboard shortcuts registered:');
        console.log('SLACK EXTENSION: Ctrl+Shift+D = Visual DOM Debug');
        console.log('SLACK EXTENSION: Ctrl+Shift+I = Toggle Message Inspector');
    }
    
    // Try immediately if DOM is ready
    if (typeof document !== 'undefined' && document.readyState !== 'loading') {
        setTimeout(initializeExtension, 1000);
    }
    
    // Listen for DOM ready
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('SLACK EXTENSION: DOMContentLoaded fired');
            setTimeout(initializeExtension, 1500);
        });
    }
    
    // Listen for window load
    if (typeof window !== 'undefined') {
        window.addEventListener('load', () => {
            console.log('SLACK EXTENSION: Window load fired');
            setTimeout(initializeExtension, 2000);
        });
    }
    
    // Fallback polling (limited attempts)
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = setInterval(() => {
        attempts++;
        console.log(`SLACK EXTENSION: Poll attempt ${attempts}/${maxAttempts}`);
        
        if (tryAddBanner() || attempts >= maxAttempts) {
            // Also try AI button during polling
            tryAddAIButton();
            
            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                // Set up the composer watcher as a final fallback
                setTimeout(setupComposerWatcher, 3000);
            }
        }
    }, 5000);

    console.log('SLACK EXTENSION: Setup complete');

    // Make debug function available globally for manual testing
    if (typeof window !== 'undefined') {
        window.slackExtensionDebug = debugDOMStructure;
        window.slackExtensionInspect = inspectMessageOnHover();
        window.slackExtensionVisualDebug = visualDebugDOMStructure;
        window.slackExtensionVisualInspect = setupVisualMessageInspector();
        console.log('SLACK EXTENSION: Manual debug available - call window.slackExtensionDebug() in console');
        console.log('SLACK EXTENSION: Message inspection available - call window.slackExtensionInspect() to toggle');
        console.log('SLACK EXTENSION: Visual debug available - Ctrl+Shift+D or window.slackExtensionVisualDebug()');
        console.log('SLACK EXTENSION: Visual inspector available - Ctrl+Shift+I or window.slackExtensionVisualInspect()');
    }

} catch (error) {
    console.error('SLACK EXTENSION: Critical error in main script:', error);
    // Don't re-throw to avoid breaking Slack startup
}

// Function to log detailed debugging information
function logEnvironmentInfo() {
    console.log('SLACK EXTENSION: === ENVIRONMENT INFO ===');
    console.log('SLACK EXTENSION: typeof window:', typeof window);
    console.log('SLACK EXTENSION: typeof document:', typeof document);
    console.log('SLACK EXTENSION: typeof process:', typeof process);
    console.log('SLACK EXTENSION: typeof require:', typeof require);
    
    if (typeof window !== 'undefined') {
        console.log('SLACK EXTENSION: window.location:', window.location ? window.location.href : 'No location');
        console.log('SLACK EXTENSION: window.navigator.userAgent:', window.navigator ? window.navigator.userAgent : 'No navigator');
    }
    
    if (typeof document !== 'undefined') {
        console.log('SLACK EXTENSION: document.title:', document.title || 'No title');
        console.log('SLACK EXTENSION: document.readyState:', document.readyState);
        console.log('SLACK EXTENSION: document.body exists:', !!document.body);
        console.log('SLACK EXTENSION: document.documentElement exists:', !!document.documentElement);
        
        if (document.body) {
            console.log('SLACK EXTENSION: document.body.children.length:', document.body.children.length);
        }
        
        // Try to find some elements
        const totalElements = document.querySelectorAll('*').length;
        console.log('SLACK EXTENSION: Total elements:', totalElements);
        
        // Look for common web app root elements
        const commonSelectors = ['#root', '#app', '#react-app', '#react-app-root', '.app', '[data-qa]', '[data-reactroot]'];
        commonSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`SLACK EXTENSION: Found element: ${selector}`);
            }
        });
    }
    
    if (typeof process !== 'undefined') {
        console.log('SLACK EXTENSION: process.type:', process.type);
        console.log('SLACK EXTENSION: process.versions.electron:', process.versions ? process.versions.electron : 'No versions');
    }


    console.log('SLACK EXTENSION: === END ENVIRONMENT INFO ===');
}

// Example: You could try to access Slack's global objects or add a simple UI element.
// Be aware that Slack's internal APIs and DOM structure can change without notice.

// (function() {
//   'use strict';
//    console.log('Slack Custom JS: Pre-DOMContentLoaded');
//    document.addEventListener('DOMContentLoaded', () => {
//        console.log('Slack Custom JS: DOMContentLoaded');
//        // Try to add a small banner or modify something simple as a test
//        try {
//            const appRoot = document.getElementById('react-app-root'); // This ID might change
//            if (appRoot) {
//                const testDiv = document.createElement('div');
//                testDiv.innerHTML = '<strong>Custom Extension Active!</strong>';
//                testDiv.style.backgroundColor = 'yellow';
//                testDiv.style.color = 'black';
//                testDiv.style.padding = '5px';
//                testDiv.style.position = 'fixed';
//                testDiv.style.top = '50px';
//                testDiv.style.right = '10px';
//                testDiv.style.zIndex = '9999';
//                appRoot.prepend(testDiv);
//                console.log('Slack Custom JS: Test div added.');
//            } else {
//                console.log('Slack Custom JS: #react-app-root not found.');
//            }
//        } catch (e) {
//            console.error('Slack Custom JS: Error during DOM manipulation:', e);
//        }
//    });
// })(); 

// Function to debug DOM structure
function debugDOMStructure() {
    console.log('SLACK EXTENSION: === DOM DEBUGGING ===');
    
    try {
        // Check for various message-related selectors
        const selectors = [
            '.c-message_actions__container',
            '[data-qa="virtual-list-item"]',
            '.c-virtual_list__item',
            '.c-message_kit__message',
            '.c-message_actions__group',
            '[role="group"]',
            '.c-button-unstyled',
            '.c-icon_button'
        ];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                console.log(`SLACK EXTENSION: Found ${elements.length} elements with selector: ${selector}`);
                
                if (elements.length > 0 && elements.length <= 5) {
                    elements.forEach((el, index) => {
                        console.log(`SLACK EXTENSION: ${selector}[${index}]:`, el);
                    });
                }
            } catch (error) {
                console.error(`SLACK EXTENSION: Error checking selector ${selector}:`, error);
            }
        });
        
        // Check for any elements that might contain "message" in their class names
        console.log('SLACK EXTENSION: Scanning for message/action related classes...');
        const allElements = document.querySelectorAll('*');
        const messageElements = [];
        const actionElements = [];
        
        let scannedCount = 0;
        allElements.forEach(el => {
            scannedCount++;
            if (el.className && typeof el.className === 'string') {
                if (el.className.includes('message')) {
                    messageElements.push(el.className);
                }
                if (el.className.includes('action')) {
                    actionElements.push(el.className);
                }
            }
        });
        
        console.log(`SLACK EXTENSION: Scanned ${scannedCount} elements`);
        
        // Get unique class names
        const uniqueMessageClasses = [...new Set(messageElements)].slice(0, 10);
        const uniqueActionClasses = [...new Set(actionElements)].slice(0, 10);
        
        console.log('SLACK EXTENSION: Sample message-related classes:', uniqueMessageClasses);
        console.log('SLACK EXTENSION: Sample action-related classes:', uniqueActionClasses);
        
    } catch (error) {
        console.error('SLACK EXTENSION: Error in debugDOMStructure:', error);
    }
    
    console.log('SLACK EXTENSION: === END DOM DEBUGGING ===');
}

// Function to manually inspect a message when you hover over it
function inspectMessageOnHover() {
    console.log('SLACK EXTENSION: Setting up manual message inspection...');
    
    let inspectionActive = false;
    
    const toggleInspection = () => {
        inspectionActive = !inspectionActive;
        console.log(`SLACK EXTENSION: Message inspection ${inspectionActive ? 'ENABLED' : 'DISABLED'}`);
        console.log('SLACK EXTENSION: Hover over a message to see its structure');
    };
    
    document.addEventListener('mouseover', function(event) {
        if (!inspectionActive) return;
        
        const target = event.target;
        if (!target || target.nodeType !== 1) return;
        
        const messageElement = target.closest('[data-qa="virtual-list-item"]') ||
                             target.closest('.c-virtual_list__item') ||
                             target.closest('[role="listitem"]');
                             
        if (messageElement) {
            console.log('SLACK EXTENSION: === MESSAGE INSPECTION ===');
            console.log('SLACK EXTENSION: Message element:', messageElement);
            console.log('SLACK EXTENSION: Message HTML:', messageElement.outerHTML.substring(0, 500) + '...');
            console.log('SLACK EXTENSION: All children:', Array.from(messageElement.children).map(child => ({
                tagName: child.tagName,
                className: child.className,
                id: child.id
            })));
            
            // Look for any action-related elements
            const actionElements = messageElement.querySelectorAll('*');
            const foundActions = [];
            actionElements.forEach(el => {
                if (el.className && typeof el.className === 'string' && el.className.includes('action')) {
                    foundActions.push({
                        element: el,
                        className: el.className,
                        tagName: el.tagName
                    });
                }
            });
            
            console.log('SLACK EXTENSION: Action elements found in message:', foundActions);
            console.log('SLACK EXTENSION: === END MESSAGE INSPECTION ===');
        }
    });
    
    return toggleInspection;
}

// Function to create visual debug overlay
function createVisualDebugOverlay() {
    console.log('SLACK EXTENSION: Creating visual debug overlay...');
    
    try {
        // Remove existing overlay
        const existing = document.getElementById('slack-extension-debug-overlay');
        if (existing) {
            existing.remove();
        }
        
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'slack-extension-debug-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 60px !important;
            right: 10px !important;
            width: 400px !important;
            max-height: 500px !important;
            background: #000000 !important;
            color: #00ff00 !important;
            border: 2px solid #00ff00 !important;
            border-radius: 8px !important;
            padding: 15px !important;
            z-index: 999999 !important;
            font-family: monospace !important;
            font-size: 11px !important;
            overflow-y: auto !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8) !important;
        `;
        
        // Add title
        const title = document.createElement('div');
        title.innerHTML = '🔍 SLACK EXTENSION DEBUG';
        title.style.cssText = `
            color: #ffff00 !important;
            font-weight: bold !important;
            margin-bottom: 10px !important;
            border-bottom: 1px solid #00ff00 !important;
            padding-bottom: 5px !important;
        `;
        overlay.appendChild(title);
        
        // Add content area
        const content = document.createElement('div');
        content.id = 'debug-content';
        overlay.appendChild(content);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute !important;
            top: 5px !important;
            right: 5px !important;
            background: #ff0000 !important;
            color: white !important;
            border: none !important;
            border-radius: 3px !important;
            width: 20px !important;
            height: 20px !important;
            font-size: 12px !important;
            cursor: pointer !important;
        `;
        closeBtn.onclick = () => overlay.remove();
        overlay.appendChild(closeBtn);
        
        document.body.appendChild(overlay);
        
        return content;
        
    } catch (error) {
        console.error('SLACK EXTENSION: Error creating debug overlay:', error);
        return null;
    }
}

// Function to add text to debug overlay
function addToDebugOverlay(text) {
    const content = document.getElementById('debug-content');
    if (content) {
        const line = document.createElement('div');
        line.style.marginBottom = '3px';
        line.textContent = text;
        content.appendChild(line);
        
        // Auto-scroll to bottom
        content.scrollTop = content.scrollHeight;
    }
}

// Visual debug version of DOM structure function
function visualDebugDOMStructure() {
    const debugContent = createVisualDebugOverlay();
    if (!debugContent) return;
    
    addToDebugOverlay('=== DOM DEBUGGING ===');
    
    try {
        // Check for various message-related selectors
        const selectors = [
            '.c-message_actions__container',
            '[data-qa="virtual-list-item"]',
            '.c-virtual_list__item',
            '.c-message_kit__message',
            '.c-message_actions__group',
            '[role="group"]',
            '.c-button-unstyled',
            '.c-icon_button'
        ];
        
        addToDebugOverlay('--- SELECTOR RESULTS ---');
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                addToDebugOverlay(`${selector}: ${elements.length} found`);
            } catch (error) {
                addToDebugOverlay(`${selector}: ERROR`);
            }
        });
        
        // Check for any elements that might contain "message" in their class names
        addToDebugOverlay('--- SCANNING CLASSES ---');
        const allElements = document.querySelectorAll('*');
        const messageElements = [];
        const actionElements = [];
        
        let scannedCount = 0;
        allElements.forEach(el => {
            scannedCount++;
            if (el.className && typeof el.className === 'string') {
                if (el.className.includes('message')) {
                    messageElements.push(el.className);
                }
                if (el.className.includes('action')) {
                    actionElements.push(el.className);
                }
            }
        });
        
        addToDebugOverlay(`Scanned ${scannedCount} elements`);
        
        // Get unique class names
        const uniqueMessageClasses = [...new Set(messageElements)].slice(0, 10);
        const uniqueActionClasses = [...new Set(actionElements)].slice(0, 10);
        
        addToDebugOverlay('--- MESSAGE CLASSES ---');
        uniqueMessageClasses.forEach(cls => addToDebugOverlay(cls));
        
        addToDebugOverlay('--- ACTION CLASSES ---');
        uniqueActionClasses.forEach(cls => addToDebugOverlay(cls));
        
    } catch (error) {
        addToDebugOverlay(`ERROR: ${error.message}`);
    }
    
    addToDebugOverlay('=== END DEBUGGING ===');
}

// Visual message inspector 
function setupVisualMessageInspector() {
    console.log('SLACK EXTENSION: Setting up visual message inspector...');
    
    let inspectionActive = false;
    let inspectorOverlay = null;
    
    const toggleInspection = () => {
        inspectionActive = !inspectionActive;
        
        if (inspectionActive) {
            // Create inspector overlay
            inspectorOverlay = createVisualDebugOverlay();
            if (inspectorOverlay) {
                addToDebugOverlay('MESSAGE INSPECTOR ACTIVE');
                addToDebugOverlay('Hover over messages to inspect...');
            }
        } else {
            // Remove inspector overlay
            const overlay = document.getElementById('slack-extension-debug-overlay');
            if (overlay) overlay.remove();
        }
    };
    
    document.addEventListener('mouseover', function(event) {
        if (!inspectionActive) return;
        
        const target = event.target;
        if (!target || target.nodeType !== 1) return;
        
        const messageElement = target.closest('[data-qa="virtual-list-item"]') ||
                             target.closest('.c-virtual_list__item') ||
                             target.closest('[role="listitem"]');
                             
        if (messageElement) {
            // Clear previous inspection
            const content = document.getElementById('debug-content');
            if (content) content.innerHTML = '';
            
            addToDebugOverlay('=== MESSAGE INSPECTION ===');
            addToDebugOverlay(`Tag: ${messageElement.tagName}`);
            addToDebugOverlay(`ID: ${messageElement.id || 'none'}`);
            addToDebugOverlay(`Classes: ${messageElement.className}`);
            
            addToDebugOverlay('--- CHILDREN ---');
            Array.from(messageElement.children).slice(0, 10).forEach((child, index) => {
                addToDebugOverlay(`${index}: ${child.tagName} .${child.className}`);
            });
            
            // Look for any action-related elements
            addToDebugOverlay('--- ACTION ELEMENTS ---');
            const actionElements = messageElement.querySelectorAll('*');
            let actionCount = 0;
            actionElements.forEach(el => {
                if (el.className && typeof el.className === 'string' && el.className.includes('action') && actionCount < 5) {
                    addToDebugOverlay(`${el.tagName}: ${el.className}`);
                    actionCount++;
                }
            });
            
            if (actionCount === 0) {
                addToDebugOverlay('No action elements found');
            }
        }
    });
    
    return toggleInspection;
}

// Function to summarize text using OpenAI API
async function summarizeWithOpenAI(text) {
    console.log('SLACK EXTENSION: === STARTING OPENAI SUMMARIZATION ===');
    console.log('SLACK EXTENSION: Input text:', text);
    
    // The API key will be injected by the patcher
    const apiKey = window.SLACK_EXTENSION_OPENAI_KEY;
    console.log('SLACK EXTENSION: API key exists:', !!apiKey);
    
    if (!apiKey) {
        console.error('SLACK EXTENSION: No OpenAI API key found');
        return null;
    }
    
    const requestBody = {
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: `Please provide a concise summary of this Slack message, if it long so provide it with some bullet points. Focus on the key points and main message:\n\n${text}`
            }
        ],
        max_tokens: 150,
        temperature: 0.3
    };
    
    console.log('SLACK EXTENSION: Request body:', JSON.stringify(requestBody, null, 2));
    
    try {
        console.log('SLACK EXTENSION: Making fetch request to OpenAI...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('SLACK EXTENSION: Fetch completed');
        console.log('SLACK EXTENSION: Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('SLACK EXTENSION: Error response body:', errorText);
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        console.log('SLACK EXTENSION: Parsing response JSON...');
        const data = await response.json();
        console.log('SLACK EXTENSION: OpenAI response data:', JSON.stringify(data, null, 2));
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const result = data.choices[0].message.content.trim();
            console.log('SLACK EXTENSION: Extracted summary:', result);
            console.log('SLACK EXTENSION: === OPENAI SUMMARIZATION SUCCESSFUL ===');
            return result;
        }
        
        console.error('SLACK EXTENSION: Invalid response format');
        throw new Error('Invalid response format from OpenAI');
        
    } catch (error) {
        console.error('SLACK EXTENSION: === OPENAI SUMMARIZATION FAILED ===');
        console.error('SLACK EXTENSION: Error:', error);
        throw error;
    }
}

// Function to display summary under a message
function displaySummaryUnderMessage(messageElement, summary) {
    console.log('SLACK EXTENSION: Displaying summary under message...');
    
    try {
        // Remove any existing summary for this message
        const existingSummary = messageElement.querySelector('.slack-ai-summary');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        // Create the summary container
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'slack-ai-summary';
        summaryContainer.style.cssText = `
            margin: 8px 0 0 0 !important;
            padding: 12px !important;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
            border: 1px solid #dee2e6 !important;
            border-radius: 8px !important;
            border-left: 4px solid #007a5a !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            color: #2c2d30 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            position: relative !important;
        `;
        
        // Add the header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex !important;
            align-items: center !important;
            margin-bottom: 6px !important;
            font-weight: 600 !important;
            color: #007a5a !important;
            font-size: 12px !important;
        `;
        header.innerHTML = '✨ AI Summary';
        
        // Add the summary text
        const summaryText = document.createElement('div');
        summaryText.style.cssText = `
            color: #2c2d30 !important;
            line-height: 1.4 !important;
            font-size: 13px !important;
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
            color: #868e96 !important;
            cursor: pointer !important;
            padding: 0 !important;
            width: 20px !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 3px !important;
            transition: background-color 0.2s ease !important;
        `;
        
        closeButton.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f1f3f4';
        });
        
        closeButton.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
        });
        
        closeButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            summaryContainer.remove();
        });
        
        // Assemble the summary
        summaryContainer.appendChild(header);
        summaryContainer.appendChild(summaryText);
        summaryContainer.appendChild(closeButton);
        
        // Find the best place to insert the summary
        // Look for the message content container
        const messageContent = messageElement.querySelector('.c-message_kit__message') ||
                             messageElement.querySelector('.c-message__body') ||
                             messageElement;
        
        if (messageContent) {
            // Insert after the message content
            messageContent.appendChild(summaryContainer);
            console.log('SLACK EXTENSION: Summary displayed successfully');
            
            // Add a subtle animation
            summaryContainer.style.opacity = '0';
            summaryContainer.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                summaryContainer.style.transition = 'all 0.3s ease';
                summaryContainer.style.opacity = '1';
                summaryContainer.style.transform = 'translateY(0)';
            }, 10);
            
        } else {
            console.log('SLACK EXTENSION: Could not find suitable place to insert summary');
        }
        
    } catch (error) {
        console.error('SLACK EXTENSION: Error displaying summary:', error);
    }
} 