# GCP Log Explorer

A powerful desktop application for exploring and analyzing Google Cloud Platform (GCP) logs with a modern, intuitive interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-1.23.0-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## 🚀 Features

### **Core Functionality**
- 🔍 **Real-time Log Streaming** - Live log updates with auto-refresh every 5 seconds
- 📱 **Cross-platform Desktop App** - Runs natively on Windows, macOS, and Linux
- 🎯 **Advanced Filtering** - Filter by time range, resource type, severity, and custom queries
- 🔐 **Dual Authentication** - Support for both gcloud CLI and direct access token authentication
- 📊 **Smart Resource Discovery** - Automatically discovers available GCP resources from log data
- 🎨 **Professional UI** - Modern, responsive interface built with React and Tailwind CSS

### **Advanced Log Analysis**
- 📋 **JSON Payload Viewer** - Sophisticated JSON viewer with syntax highlighting and collapsible sections
- 🔍 **Full-text Search** - Search across all log fields including JSON payload content
- 📄 **Pagination** - Efficient pagination with configurable page sizes (10, 30, 50, 100 logs per page)
- 📋 **One-click Copy** - Copy individual fields or entire JSON objects to clipboard
- ⏸️ **Cancellable Operations** - Cancel long-running log fetch operations
- 🏷️ **Resource-specific Filtering** - Drill down to specific resource instances

### **Supported GCP Resources**
- **Compute Engine** - GCE instances and VM logs
- **Kubernetes** - Container and pod logs from GKE clusters
- **Cloud Functions** - Serverless function execution logs
- **App Engine** - GAE application logs with service and version filtering
- **Cloud Run** - Container service logs
- **Cloud SQL** - Database operation logs
- **Pub/Sub** - Topic and subscription logs

## 🏗️ Architecture

This application uses **Wails v2** to combine:
- **Go Backend** - Handles GCP API integration, authentication, and log processing
- **React Frontend** - Modern TypeScript-based UI with Next.js and Tailwind CSS

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │◄──►│   Wails Bridge   │◄──►│   Go Backend    │
│                 │    │                  │    │                 │
│ • Components    │    │ • IPC Calls      │    │ • GCP APIs      │
│ • State Mgmt    │    │ • Type Safety    │    │ • Auth Handler  │
│ • UI/UX         │    │ • Event System   │    │ • Log Parser    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### **Required Software**
- **Go 1.23.0+** - For building the backend
- **Node.js 18+** - For the frontend build process
- **Wails CLI** - For application compilation

### **Google Cloud Setup**
- **GCP Project** with Cloud Logging API enabled
- **Authentication** via one of:
  - Google Cloud CLI (`gcloud`) installed and authenticated
  - Valid GCP access token

## 🛠️ Installation & Setup

### **1. Clone Repository**
```bash
git clone https://github.com/Yxnt/gcp-log-explorer.git
cd gcp-log-explorer
```

### **2. Install Dependencies**

**Install Go dependencies:**
```bash
go mod download
```

**Install Node.js dependencies:**
```bash
cd frontend
npm install
cd ..
```

### **3. Install Wails CLI**
```bash
# Windows
./scripts/install-wails-cli.bat

# macOS/Linux
chmod +x ./scripts/install-wails-cli.sh
./scripts/install-wails-cli.sh
```

### **4. Build Application**

**Development build:**
```bash
wails build -debug
```

**Production build:**
```bash
# Windows
./scripts/build-windows.bat

# macOS (Intel)
./scripts/build-macos-intel.sh

# macOS (Apple Silicon)
./scripts/build-macos-arm.sh

# Generic build
./scripts/build.sh
```

### **5. Authentication Setup**

**Option A: Google Cloud CLI (Recommended)**
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

**Option B: Access Token**
```bash
# Get access token
gcloud auth print-access-token

# Use token in the application's token authentication tab
```

## 🚀 Usage

### **Getting Started**
1. **Launch** the application
2. **Authenticate** using either gcloud CLI or access token
3. **Select Project** from your available GCP projects
4. **Choose Resource Type** (e.g., GCE instances, Kubernetes containers)
5. **Select Time Range** (preset ranges or custom date/time)
6. **Fetch Logs** to start exploring

### **Key Interface Elements**

**Authentication Panel:**
- Choose between gcloud CLI or manual token input
- Automatic authentication status checking
- User information display

**Control Panel:**
- **Project Selector** - Search and select from available projects
- **Resource Type** - Choose resource type to monitor
- **Specific Resource** - Optional filtering to specific instances
- **Time Range** - Flexible time range selection
- **Filters** - JSON-only logs and custom filters

**Log Display:**
- **Real-time Updates** - Auto-refresh indicator and controls
- **Search** - Full-text search across all log fields
- **JSON Viewer** - Expandable JSON with copy functionality
- **Pagination** - Navigate through large log sets

### **Advanced Features**

**Real-time Monitoring:**
```bash
# The application automatically:
1. Fetches initial log batch
2. Enables auto-refresh if more logs are available
3. Continuously polls for new logs every 5 seconds
4. Provides cancellation controls for long operations
```

**Search Capabilities:**
- Search across log messages, JSON payloads, and metadata
- Case-insensitive matching
- Real-time results filtering
- Search result highlighting

**JSON Analysis:**
- Automatic JSON detection and parsing
- Collapsible nested structures
- Type-aware syntax highlighting
- One-click copying of values and objects

## 🏃‍♂️ Development

### **Project Structure**
```
gcp-log-explorer-wails-nextjs/
├── app.go                 # Main Go application logic
├── main.go                # Wails application entry point
├── go.mod                 # Go dependencies
├── wails.json             # Wails configuration
├── frontend/              # React frontend
│   ├── components/        # React components
│   ├── pages/            # Next.js pages
│   ├── public/           # Static assets
│   ├── styles/           # CSS and styling
│   └── wailsjs/          # Generated Wails bindings
├── scripts/              # Build scripts
└── build/                # Compiled binaries
```

### **Development Workflow**

**Start development server:**
```bash
wails dev
```

**Run frontend only:**
```bash
cd frontend
npm run dev
```

**Build for production:**
```bash
wails build
```

### **Key Components**

**Backend (`app.go`):**
- `GetProjects()` - Retrieve available GCP projects
- `GetResources()` - Discover available resource types
- `GetLogs()` - Fetch and parse log entries
- `CheckGcloudAuth()` - Verify authentication status
- Advanced JSON payload parsing with escape handling

**Frontend Components:**
- `LoginPage` - Authentication interface
- `ProjectSelector` - Project selection with search
- `ResourceTypeSelector` - Resource type management
- `TimeRangeSelector` - Flexible time range picker
- `JsonViewer` - Advanced JSON display component

## 🐛 Troubleshooting

### **Common Issues**

**Authentication Problems:**
```bash
# Check gcloud authentication
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Verify project access
gcloud projects list
```

**Build Issues:**
```bash
# Clean and rebuild
rm -rf build/
rm -rf frontend/node_modules/
rm -rf frontend/out/

# Reinstall dependencies
cd frontend && npm install && cd ..
go mod download

# Rebuild
wails build
```

**Log Access Issues:**
- Ensure Cloud Logging API is enabled for your project
- Verify IAM permissions for log viewing
- Check if the selected resource type exists in your project

### **Performance Tips**
- Use specific resource filtering to reduce log volume
- Adjust time ranges for better performance
- Use JSON-only filter when analyzing structured logs
- Cancel operations if they're taking too long

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow Go best practices and conventions
- Use TypeScript for all React components
- Maintain consistent code formatting
- Add tests for new functionality
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Yxnt** ([Yxnt](https://github.com/Yxnt))
- Email: jyxnt1@gmail.com
- GitHub: [@Yxnt](https://github.com/Yxnt)

## 🙏 Acknowledgments

- **[Claude](https://claude.ai/)** - For invaluable assistance in code analysis, documentation, and development guidance
- **[Kiro](https://kiro.dev/)** - For inspiration and collaborative development support
- **[Wails Team](https://wails.io/)** - For the excellent Go + Web framework
- **[Google Cloud](https://cloud.google.com/apis/docs/cloud-client-libraries)** - For comprehensive APIs and documentation
- **[React & Next.js](https://nextjs.org/)** - For the modern frontend framework
- **Tailwind CSS** - For beautiful, responsive styling
- **Radix UI** - For accessible component primitives

---

**Note:** This application provides a desktop alternative to the Google Cloud Console for log analysis, offering enhanced search capabilities, real-time updates, and a focused log exploration experience.
