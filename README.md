# 🚀 AI-Powered Slack Extension

A powerful Slack desktop extension that adds **AI summarization**, **message enhancement**, and **custom AI operations** directly to your Slack workspace using OpenAI's GPT-4.

## ✨ Features

- **🤖 AI Message Summarization**: Hover over any message and click the ✨ button to get an AI-powered summary
- **📝 AI Message Enhancement**: Comprehensive dropdown menu with multiple AI-powered text improvements
- **⚡ Custom AI Operations**: Create your own custom AI prompts and operations
- **⌨️ Keyboard Shortcuts**: Quick access to settings and features
- **🌍 Cross-Platform**: Works on both Linux and macOS with automatic integrity checking

![](https://github.com/alonhar/slack-ai-ext/blob/main/output.gif)


## 📋 Prerequisites

- **Slack Desktop App** installed
- **OpenAI API Key** from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Sudo access** (to modify Slack files)

## 🚀 Quick Start

### 1. Patch Slack
```bash
./slack_patcher.sh patch
```

### 2. Set Up Your OpenAI API Key
1. Start Slack
2. Press **`Ctrl+Alt+A`** to open API settings
3. Enter your OpenAI API key
4. Click **Save Key**

### 3. Start Using AI Features!

**Message Enhancement:**
- Type your message and click the **✨ AI** button for quick improvement
- Click the **▾** dropdown for more options:
  - 📝 Improve Writing
  - 🌐 Translate to English  
  - 🔧 Fix Spelling & Grammar
  - 👔 Make Professional
  - 😊 Make Casual
  - ✂️ Make Shorter
  - ⚡ Your Custom Operations

**Message Summarization:**
- Hover over any message and click the **✨** button

**Custom Operations:**
- Right-click the AI button or press `Ctrl+Alt+A`
- Navigate to "Custom Operations" section
- Click "Add Operation" to create your own AI prompts

## ⚡ Custom AI Operations

Create personalized AI operations for your specific needs:

1. **Access Settings**: Right-click AI button or press `Ctrl+Alt+A`
2. **Add Operation**: Click "Add Operation" in the Custom Operations section
3. **Configure**: 
   - **Title**: Name your operation (e.g., "Make Funny", "Technical Review")
   - **Prompt**: Write your custom instruction for the AI
4. **Use**: Your custom operations appear in the AI dropdown menu with ⚡ icons

### Example Custom Operations:
- **Make Funny**: "Rewrite this text to be humorous and entertaining"
- **Technical Review**: "Review this technical content for accuracy and clarity"
- **Meeting Summary**: "Convert this into a structured meeting summary with action items"

## ⌨️ Keyboard Shortcuts

- `Ctrl+Alt+A` - Open API Key Settings & Custom Operations Manager

## 🔧 Commands

### Patch Slack
```bash
./slack_patcher.sh patch
```

**For macOS users with integrity checking:**
```bash
./slack_patcher-v2.sh
```

### Restore Original Slack
```bash
./slack_patcher.sh restore
```

### macOS Integrity Checking
For macOS users, `slack_patcher-v2.sh` includes automatic integrity checking to ensure Slack launches properly after modification:

```bash
# Calculate file integrity (used automatically by patcher)
node integrity.js /Applications/Slack.app/Contents/Resources/app.asar
```

The macOS patcher automatically:
- Detects your CPU architecture (ARM64/Intel)
- Calculates checksums for the modified ASAR file
- Updates Info.plist files with new checksums
- Ensures Slack's signature validation passes

**Note**: On macOS, the integrity replacement runs from `/Applications/Slack.app/Contents` and updates all files containing the old checksum.

## 🛠️ Development & Debugging

### Making Changes
1. Edit `custom_slack_ext.js`
2. Run `./slack_patcher.sh`
3. Restart Slack





## 📁 Project Structure

- `slack_patcher.sh` - Main patcher script (Linux & macOS)
- `slack_patcher-v2.sh` - macOS patcher with integrity checking
- `custom_slack_ext.js` - AI extension code
- `integrity.js` - File integrity calculation (for macOS)
- `slack_backup/` - Backup directory (auto-created)
- `FEATURES.md` - Detailed technical documentation

## 🔐 Security & Privacy

- API keys stored locally in browser localStorage
- Only your messages are sent to OpenAI for processing
- Original Slack files automatically backed up with integrity checking
- No external dependencies or tracking
- Custom operations stored locally in your browser

## 🚨 Troubleshooting

### Restore Original Slack
```bash
./slack_patcher.sh restore
```

## 🆕 Recent Updates

- **Custom AI Operations**: Create and manage your own AI prompts
- **Improved UX**: No more disruptive alert dialogs, inline error messages
- **One-Click Delete**: Remove custom operations without confirmation
- **Enhanced Debugging**: Comprehensive logging and test functions
- **Better Persistence**: Improved localStorage handling and monitoring
- **Cross-Platform Integrity**: Automatic file integrity checking on macOS

## ⚠️ Disclaimer

This extension modifies the Slack desktop application. Use at your own risk. Not officially supported by Slack.

## 📄 License

MIT License
