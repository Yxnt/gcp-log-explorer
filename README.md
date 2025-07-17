# GCP Log Explorer (Desktop App)

A simple, cross-platform desktop application for browsing Google Cloud Platform (GCP) logs without needing to grant service account permissions or handle complex OAuth setups in a web server.

This application leverages your local `gcloud` CLI authentication, providing a secure and straightforward way to view logs from your GCP projects.

## Core Features

- **Secure Local Authentication:** Uses your existing `gcloud auth application-default login` credentials. Your private keys never leave your machine.
- **Project Selection:** Automatically lists all GCP projects you have access to.
- **Intuitive Log Viewing:** Presents logs in a clean, easy-to-read format.
- **Expandable Fields:** Allows you to expand and view long or complex log fields (like `jsonPayload`) directly in the UI.
- **Cross-Platform:** Works on both macOS and Windows.

## Architecture

This application is built using a modern stack for creating desktop applications with web technologies:

- **Electron:** The underlying framework that wraps the web application into a native desktop shell. It handles window creation, native OS integrations, and, most importantly, executing local commands like `gcloud`.
- **Next.js:** A React framework used to build the user interface. It runs inside the Electron window (as a "renderer process").
- **TypeScript:** Provides static typing for more robust and maintainable code.
- **shadcn/ui & Tailwind CSS:** Used for creating a modern, clean, and responsive user interface.
- **Google Cloud Client Libraries for Node.js:** The official libraries for interacting with GCP services like the Logging API and Cloud Resource Manager API.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Node.js:** [Download & Install Node.js](https://nodejs.org/) (LTS version is recommended).
2.  **Google Cloud CLI:** [Install the gcloud CLI](https://cloud.google.com/sdk/docs/install).

## Getting Started

### 1. Installation

First, clone the repository to your local machine:

```bash
git clone <repository-url>
cd gcp-log-explorer
```

Next, install the required `npm` dependencies:

```bash
npm install
```

### 2. First-Time Authentication

The application uses your local Google Cloud CLI credentials. To log in, simply click the "Login with Google" button inside the application. This will securely run the `gcloud auth application-default login` command for you.

Alternatively, you can run the command manually in your terminal before launching the app:

```bash
gcloud auth application-default login
```

This command will open your web browser to complete the Google authentication flow.

## Development

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the Next.js development server and launch the Electron application simultaneously. Hot-reloading is enabled for both the Electron main process and the Next.js renderer process.

## Building for Production

To build the application into a distributable executable for your platform (e.g., `.app` for macOS, `.exe` for Windows), run:

```bash
npm run build
```

This command will first build the Next.js application for production, then package it into a desktop application using `electron-builder`. The final executable will be located in the `dist` directory.

### Build Commands

- `npm run dev` - Starts development server with hot-reloading
- `npm run build` - Creates production build and packages the app
- `npm run next:build` - Builds only the Next.js application
- `npm run next:dev` - Starts only the Next.js development server
- `npm run electron:dev` - Starts only the Electron development process

### Platform-Specific Builds

The application supports builds for multiple platforms:

- **macOS**: DMG installer with support for both Intel (x64) and Apple Silicon (ARM64)
- **Windows**: NSIS installer with customizable installation directory
- **Linux**: AppImage for cross-distribution compatibility

## Project Structure

```
gcp-log-explorer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── logs/          # API route for fetching GCP logs
│   │   │   └── projects/      # API route for listing GCP projects
│   │   ├── globals.css        # Global styles with Tailwind CSS
│   │   ├── layout.tsx         # Root layout component
│   │   └── page.tsx           # Main application page
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       └── utils.ts           # Utility functions
├── main.js                    # Electron main process
├── preload.js                 # Electron preload script for secure IPC
├── package.json               # Dependencies and build configuration
└── README.md                  # This file
```

## Security

This application prioritizes security:

- **No Server-Side OAuth**: Leverages your local gcloud CLI credentials instead of requiring service account keys or complex OAuth flows
- **Secure IPC**: Uses Electron's contextIsolation and secure IPC channels
- **Local Authentication**: Your Google credentials never leave your machine
- **No Remote Data Storage**: All data processing happens locally

## Troubleshooting

### Common Issues

1. **"gcloud command not found"**
   - Ensure Google Cloud CLI is installed and available in your PATH
   - Try running `gcloud --version` in your terminal

2. **"No projects found"**
   - Verify you're authenticated: `gcloud auth list`
   - Ensure you have access to GCP projects: `gcloud projects list`

3. **"Permission denied" errors**
   - Make sure you have the necessary IAM permissions for the projects
   - Required permissions: `logging.logs.list`, `resourcemanager.projects.list`

### Development Issues

1. **Port 3000 already in use**
   - Kill any existing Next.js processes or change the port in package.json

2. **Electron app won't start**
   - Ensure all dependencies are installed: `npm install`
   - Try clearing node_modules and reinstalling

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Submit a pull request with a clear description

## License

This project is licensed under the MIT License - see the LICENSE file for details.