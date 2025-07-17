const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Import Google Cloud libraries
const { ProjectsClient } = require('@google-cloud/resource-manager');
const { Logging } = require('@google-cloud/logging');

// More reliable way to detect development environment
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Fix PATH on macOS for GUI apps
function fixMacOSPath() {
  if (os.platform() === 'darwin') {
    try {
      const { execSync } = require('child_process');
      // Get PATH from user's shell
      const shellPath = execSync('echo $PATH', {
        shell: '/bin/bash',
        encoding: 'utf8'
      }).trim();

      // Common paths that might be missing
      const commonPaths = [
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/usr/local/google-cloud-sdk/bin',
        `${os.homedir()}/google-cloud-sdk/bin`,
        `${os.homedir()}/.local/bin`
      ];

      // Merge current PATH with shell PATH and common paths
      const currentPath = process.env.PATH || '';
      const allPaths = [currentPath, shellPath, ...commonPaths]
        .join(':')
        .split(':')
        .filter((p, i, arr) => p && arr.indexOf(p) === i) // Remove duplicates and empty
        .join(':');

      process.env.PATH = allPaths;
      console.log('Fixed PATH for macOS:', process.env.PATH);
    } catch (error) {
      console.warn('Could not fix PATH on macOS:', error.message);
    }
  }
}

// Get system gcloud path
function getGcloudPath() {
  const { execSync } = require('child_process');

  // First try to find gcloud in PATH
  try {
    const whichCommand = os.platform() === 'win32' ? 'where gcloud' : 'which gcloud';
    const gcloudPath = execSync(whichCommand, { encoding: 'utf8' }).trim();
    if (gcloudPath) {
      return gcloudPath.split('\n')[0]; // Take first result if multiple
    }
  } catch (error) {
    // gcloud not found in PATH, try common installation locations
  }

  // Try common installation paths
  const commonPaths = [
    '/usr/local/bin/gcloud',
    '/usr/bin/gcloud',
    '/opt/google-cloud-sdk/bin/gcloud',
    `${os.homedir()}/google-cloud-sdk/bin/gcloud`,
    `${os.homedir()}/Library/google-cloud-sdk/bin/gcloud`, // macOS Homebrew
    '/usr/local/google-cloud-sdk/bin/gcloud',
  ];

  const fs = require('fs');
  for (const gcloudPath of commonPaths) {
    try {
      if (fs.existsSync(gcloudPath)) {
        return gcloudPath;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  // Fallback to 'gcloud' and let the system handle it
  return 'gcloud';
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Listen for the 'check-gcloud-auth' message from the renderer process
  ipcMain.on('check-gcloud-auth', (event) => {
    console.log('Checking gcloud authentication status...');
    const gcloudPath = getGcloudPath();
    const command = `${gcloudPath} auth application-default print-access-token`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('No valid authentication found');
        event.sender.send('gcloud-auth-status', { authenticated: false });
        return;
      }
      console.log('Valid authentication found');
      event.sender.send('gcloud-auth-status', { authenticated: true });
    });
  });

  // Listen for the 'run-gcloud-auth' message from the renderer process
  ipcMain.on('run-gcloud-auth', (event) => {
    console.log('Received run-gcloud-auth message. Executing command...');
    const gcloudPath = getGcloudPath();
    const command = `${gcloudPath} auth application-default login`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        // Optionally send an error message back to the renderer
        event.sender.send('gcloud-auth-result', { success: false, error: stderr });
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      // Send a success message back to the renderer
      event.sender.send('gcloud-auth-result', { success: true });
    });
  });

  // Handle projects API
  ipcMain.handle('get-projects', async () => {
    console.log('get-projects handler called');
    try {
      console.log('Creating ProjectsClient...');
      const projectsClient = new ProjectsClient();
      console.log('Calling searchProjects...');
      const [projects] = await projectsClient.searchProjects();
      console.log('Projects found:', projects.length);

      const result = projects.map(project => ({
        projectId: project.projectId,
        name: project.displayName || project.projectId,
      }));
      console.log('Returning projects:', result);
      return result;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  });

  // Handle resources API with enhanced gcloud integration
  ipcMain.handle('get-resources', async (event, projectId) => {
    console.log('get-resources handler called for project:', projectId);
    try {
      console.log('Creating Logging client for project:', projectId);
      const logging = new Logging({ projectId });

      console.log('Fetching log entries to discover resource types...');
      // Get log entries to discover resource types
      const [entries] = await logging.getEntries({
        pageSize: 1000,
        orderBy: 'timestamp desc',
      });

      console.log('Found', entries.length, 'log entries');

      const resourceTypesMap = new Map();
      const resourceInstancesMap = new Map(); // For deduplication of resource instances

      entries.forEach((entry, index) => {
        // Use entry.metadata.resource.type instead of entry.resource.type
        const resourceType = entry.metadata?.resource?.type;
        const resourceLabels = entry.metadata?.resource?.labels || entry.resource?.labels;
        if (resourceType) {
          // Always ensure the resource type exists in the map
          if (!resourceTypesMap.has(resourceType)) {
            resourceTypesMap.set(resourceType, {
              type: resourceType,
              resources: []
            });
            resourceInstancesMap.set(resourceType, new Set()); // Track unique instances per type
            console.log('Found new resource type:', resourceType);
          }

          // Extract resource instance ID with deduplication - prioritize namespace over pod_name
          let resourceId = 'default';
          if (resourceLabels) {
            resourceId = resourceLabels.namespace_name ||
              resourceLabels.namespace ||
              resourceLabels.instance_id ||
              resourceLabels.container_name ||
              resourceLabels.service_name ||
              resourceLabels.function_name ||
              resourceLabels.cluster_name ||
              resourceLabels.location ||
              'default';
          }

          // Only add if not already exists (deduplication)
          const instancesSet = resourceInstancesMap.get(resourceType);
          if (!instancesSet.has(resourceId)) {
            instancesSet.add(resourceId);
            const existingType = resourceTypesMap.get(resourceType);
            existingType.resources.push({ id: resourceId, name: resourceId });
            console.log('Added unique resource:', resourceId, 'to type:', resourceType);
          }
        } else {
          console.log(`Entry ${index}: No resource type found in metadata.resource.type`);
        }
      });

      let result = Array.from(resourceTypesMap.values());
      console.log('Returning resource types:', result.length, 'types found');
      result.forEach(rt => console.log('- Type:', rt.type, 'with', rt.resources.length, 'resources'));

      // Return only actual resource types found in the logs
      // No hardcoded fallback options

      return result;
    } catch (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
  });



  // Handle logs API with pagination and time filtering
  ipcMain.handle('get-logs', async (event, { projectId, resourceType, filter, severity, limit, startTime, endTime, pageToken, jsonOnly }) => {
    try {
      const logging = new Logging({ projectId });

      let filterString = '';

      // Add time range filter
      if (startTime && endTime) {
        filterString += `timestamp>="${startTime}" AND timestamp<="${endTime}"`;
      }

      // Add resource type filter
      if (resourceType && resourceType !== 'all') {
        if (filterString) filterString += ' AND ';
        filterString += `resource.type="${resourceType}"`;
      }

      // Add severity filter
      if (severity && severity !== 'all') {
        if (filterString) filterString += ' AND ';
        filterString += `severity>="${severity.toUpperCase()}"`;
      }

      // Add JSON-only filter
      if (jsonOnly) {
        if (filterString) filterString += ' AND ';
        filterString += 'jsonPayload:*';
      }

      // Add custom filter
      if (filter) {
        if (filterString) filterString += ' AND ';
        filterString += filter;
      }

      console.log('Fetching logs with filter:', filterString);
      console.log('Page token:', pageToken || 'none');

      const options = {
        filter: filterString,
        pageSize: limit || 100,
        orderBy: 'timestamp desc',
      };

      // Add page token if provided
      if (pageToken) {
        options.pageToken = pageToken;
      }

      const [entries, request, response] = await logging.getEntries(options);

      console.log(`Fetched ${entries.length} entries`);
      


      const logs = entries.map(entry => {
        // Determine the payload type and extract the appropriate data
        const payloadType = entry.metadata?.payload;
        let textPayload = null;
        let jsonPayload = null;
        
        if (payloadType === 'textPayload') {
          textPayload = entry.data || entry.metadata?.textPayload || entry.textPayload;
        } else if (payloadType === 'jsonPayload') {
          jsonPayload = entry.data || entry.metadata?.jsonPayload || entry.jsonPayload;
        } else {
          // Fallback: try both
          textPayload = entry.data || entry.metadata?.textPayload || entry.textPayload;
          jsonPayload = entry.jsonPayload || entry.metadata?.jsonPayload;
        }
        
        return {
          timestamp: entry.metadata?.timestamp || entry.timestamp,
          severity: entry.metadata?.severity || entry.severity,
          textPayload: textPayload,
          jsonPayload: jsonPayload,
          resource: entry.metadata?.resource || entry.resource,
          labels: entry.metadata?.labels || entry.labels,
          logName: entry.metadata?.logName || entry.logName,
        };
      });

      // Return response with pagination info
      const result = {
        logs: logs,
        nextPageToken: response?.nextPageToken || undefined
      };

      console.log('Next page token:', result.nextPageToken || 'none');

      return result;
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Force production environment
    process.env.NODE_ENV = 'production';
    const indexPath = path.join(__dirname, 'out', 'index.html');
    console.log(`Loading from: ${indexPath}`);
    console.log(`File exists: ${require('fs').existsSync(indexPath)}`);
    mainWindow.loadFile(indexPath);
    
    // Enable DevTools in production for debugging
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Fix PATH on macOS before creating window
  fixMacOSPath();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
