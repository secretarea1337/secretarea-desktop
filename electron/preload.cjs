const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('secretAreaDesktop', {
  isDesktop: true,
  platform: process.platform,
  updater: {
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    getState: () => ipcRenderer.invoke('updater:get-state'),
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    postponeUpdate: () => ipcRenderer.invoke('updater:postpone'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    getReleaseNotes: (version) => ipcRenderer.invoke('updater:get-release-notes', version),
    getReleaseHistory: (forceRefresh) =>
      ipcRenderer.invoke('updater:get-release-history', Boolean(forceRefresh)),
    onStateChange: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, state) => {
        callback(state);
      };
      ipcRenderer.on('updater:status', listener);
      return () => {
        ipcRenderer.removeListener('updater:status', listener);
      };
    },
  },
  windowControls: {
    isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
    setFullscreen: (flag) => ipcRenderer.invoke('window:set-fullscreen', Boolean(flag)),
    onFullscreenChange: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, isFullscreen) => {
        callback(Boolean(isFullscreen));
      };
      ipcRenderer.on('window:fullscreen-changed', listener);
      return () => {
        ipcRenderer.removeListener('window:fullscreen-changed', listener);
      };
    },
  },
  system: {
    getSpecs: (forceRefresh) => ipcRenderer.invoke('system:get-specs', Boolean(forceRefresh)),
  },
  settings: {
    getDesktopSettings: () => ipcRenderer.invoke('settings:get-desktop'),
    setStartWithComputer: (enabled) =>
      ipcRenderer.invoke('settings:set-start-with-computer', Boolean(enabled)),
    setCloseBehavior: (behavior) =>
      ipcRenderer.invoke('settings:set-close-behavior', behavior),
    exitApplication: () => ipcRenderer.invoke('app:exit-completely'),
    completeOnboarding: (payload = true) =>
      ipcRenderer.invoke('settings:complete-onboarding', payload),
    markVersionSeen: (version) =>
      ipcRenderer.invoke('settings:mark-version-seen', version),
    setPerformanceSettings: (payload) =>
      ipcRenderer.invoke('settings:set-performance', payload),
    getPerformanceMetrics: () =>
      ipcRenderer.invoke('app:get-performance-metrics'),
  },
  downloads: {
    getState: () => ipcRenderer.invoke('downloads:get-state'),
    start: (payload) => ipcRenderer.invoke('downloads:start', payload),
    addTorrentFile: () => ipcRenderer.invoke('downloads:add-torrent-file'),
    pause: (id) => ipcRenderer.invoke('downloads:pause', id),
    resume: (id) => ipcRenderer.invoke('downloads:resume', id),
    cancel: (id) => ipcRenderer.invoke('downloads:cancel', id),
    retry: (id) => ipcRenderer.invoke('downloads:retry', id),
    remove: (id, deleteFiles) => ipcRenderer.invoke('downloads:remove', id, Boolean(deleteFiles)),
    clearCompleted: () => ipcRenderer.invoke('downloads:clear-completed'),
    chooseFolder: () => ipcRenderer.invoke('downloads:choose-folder'),
    openFolder: (id) => ipcRenderer.invoke('downloads:open-folder', id),
    openFile: (id) => ipcRenderer.invoke('downloads:open-file', id),
    openExternal: (url) => ipcRenderer.invoke('downloads:open-external', url),
    detectTorrentClient: () => ipcRenderer.invoke('downloads:detect-torrent'),
    saveTorrentConfig: (cfg) => ipcRenderer.invoke('downloads:save-torrent-config', cfg),
    testTorrentConnection: (cfg) => ipcRenderer.invoke('downloads:test-torrent-connection', cfg),
    onUpdated: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, snapshot) => {
        callback(snapshot);
      };
      ipcRenderer.on('downloads:updated', listener);
      return () => {
        ipcRenderer.removeListener('downloads:updated', listener);
      };
    },
  },
  qbitSetup: {
    getState: () => ipcRenderer.invoke('qbit-setup:get-state'),
    checkStatus: () => ipcRenderer.invoke('qbit-setup:check'),
    refreshLocal: () => ipcRenderer.invoke('qbit-setup:refresh-local'),
    startInstall: (userConfirmed) =>
      ipcRenderer.invoke('qbit-setup:install', { userConfirmed: Boolean(userConfirmed) }),
    launchClient: () => ipcRenderer.invoke('qbit-setup:launch-client'),
    dismiss: () => ipcRenderer.invoke('qbit-setup:dismiss'),
    generatePassword: () => ipcRenderer.invoke('qbit-setup:generate-password'),
    openOfficialDownload: () => ipcRenderer.invoke('qbit-setup:open-official'),
    onStateChange: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, state) => {
        callback(state);
      };
      ipcRenderer.on('qbit-setup:status', listener);
      return () => {
        ipcRenderer.removeListener('qbit-setup:status', listener);
      };
    },
  },
  hardwareMonitor: {
    getSnapshot: () => ipcRenderer.invoke('hardware:get-snapshot'),
    start: (intervalMs) => ipcRenderer.invoke('hardware:start', intervalMs),
    stop: () => ipcRenderer.invoke('hardware:stop'),
    setInterval: (intervalMs) => ipcRenderer.invoke('hardware:set-interval', intervalMs),
    onUpdate: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, snapshot) => {
        callback(snapshot);
      };
      ipcRenderer.on('hardware:update', listener);
      return () => {
        ipcRenderer.removeListener('hardware:update', listener);
      };
    },
  },
  hardwareIntelligence: {
    getDeepInventory: (forceRefresh) =>
      ipcRenderer.invoke('hardware:get-deep-inventory', Boolean(forceRefresh)),
    getDbState: () => ipcRenderer.invoke('hardware:db-get-state'),
    getDbEntries: () => ipcRenderer.invoke('hardware:db-get-entries'),
    checkDbUpdate: (customUrl, options) =>
      ipcRenderer.invoke('hardware:db-check-update', customUrl, options),
    importDbFile: () => ipcRenderer.invoke('hardware:db-import-file'),
    rollbackDb: () => ipcRenderer.invoke('hardware:db-rollback'),
    runBenchmark: (testIds) => ipcRenderer.invoke('hardware:benchmark-run', testIds),
    cancelBenchmark: () => ipcRenderer.invoke('hardware:benchmark-cancel'),
    onBenchmarkProgress: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, progress) => {
        callback(progress);
      };
      ipcRenderer.on('hardware:benchmark-progress', listener);
      return () => {
        ipcRenderer.removeListener('hardware:benchmark-progress', listener);
      };
    },
    exportReportJson: (payload) => ipcRenderer.invoke('hardware:export-report-json', payload),
    exportReportPdf: (payload) => ipcRenderer.invoke('hardware:export-report-pdf', payload),
  },
  gamingMonitor: {
    listProcesses: () => ipcRenderer.invoke('gaming:list-processes'),
    checkPresentMon: () => ipcRenderer.invoke('gaming:check-presentmon'),
    getState: () => ipcRenderer.invoke('gaming:get-state'),
    startSession: (opts) => ipcRenderer.invoke('gaming:start-session', opts),
    stopSession: () => ipcRenderer.invoke('gaming:stop-session'),
    getHistory: () => ipcRenderer.invoke('gaming:get-history'),
    clearHistory: () => ipcRenderer.invoke('gaming:clear-history'),
    setPingHost: (host) => ipcRenderer.invoke('gaming:set-ping-host', host),
    onUpdate: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, state) => {
        callback(state);
      };
      ipcRenderer.on('gaming:update', listener);
      return () => {
        ipcRenderer.removeListener('gaming:update', listener);
      };
    },
  },
  presentMonSetup: {
    getState: () => ipcRenderer.invoke('presentmon-setup:get-state'),
    checkStatus: (opts) => ipcRenderer.invoke('presentmon-setup:check', opts || {}),
    startInstall: (userConfirmed, mode) =>
      ipcRenderer.invoke('presentmon-setup:install', {
        userConfirmed: Boolean(userConfirmed),
        mode: mode || 'auto',
      }),
    cancel: () => ipcRenderer.invoke('presentmon-setup:cancel'),
    dismiss: (declinePermanently) =>
      ipcRenderer.invoke('presentmon-setup:dismiss', {
        declinePermanently: Boolean(declinePermanently),
      }),
    openOfficialReleases: () => ipcRenderer.invoke('presentmon-setup:open-official'),
    onStateChange: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, state) => {
        callback(state);
      };
      ipcRenderer.on('presentmon-setup:status', listener);
      return () => {
        ipcRenderer.removeListener('presentmon-setup:status', listener);
      };
    },
  },
  pcCleaner: {
    scan: () => ipcRenderer.invoke('cleaner:scan'),
    clean: (payload) => ipcRenderer.invoke('cleaner:clean', payload),
    cancel: () => ipcRenderer.invoke('cleaner:cancel'),
    onProgress: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, progress) => {
        callback(progress);
      };
      ipcRenderer.on('cleaner:progress', listener);
      return () => {
        ipcRenderer.removeListener('cleaner:progress', listener);
      };
    },
  },
  openSourceTools: {
    getState: () => ipcRenderer.invoke('oss-tools:get-state'),
    checkUpdates: (payload) => ipcRenderer.invoke('oss-tools:check-updates', payload || {}),
    installOrUpdate: (payload) => ipcRenderer.invoke('oss-tools:install-or-update', payload || {}),
    cancel: (payload) => ipcRenderer.invoke('oss-tools:cancel', payload || {}),
    rollback: (payload) => ipcRenderer.invoke('oss-tools:rollback', payload || {}),
    openExternalLink: (payload) => ipcRenderer.invoke('oss-tools:open-link', payload || {}),
    onStateChange: (callback) => {
      if (typeof callback !== 'function') {
        return () => {};
      }
      const listener = (_event, state) => {
        callback(state);
      };
      ipcRenderer.on('oss-tools:status', listener);
      return () => {
        ipcRenderer.removeListener('oss-tools:status', listener);
      };
    },
  },
  dealsBridge: {
    fetchJson: (url) => ipcRenderer.invoke('deals:fetch-json', url),
    fetchProviderJson: (payload) => ipcRenderer.invoke('deals:fetch-provider-json', payload),
    getCredentialStatus: () => ipcRenderer.invoke('deals:get-credential-status'),
    setCredential: (providerId, apiKey) =>
      ipcRenderer.invoke('deals:set-credential', { providerId, apiKey }),
    clearCredential: (providerId) => ipcRenderer.invoke('deals:clear-credential', providerId),
  },
});

