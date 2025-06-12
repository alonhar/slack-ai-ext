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
- **Persistent Operations**: Custom operations are automatically saved and restored between Slack sessions.

### Built-in AI Actions
The following actions are available from the AI menu:
1. **📝 Improve Writing**: The default action. Corrects grammar and improves the overall phrasing and flow of your message.
2. **🌐 Translate to English**: Translates the message text into English.
3. **🔧 Fix Spelling & Grammar**: A focused mode that only corrects objective mistakes without changing the style.
4. **👔 Make Professional**: Rewrites the message in a more formal, business-appropriate tone.
5. **😊 Make Casual**: Rewrites the message in a more friendly, informal tone.
6. **✂️ Make Shorter**: Condenses the message to be more concise and to the point.

### ⚡ Custom AI Operations

Create unlimited personalized AI operations tailored to your specific needs.

#### Creating Custom Operations
1. **Access**: Right-click the AI button or press `Ctrl+Alt+A`
2. **Navigate**: Scroll to the "Custom Operations" section
3. **Add**: Click "Add Operation" button
4. **Configure**:
   - **Title**: Give your operation a descriptive name (e.g., "Make Funny", "Technical Review")
   - **Prompt**: Write detailed instructions for the AI

#### Managing Custom Operations
- **Edit**: Click the ✏️ button to modify existing operations
- **Delete**: Click the 🗑️ button for instant removal (no confirmation required)
- **Organize**: Operations appear in the AI dropdown menu with ⚡ icons
- **Persistence**: All custom operations are automatically saved to localStorage

#### Example Custom Operations
- **Make Funny**: "Rewrite this text to be humorous and entertaining while keeping the core message"
- **Technical Review**: "Review this technical content for accuracy, clarity, and completeness"
- **Meeting Summary**: "Convert this into a structured meeting summary with key points and action items"
- **Social Media**: "Adapt this message for social media with appropriate hashtags and engaging tone"
- **Email Format**: "Rewrite this as a professional email with proper greeting and closing"

### Technical Details
- **Rich Text Handling**: Correctly extracts and replaces multi-line messages, preserving line breaks.
- **Mention-Aware**: Safely handles special elements like `@here` and `@username` mentions without breaking them.
- **Quill Integration**: Interacts directly with Slack's underlying Quill editor for reliable text manipulation.
- **Error Recovery**: Robust error handling with visual feedback for failed operations.
- **Text Cleaning**: Advanced regex processing to clean message text before sending to OpenAI API.

## 🤖 AI Message Summarization

Quickly understand long messages or threads without having to read through everything.

### How It Works
- **On-Demand Trigger**: A **✨** (Summarize) button appears when you hover over any message.
- **Inline Display**: Clicking the button calls the OpenAI API and displays a concise summary directly beneath the original message.
- **Smart Formatting**: Summaries support proper formatting with line breaks and bullet points.
- **Language Detection**: Automatically maintains the original language of the message.
- **Easy Dismissal**: The summary panel can be closed with a single click.

## 🔐 API Key Management

A secure and user-friendly interface for managing your OpenAI API key.

### Access Methods
1. **Keyboard Shortcut**: Press `Ctrl+Alt+A` to open the settings panel at any time.
2. **Right-Click**: Right-click the AI button in the message composer.

### Features
- **Secure Local Storage**: Your API key is stored only on your computer in your browser's `localStorage`.
- **Easy Input**: A standard password-style input with a show/hide toggle (👁️/🙈).
- **Visual Status**: Clear indicators showing whether a key is set with masked display (•••xxxx).
- **Integrated Management**: Combined interface for API keys and custom operations.

## 🌐 External Script Loading

The extension supports loading additional functionality from external sources.

### Features
- **HTTP Server Integration**: Automatically attempts to load scripts from `http://localhost:9966/index.js`
- **Graceful Fallback**: If external script is unavailable, the extension continues with built-in functionality
- **Error Handling**: Robust error handling for network issues or script loading failures
- **Delayed Loading**: 10-second delay after initialization to ensure Slack is fully loaded
- **Modern Fetch API**: Uses fetch() instead of script tags for better error handling

### Use Cases
- **Development Mode**: Load development versions of features during testing
- **Custom Extensions**: Add organization-specific functionality
- **Feature Toggles**: Enable/disable features based on external configuration
- **Live Updates**: Update functionality without modifying the core extension

## 🔧 Advanced Features

### Debugging & Development
- **Console Functions**: Built-in debugging functions accessible via browser console:
  - `testSlackExtensionStorage()` - Test localStorage functionality
  - `refreshSlackExtensionButton()` - Manually refresh the AI button
  - `getCustomOperations()` - Inspect stored custom operations
- **Comprehensive Logging**: Detailed console output for troubleshooting
- **Startup Diagnostics**: Automatic localStorage and DOM readiness checks
- **Request/Response Logging**: Optional logging of OpenAI API requests and responses for debugging

### User Experience Improvements
- **Non-Disruptive Validation**: Inline error messages instead of popup alerts
- **Smart Focus Management**: Automatic focus on problematic form fields
- **Real-Time Feedback**: Error states clear as users type
- **Visual Field Highlighting**: Red borders indicate required fields
- **Instant Operations**: One-click delete without confirmation dialogs

### Cross-Platform Support
- **Linux & macOS**: Full compatibility with both operating systems
- **Integrity Checking**: Automatic file integrity verification on macOS using dedicated `integrity.js` utility
- **Backup Management**: Automatic backup creation and restoration
- **Version Detection**: Smart detection of Slack installation paths
- **Checksum Updates**: Automatic updating of app.asar checksums in Info.plist files

## 🚀 Performance & Reliability

### Initialization System
- **Responsive Monitoring**: Fast 200ms polling intervals for quick button appearance
- **Multi-Stage Loading**: Multiple initialization attempts ensure reliable startup
- **DOM Monitoring**: Continuous monitoring for Slack interface changes
- **Auto-Recovery**: Automatic button recreation when Slack updates the interface
- **Smart Timing**: Replaces fixed delays with responsive monitoring

### Data Persistence
- **localStorage Integration**: Reliable storage of API keys and custom operations
- **Cross-Session Persistence**: Settings and operations survive Slack restarts
- **Error Recovery**: Graceful handling of localStorage access issues
- **Data Validation**: Automatic validation and cleanup of stored data

### AI Integration
- **OpenAI GPT-4o**: Uses the latest GPT-4o model for optimal performance
- **Streaming Support**: Efficient handling of AI responses
- **Rate Limiting**: Built-in protection against API rate limits
- **Error Handling**: Comprehensive error handling for API failures

## 🛠️ Installation & Patching

### Automated Installation
- **Shell Script**: `slack_patcher.sh` handles the complete installation process
- **Backup Creation**: Automatic backup of original Slack files before modification
- **Integrity Verification**: Calculates and updates file checksums for macOS compatibility
- **Cross-Platform**: Supports both Linux and macOS Slack installations

### File Integrity Management
- **Checksum Calculation**: Uses `@electron/asar` for accurate integrity checking
- **Automatic Updates**: Updates Info.plist files with new checksums after modification
- **Backup Restoration**: Easy restoration from backups if needed

---

For installation and setup instructions, see the main [README.md](README.md) file. 