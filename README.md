# 🚀 AI-Powered Slack Extension

A powerful Slack desktop extension that adds **AI summarization** and **message enhancement** capabilities directly to your Slack workspace using OpenAI's GPT-4.

*Created with ❤️ by [vibecoding](https://vibecoding.com)*

## ✨ Features

- **🤖 AI Message Summarization**: Hover over any message and click the ✨ button to get an AI-powered summary
- **📝 AI Message Enhancement**: Click the ✨ AI button in the composer to improve your message before sending
- **🔐 Secure API Key Management**: Store your OpenAI API key securely in your browser's localStorage
- **⌨️ Keyboard Shortcuts**: Quick access to settings and features
- **🌍 Cross-Platform**: Works on both Linux and macOS
![image](https://github.com/user-attachments/assets/a2a96bbb-62a3-429e-a44b-89cd3aa1c95a)

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
4. Click **Save Key** and **Test**

### 3. Start Using AI Features!

**Message Summarization:**
- Hover over any message and click the **✨** button

**Message Enhancement:**
- Type your message and click the **✨ AI** button

## ⌨️ Keyboard Shortcuts

- `Ctrl+Alt+A` - Open API Key Settings

## 🔧 Commands

### Patch Slack
```bash
./slack_patcher.sh patch
```

### Restore Original Slack
```bash
./slack_patcher.sh restore
```

## 🛠️ Development

### Making Changes
1. Edit `custom_slack_ext.js`
2. Run `./slack_patcher.sh patch`
3. Restart Slack

### Debug Mode
```bash
SLACK_DEVELOPER_MENU=true slack
```

## 📁 Project Structure

- `slack_patcher.sh` - Main patcher script (Linux & macOS)
- `custom_slack_ext.js` - AI extension code
- `slack_backup/` - Backup directory (auto-created)
- `FEATURES.md` - Detailed technical documentation

## 🔐 Security & Privacy

- API keys stored locally in browser localStorage
- Only your messages are sent to OpenAI for processing
- Original Slack files automatically backed up
- No external dependencies or tracking

## 🚨 Troubleshooting

### Slack Won't Start
```bash
./slack_patcher.sh restore
```

### AI Features Not Working
1. Press `Ctrl+Alt+A` and test your API key
2. Check DevTools console (F12) for errors
3. Verify OpenAI account has available credits

### Extension Not Loading
1. Start with debug mode: `SLACK_DEVELOPER_MENU=true slack`
2. Look for "SLACK EXTENSION: ✅ Loaded successfully!" in console

## ⚠️ Disclaimer

This extension modifies the Slack desktop application. Use at your own risk. Not officially supported by Slack.

## 📄 License

MIT License

---

*Built with AI assistance by [vibecoding](https://vibecoding.com)* 
