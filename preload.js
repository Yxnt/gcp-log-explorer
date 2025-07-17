const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkGcloudAuth: () => ipcRenderer.send('check-gcloud-auth'),
  onGcloudAuthStatus: (callback) => ipcRenderer.on('gcloud-auth-status', (_event, value) => callback(value)),
  runGcloudAuth: () => ipcRenderer.send('run-gcloud-auth'),
  onGcloudAuthResult: (callback) => ipcRenderer.on('gcloud-auth-result', (_event, value) => callback(value)),
  
  // API methods
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getResources: (projectId) => ipcRenderer.invoke('get-resources', projectId),

  getLogs: (params) => ipcRenderer.invoke('get-logs', params),
});
