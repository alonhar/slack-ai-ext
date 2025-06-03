# 🚀 AI-Powered Slack Extension

A powerful Slack desktop extension that adds **AI summarization** and **message enhancement** capabilities directly to your Slack workspace using OpenAI's GPT-4.

## ✨ Features

- **🤖 AI Message Summarization**: Hover over any message and click the ✨ button to get an AI-powered summary
- **📝 AI Message Enhancement**: Click the ✨ AI button in the composer to improve your message before sending
- **🔐 Secure API Key Management**: Store your OpenAI API key securely in your browser's localStorage
- **⌨️ Keyboard Shortcuts**: Quick access to settings and features
- **🔄 Hot Reloading**: Edit the extension and restart Slack to see changes instantly

## 📋 Prerequisites

- **Slack Desktop App** installed at `/usr/lib/slack/`
- **Node.js and npm** (for the `asar` tool)
- **OpenAI API Key** from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Sudo access** (to modify Slack files)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Patch Slack (One-time Setup)
```bash
./slack_patcher.sh patch
```

### 3. Set Up Your OpenAI API Key
1. Start Slack
2. Press **`Ctrl+Alt+A`** (or `Ctrl+Shift+A`) to open API settings
3. Enter your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
4. Click **Save Key** and **Test** to verify it works

### 4. Start Using AI Features!

**Message Summarization:**
- Hover over any message 
- Click the **✨** button that appears
- Get an instant AI summary

**Message Enhancement:**
- Type your message in the composer
- Click the **✨ AI** button
- Your message will be improved automatically

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+A` | Open API Key Settings |
| `Ctrl+Shift+A` | Open API Key Settings (alternative) |
| `Ctrl+Alt+K` | Open API Key Settings (K for Key) |
| `Ctrl+Shift+K` | Open API Key Settings (alternative) |

## 🔧 Usage

### Patching Slack
```bash
./slack_patcher.sh patch
```
This will:
- Backup the original Slack app.asar
- Extract and modify it to include the AI extension
- Repack and apply the changes
- Show usage instructions

### Restoring Original Slack
```bash
./slack_patcher.sh restore
```
This will restore Slack to its original state from backup.

### Development Mode
Start Slack with developer tools for debugging:
```bash
SLACK_DEVELOPER_MENU=true slack
```

## 🛠️ Development

### Editing the Extension
1. Edit `custom_slack_ext.js`
2. Restart Slack
3. See changes immediately (no re-patching needed!)

### Extension Structure
The extension includes:
- **Message Actions Monitoring**: Detects when message action buttons appear
- **Composer Integration**: Adds AI enhancement button to message input
- **OpenAI API Integration**: Secure API calls to GPT-4
- **LocalStorage Management**: Secure API key storage
- **Keyboard Shortcuts**: Quick access to settings

## 📁 Files

- `slack_patcher.sh` - Main patcher script
- `custom_slack_ext.js` - AI extension code
- `package.json` - Node.js dependencies
- `slack_backup/` - Backup directory (created automatically)
- `README.md` - This file
- `FEATURES.md` - Detailed feature documentation

## 🔐 Security & Privacy

- **API Key Storage**: Keys are stored locally in your browser's localStorage (never sent to external servers except OpenAI)
- **OpenAI Communication**: Only your messages are sent to OpenAI for processing
- **No External Dependencies**: Extension runs entirely locally in your Slack client
- **Backup Safety**: Original Slack files are automatically backed up before modification

## 🚨 Troubleshooting

### Slack Won't Start
1. Check console output for errors
2. Restore Slack: `./slack_patcher.sh restore`
3. Check that Node.js and asar are installed: `npm install -g asar`

### AI Features Not Working
1. Verify your API key: Press `Ctrl+Alt+A` and test your key
2. Check browser console (F12) for error messages
3. Ensure you have an active internet connection
4. Verify your OpenAI account has available credits

### Extension Not Loading
1. Start Slack with: `SLACK_DEVELOPER_MENU=true slack`
2. Open DevTools (F12) and check console for errors
3. Look for "SLACK EXTENSION: ✅ Loaded successfully!" message

### Buttons Not Appearing
1. Try hovering over different messages
2. Restart Slack after ensuring the extension is loaded
3. Check if Slack's UI has changed (the extension may need updates)

## 🔍 Debugging

Enable developer mode and check console logs:
```bash
SLACK_DEVELOPER_MENU=true slack
```

Look for these messages in DevTools console:
- ✅ `SLACK EXTENSION: ✅ Loaded successfully!`
- ✅ `SLACK EXTENSION: API key exists: true`
- ❌ Any error messages starting with `SLACK EXTENSION:`

## 🤝 Contributing

Feel free to improve the extension or add new features! The extension is designed to be easily extensible.

## ⚠️ Disclaimer

This extension modifies the Slack desktop application. While it includes safety measures and backups:
- Use at your own risk
- Always backup important data
- This is not officially supported by Slack
- Extension may break with Slack updates

## 📄 License

MIT License - See LICENSE file for details 