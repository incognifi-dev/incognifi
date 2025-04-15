# Electron VPN Browser

A secure browser built with Electron that supports direct SOCKS proxy connections.

## Features

- Modern browser interface
- Built with Electron, React, and TypeScript
- Tailwind CSS for styling
- SOCKS proxy support (coming soon)

## Prerequisites

- Node.js 16 or higher
- pnpm

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

This will start both the Electron process and the React development server.

## Development

The project structure is organized as follows:

- `src/main` - Electron main process code
- `src/renderer` - React application code
- `dist` - Built application files

## Building

To build the application:

```bash
pnpm build
```

## License

ISC 