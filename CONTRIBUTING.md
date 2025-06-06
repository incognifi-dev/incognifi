# 🤝 Contributing to IncogniFi

Thank you for your interest in contributing to IncogniFi! We welcome contributions from developers who share our vision of creating the ultimate privacy-focused browser with integrated VPN capabilities.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Contributing Guidelines](#-contributing-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Issue Guidelines](#-issue-guidelines)
- [Coding Standards](#-coding-standards)
- [Testing](#-testing)
- [Security](#-security)
- [Community](#-community)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

### Our Pledge
- **Respect**: Treat all community members with respect and kindness
- **Inclusivity**: Welcome contributors regardless of background, experience level, or identity
- **Privacy First**: Maintain the highest standards for user privacy and security
- **Quality**: Strive for excellence in code quality and user experience

### Unacceptable Behavior
- Harassment, discrimination, or toxic behavior
- Sharing or discussing user data or privacy violations
- Malicious code or security vulnerabilities
- Spam, trolling, or off-topic discussions

---

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed
- **pnpm** package manager
- **Git** for version control
- **TypeScript** knowledge (preferred)
- **React** experience (helpful)
- **Electron** familiarity (bonus)

### First Steps

1. **⭐ Star** the repository
2. **👀 Watch** for updates
3. **🍴 Fork** the repository to your GitHub account
4. **📖 Read** through existing issues and PRs
5. **💬 Join** our community channels

---

## 🛠️ Development Setup

### 1. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/incognifi-browser.git
cd incognifi-browser
```

### 2. Add Upstream Remote

```bash
git remote add upstream https://github.com/incognifi/incognifi-browser.git
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Environment Configuration

Create a `.env` file in the project root:

```env
OXYLABS_CUSTOMER_ID=your_test_credentials
OXYLABS_PASSWORD=your_test_password
```

> **Note**: Contact the team for test credentials if needed.

### 5. Start Development Server

```bash
pnpm dev
```

### 6. Verify Setup

- ✅ Application launches without errors
- ✅ Hot reload works when editing files
- ✅ VPN dropdown loads server list
- ✅ Basic navigation functions work

---

## 📝 Contributing Guidelines

### Types of Contributions We Welcome

| Type | Description | Examples |
|------|-------------|----------|
| 🐛 **Bug Fixes** | Fix existing issues | Connection failures, UI glitches, crashes |
| ✨ **Features** | New functionality | Better error handling, UI improvements |
| 🔒 **Security** | Privacy & security improvements | Encryption, leak prevention |
| 📚 **Documentation** | Improve docs & guides | README updates, code comments |
| 🎨 **UI/UX** | Design improvements | Better layouts, animations, accessibility |
| ⚡ **Performance** | Speed & efficiency | Faster loading, memory optimization |
| 🧪 **Testing** | Add or improve tests | Unit tests, integration tests |

### Areas We're Particularly Interested In

- **Cloudflare Challenge Handling**: Improving compatibility with modern web security
- **VPN Stability**: Enhanced connection reliability and failover
- **Privacy Features**: Additional anonymity and security measures
- **Crypto Integration**: Better DeFi platform support
- **Performance**: Faster startup and smoother browsing
- **Accessibility**: Making the browser usable for everyone

---

## 🔄 Pull Request Process

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Create an issue** for major changes to discuss approach
3. **Keep PRs focused** - one feature/fix per PR
4. **Test thoroughly** before submitting

### Step-by-Step Process

#### 1. Create a Feature Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

#### 2. Make Your Changes

- Follow our [coding standards](#-coding-standards)
- Write clear, descriptive commit messages
- Add tests if applicable
- Update documentation if needed

#### 3. Test Your Changes

```bash
# Run linting
pnpm lint

# Build the application
pnpm build

# Test the built application
pnpm test:electron
```

#### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add description of your feature

- Detailed explanation of what was changed
- Why the change was necessary
- Any breaking changes or considerations"
```

#### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:

- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Screenshots** for UI changes
- **Testing instructions** for reviewers
- **Links to related issues**

### PR Template

```markdown
## 📋 Description
Brief description of changes

## 🔗 Related Issues
Fixes #123

## 🧪 Testing
- [ ] Tested on Windows
- [ ] Tested on macOS
- [ ] VPN functionality works
- [ ] No console errors
- [ ] Performance impact assessed

## 📷 Screenshots (if applicable)
[Add screenshots for UI changes]

## ✅ Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
```

---

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check latest version** - issue might be fixed
3. **Gather information** about your environment

### Issue Types

#### Bug Reports

Use the **Bug Report** template and include:

- **Environment details** (OS, version, browser)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots/videos** if applicable
- **Console logs** or error messages
- **Network conditions** (VPN on/off, server location)

#### Feature Requests

Use the **Feature Request** template and include:

- **Clear description** of the proposed feature
- **Use case** - why is this needed?
- **Mockups/wireframes** if applicable
- **Implementation considerations**
- **Alternatives considered**

#### Security Issues

**🚨 DO NOT** create public issues for security vulnerabilities!

Instead:
- Email **team@incognifi.io** with subject "Security Issue"
- Use encrypted communication if possible
- Provide detailed reproduction steps
- Allow time for responsible disclosure

---

## 💻 Coding Standards

### TypeScript/JavaScript

```typescript
// ✅ Good
interface ServerConfig {
  id: string;
  name: string;
  endpoint: string;
  port: number;
  countryCode: string;
}

const connectToServer = async (config: ServerConfig): Promise<boolean> => {
  try {
    // Implementation
    return true;
  } catch (error) {
    console.error('Connection failed:', error);
    return false;
  }
};

// ❌ Bad
const connectToServer = (config: any) => {
  // No error handling, no types
  return true;
};
```

### React Components

```tsx
// ✅ Good
interface VPNButtonProps {
  isConnected: boolean;
  onToggle: () => void;
  className?: string;
}

export const VPNButton: React.FC<VPNButtonProps> = ({
  isConnected,
  onToggle,
  className = '',
}) => {
  return (
    <button
      onClick={onToggle}
      className={`vpn-button ${isConnected ? 'connected' : 'disconnected'} ${className}`}
      aria-label={isConnected ? 'Disconnect VPN' : 'Connect VPN'}
    >
      {isConnected ? 'Disconnect' : 'Connect'}
    </button>
  );
};
```

### File Naming Conventions

```
✅ Good
components/VPNDropdown.tsx
stores/vpnStore.ts
types/server.ts
utils/networkMonitor.ts

❌ Bad
components/vpndropdown.tsx
stores/VPN_Store.ts
types/Server-Types.ts
utils/network_monitor.ts
```

### Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```bash
# ✅ Good
feat: add automatic server switching on connection failure
fix: resolve memory leak in network monitoring
docs: update installation instructions
style: improve VPN dropdown visual hierarchy
perf: optimize webview initialization

# ❌ Bad
update stuff
fix bug
changes
```

### Code Formatting

We use **Prettier** and **ESLint**:

```bash
# Format code
pnpm prettier --write .

# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint --fix
```

---

## 🧪 Testing

### Manual Testing Checklist

Before submitting any PR, test these core functions:

#### Basic Functionality
- [ ] Application starts without errors
- [ ] All tabs can be created/closed
- [ ] Navigation (back/forward/refresh) works
- [ ] Bookmarks can be added/removed
- [ ] History is recorded correctly

#### VPN Functionality
- [ ] Server list loads properly
- [ ] Can connect to different countries
- [ ] Auto-switching works on failures
- [ ] Network stats update correctly
- [ ] Proxy settings are applied

#### Privacy Features
- [ ] No DNS leaks during browsing
- [ ] IP address changes with server switch
- [ ] No data stored in webview cache
- [ ] Error handling doesn't expose user data

### Performance Testing

- **Memory Usage**: Monitor for memory leaks during extended use
- **Startup Time**: Application should start within 3-5 seconds
- **Connection Speed**: VPN connection should establish within 10 seconds
- **UI Responsiveness**: Interface should remain responsive during operations

### Automated Testing

We're working on expanding our test suite. Help us by:

- Adding unit tests for utility functions
- Creating integration tests for VPN operations
- Writing E2E tests for critical user flows

---

## 🔒 Security

### Security Considerations

When contributing, always consider:

- **User Privacy**: Never log or expose user browsing data
- **Credential Security**: Keep proxy credentials encrypted and secure
- **Network Safety**: Prevent DNS leaks and connection exposures
- **Code Injection**: Sanitize any user inputs or external data
- **Update Security**: Ensure dependencies are up to date

### Security Review Process

All security-related changes undergo additional review:

1. **Code Review**: Standard review by maintainers
2. **Security Audit**: Additional security-focused review
3. **Testing**: Extensive testing in isolated environment
4. **Documentation**: Security implications documented

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **Email** team@incognifi.io immediately
3. **Include** detailed reproduction steps
4. **Wait** for acknowledgment before disclosure
5. **Coordinate** responsible disclosure timeline

---

## 🌟 Recognition

### Contributor Recognition

We believe in recognizing our contributors:

- **Contributors List**: Your name in our AUTHORS file
- **Release Notes**: Significant contributions mentioned in releases
- **Special Thanks**: Outstanding contributors featured on our website
- **Early Access**: Active contributors get early access to new features

### Contribution Levels

| Level | Criteria | Benefits |
|-------|----------|----------|
| **Contributor** | First merged PR | Name in AUTHORS file |
| **Regular Contributor** | 5+ merged PRs | Recognition in release notes |
| **Core Contributor** | 15+ PRs + consistent quality | Early access to features |
| **Maintainer** | Invited by team | Commit access + decision making |

---

## 💬 Community

### Getting Help

- **💬 Telegram**: [t.me/incognifi](https://t.me/incognifi) - Quick questions and community chat
- **📧 Email**: [team@incognifi.io](mailto:team@incognifi.io) - Technical discussions
- **🐛 Issues**: GitHub Issues - Bug reports and feature requests
- **🐦 Twitter**: [x.com/incognifi](https://x.com/incognifi) - Updates and announcements

### Discussion Topics

Great topics for community discussion:

- **Architecture decisions** for new features
- **Privacy best practices** and improvements
- **User experience** feedback and suggestions
- **Performance optimization** strategies
- **Integration ideas** for crypto/DeFi platforms

### Community Events

- **Monthly Contributor Calls**: Discuss roadmap and priorities
- **Code Review Sessions**: Learn from experienced contributors
- **Feature Planning**: Help shape the future of IncogniFi
- **Security Workshops**: Learn about privacy and security best practices

---

## 📚 Additional Resources

### Useful Links

- **Main Repository**: [github.com/incognifi/incognifi-browser](https://github.com/incognifi/incognifi-browser)
- **Website**: [www.incognifi.io](https://www.incognifi.io)
- **Electron Docs**: [electronjs.org/docs](https://electronjs.org/docs)
- **React Docs**: [react.dev](https://react.dev)
- **TypeScript Handbook**: [typescriptlang.org/docs](https://typescriptlang.org/docs)

### Learning Resources

- **Electron Security**: [electronjs.org/docs/tutorial/security](https://electronjs.org/docs/tutorial/security)
- **VPN Protocols**: Understanding SOCKS and HTTP proxies
- **Privacy Best Practices**: OWASP privacy guidelines
- **React Performance**: Optimization techniques

---

## 🙏 Thank You

Thank you for considering contributing to IncogniFi! Every contribution, no matter how small, helps us build a better, more private internet for everyone.

Your efforts help protect user privacy, enhance security, and create innovative tools for the decentralized web. Together, we're building the future of private browsing.

---

<div align="center">

**Questions? Reach out to us:**

[🌐 Website](https://www.incognifi.io) • [📧 Email](mailto:team@incognifi.io) • [📱 Telegram](https://t.me/incognifi) • [🐦 Twitter](https://x.com/incognifi)

**Happy Coding! 🚀**

</div>