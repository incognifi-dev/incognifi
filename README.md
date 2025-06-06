# 🛡️ IncogniFi - Privacy Hub Browser

<div align="center">

![IncogniFi Logo](src/renderer/assets/icognifi-alpha.png)

**The Ultimate Privacy-Focused Browser with Integrated Professional VPN**

[![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](package.json)
[![Electron](https://img.shields.io/badge/Electron-28.2.1-47848f.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178c6.svg)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)

[Download](#-download) • [Features](#-features) • [Development](#-development) • [Security](#-security)

</div>

---

## 🌟 What is IncogniFi?

IncogniFi is a **next-generation privacy browser** that combines professional-grade VPN services with a modern browsing experience. Built specifically for privacy-conscious users and crypto enthusiasts, it offers seamless access to global content while maintaining complete anonymity.

### 🎯 **Why IncogniFi?**

- **🌍 Professional Residential Proxies**: Powered by Oxylabs premium network spanning 100+ countries
- **⚡ Intelligent Auto-Switching**: Smart server selection and automatic failover protection  
- **📊 Crypto-Native**: Built-in bookmarks for DeFi platforms, exchanges, and blockchain explorers
- **🔒 True Privacy**: No logs, no tracking, military-grade encryption
- **🚀 Future-Ready**: Planned wallet integration, built-in DEX, and encrypted messaging

---

## ✨ Features

### 🛡️ **Premium VPN & Privacy**

| Feature | Description |
|---------|-------------|
| **Professional Residential Network** | Access to Oxylabs premium residential IP pool across 100+ countries |
| **Smart Server Selection** | Automatic selection based on latency and server health |
| **Auto-Failover Protection** | Seamless switching when servers become unavailable |
| **Real-Time Monitoring** | Live bandwidth tracking and connection statistics |
| **Zero Logs Policy** | Complete privacy with no activity logging |

### 🌐 **Advanced Browser Features**

- **🗂️ Multi-Tab Management**: Independent webview isolation for maximum security
- **📚 Smart Bookmarks**: Built-in crypto/DeFi platform shortcuts
- **📈 Real-Time Network Stats**: Monitor your bandwidth and connection quality
- **🔍 Privacy-First**: Enhanced error handling for maximum anonymity
- **⚡ Cloudflare Optimization**: Special handling for modern web security challenges

### 💎 **Crypto & DeFi Integration**

- **Pre-configured bookmarks** for major platforms:
  - 🔗 **Etherscan** - Ethereum blockchain explorer
  - 🦄 **Uniswap** - Leading decentralized exchange
  - 📊 **CoinMarketCap & CoinGecko** - Market data and analytics
  - 📈 **Dexscreener** - DeFi token tracking and analytics

### 🔮 **Coming Soon (Roadmap)**

- **🔐 Password & Key Manager**: Secure credential storage with multiple custodial options
- **💰 Non-Custodial Wallet**: Multi-chain cryptocurrency wallet integration
- **🔄 Privacy DEX**: Built-in decentralized exchange for anonymous swapping
- **💬 Encrypted Social Chat**: Private messaging with friends while browsing

---

## 📦 Download

### Latest Release (v1.5.0)

| Platform | Download | SHA256 Hash |
|----------|----------|-------------|
| **Windows (Setup)** | [IncogniFi-setup-1.5.0.exe](binaries/IncogniFi-setup-1.5.0.exe) | `15a68ab12f32655415a036491b87de7bb946f2f740f66feb8e9c777028d5f39f` |
| **Windows (Latest)** | [IncogniFi-setup-latest.exe](binaries/IncogniFi-setup-latest.exe) | `15a68ab12f32655415a036491b87de7bb946f2f740f66feb8e9c777028d5f39f` |

### Previous Versions

<details>
<summary>Click to view previous releases</summary>

| Version | Platform | SHA256 Hash |
|---------|----------|-------------|
| **v1.4.0** | [IncogniFi-setup-1.4.0.exe](binaries/IncogniFi-setup-1.4.0.exe) | `3f4222e905ab26db0d1ce566d758b5135a187cc0e3f70b8719a1ec38ee3c79e1` |
| **v1.3.0** | [IncogniFi-setup-1.3.0.exe](binaries/IncogniFi-setup-1.3.0.exe) | `c02089704c1bd8cc33d65fc4a4a9d94e81c4738de2cb2082b830edc8301d5dca` |

</details>

> **🔒 Security Note**: Always verify SHA256 hashes before installation to ensure file integrity.

---

## 🚀 Development

### Prerequisites

- **Node.js** 18+ 
- **pnpm** (recommended package manager)
- **Git**

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/incognifi-browser.git
cd incognifi-browser

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm build:win` | Build Windows executable |
| `pnpm build:mac` | Build macOS application |
| `pnpm lint` | Run ESLint code analysis |
| `pnpm test:electron` | Test built application |

### Project Structure

```
src/
├── main/                 # Electron main process
│   └── main.ts          # Application entry point
├── renderer/            # React frontend
│   ├── components/      # React components
│   ├── stores/         # Zustand state management  
│   ├── assets/         # Images and icons
│   └── flags/          # Country flag icons
└── types/              # TypeScript definitions
```

### Environment Configuration

Create a `.env` file in the project root:

```env
OXYLABS_CUSTOMER_ID=your_customer_id
OXYLABS_PASSWORD=your_password
```

> **Note**: For production builds, set these as environment variables during the build process.

---

## 🔒 Security

### Privacy Guarantees

- **🚫 No Activity Logging**: We never store or log your browsing activity
- **🔐 End-to-End Encryption**: All traffic encrypted using military-grade protocols
- **🌐 Residential IP Pool**: Blend in with regular internet users
- **💾 Local Data Only**: Bookmarks and settings stored locally on your device

### Security Features

- **Webview Isolation**: Each tab runs in an isolated security context
- **No Node Integration**: Webviews cannot access system resources
- **Content Security Policy**: Additional protection against malicious content
- **Automatic Updates**: Security patches delivered automatically

### Verification

Always verify downloads using the provided SHA256 hashes:

```bash
# Windows
certutil -hashfile IncogniFi-setup-1.5.0.exe SHA256

# macOS/Linux  
shasum -a 256 IncogniFi-setup-1.5.0.exe
```

---

## 🌍 Supported Countries

IncogniFi provides residential proxy servers in **100+ countries** including:

🇺🇸 United States • 🇬🇧 United Kingdom • 🇩🇪 Germany • 🇫🇷 France • 🇯🇵 Japan • 🇨🇦 Canada • 🇦🇺 Australia • 🇳🇱 Netherlands • 🇸🇪 Sweden • 🇨🇭 Switzerland • 🇸🇬 Singapore • 🇭🇰 Hong Kong • 🇧🇷 Brazil • 🇮🇳 India • 🇰🇷 South Korea • 🇮🇹 Italy • 🇪🇸 Spain • 🇲🇽 Mexico • 🇵🇱 Poland • 🇹🇷 Turkey

*And many more...*

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📞 Support

- **🌐 Website**: [www.incognifi.io](https://www.incognifi.io)
- **📧 Email**: [team@incognifi.io](mailto:team@incognifi.io)
- **📱 Telegram**: [t.me/incognifi](https://t.me/incognifi)
- **🐦 Twitter/X**: [x.com/incognifi](https://x.com/incognifi)
- **🐛 Issues**: [Report bugs](https://github.com/your-username/incognifi-browser/issues)

---

## 📜 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Oxylabs** for providing professional residential proxy infrastructure
- **Electron** team for the cross-platform framework
- **React** team for the UI library
- **TypeScript** team for type safety
- The open-source community for various dependencies

---

<div align="center">

**Built with ❤️ for privacy and freedom**

[⬆ Back to Top](#-incognifi---privacy-hub-browser)

</div>