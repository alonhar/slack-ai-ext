# Slack AI Extension - Features

This document outlines the key features of the AI-powered Slack extension.

## 📝 AI Composer Tools

A powerful, multi-function AI button is seamlessly integrated into the Slack message composer.

### User Experience
- **Segmented Button**: The button is split into two parts for efficiency.
  - **Quick Action**: Clicking the main **✨ AI** part of the button instantly runs the "Improve Writing" action on your current message.
  - **Full Menu**: Clicking the **▾** arrow opens a dropdown menu with a full suite of AI tools.
- **Right-Click for Settings**: Right-clicking anywhere on the button opens the API Key configuration panel.
- **Visual Feedback**: The button displays intuitive icons (⏳, ✅, ❌) to show the status of the AI action.

### AI-Powered Actions
The following actions are available from the AI menu:
1.  **Improve Writing**: The default action. Corrects grammar and improves the overall phrasing and flow of your message.
2.  **Translate to English**: Translates the message text into English.
3.  **Fix Spelling & Grammar**: A focused mode that only corrects objective mistakes without changing the style.
4.  **Make Professional**: Rewrites the message in a more formal, business-appropriate tone.
5.  **Make Casual**: Rewrites the message in a more friendly, informal tone.
6.  **Make Shorter**: Condenses the message to be more concise and to the point.

### Technical Details
- **Rich Text Handling**: Correctly extracts and replaces multi-line messages, preserving line breaks.
- **Mention-Aware**: Safely handles special elements like `@here` and `@username` mentions without breaking them.
- **Quill Integration**: Interacts directly with Slack's underlying Quill editor for reliable text manipulation.

## 🤖 AI Message Summarization

Quickly understand long messages or threads without having to read through everything.

### How It Works
- **On-Demand Trigger**: A **✨** (Summarize) button appears when you hover over any message.
- **Inline Display**: Clicking the button calls the OpenAI API and displays a concise summary directly beneath the original message.
- **Easy Dismissal**: The summary panel can be closed with a single click.

## 🔐 API Key Management

A secure and user-friendly interface for managing your OpenAI API key.

### Access Methods
1.  **Keyboard Shortcut**: Press `Ctrl+Alt+A` (or `Ctrl+Shift+A`) to open the settings panel at any time.
2.  **Right-Click**: Right-click the AI button in the message composer.

### Features
- **Secure Local Storage**: Your API key is stored only on your computer in your browser's `localStorage`.
- **Easy Input**: A standard password-style input with a show/hide toggle.
- **API Key Testing**: A "Test" button to verify that your key is working correctly with the OpenAI API.
- **Clear Status**: The panel always shows whether a key is set and displays the last 4 characters for easy identification.

---
For installation and setup instructions, see the main [README.md](README.md) file. 