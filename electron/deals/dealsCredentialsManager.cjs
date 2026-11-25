const fs = require('fs');
const path = require('path');

let safeStorage = null;
try {
  const electron = require('electron');
  safeStorage = electron?.safeStorage || null;
} catch {
  safeStorage = null;
}

const CREDENTIAL_SPECS = {
  steam_index: {
    id: 'steam_index',
    label: 'Steam Index API',
    envVar: 'STEAM_INDEX_API_KEY',
  },
  metacritic_apish: {
    id: 'metacritic_apish',
    label: 'API.SH Metacritic API',
    envVar: 'APISH_METACRITIC_API_KEY',
  },
  opencritic_rapidapi: {
    id: 'opencritic_rapidapi',
    label: 'OpenCritic RapidAPI',
    envVar: 'OPENCRITIC_RAPIDAPI_KEY',
  },
};

function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return '';
  const trimmed = secret.trim();
  if (trimmed.length <= 6) return '••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

function validateApiKeyFormat(rawSecret) {
  if (typeof rawSecret !== 'string') {
    return { ok: false, error: 'API key must be a text string.' };
  }
  const trimmed = rawSecret.trim();
  if (!trimmed) {
    return { ok: false, error: 'API key cannot be empty.' };
  }
  if (trimmed.length > 2048) {
    return { ok: false, error: 'API key exceeds maximum allowed length (2048 characters).' };
  }
  if (/[\r\n\0\x00-\x1f\x7f]/.test(trimmed)) {
    return { ok: false, error: 'API key contains invalid control or newline characters.' };
  }
  return { ok: true, value: trimmed };
}

function createDealsCredentialsManager({ getUserDataPath }) {
  const memorySessionKeys = new Map();

  function getStorePath() {
    const baseDir = typeof getUserDataPath === 'function' ? getUserDataPath() : process.cwd();
    return path.join(baseDir, 'deals-credentials.json');
  }

  function isSafeStorageReady() {
    try {
      return Boolean(safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable());
    } catch {
      return false;
    }
  }

  function readDiskRecords() {
    try {
      const storePath = getStorePath();
      if (!fs.existsSync(storePath)) return {};
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeDiskRecords(records) {
    const storePath = getStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(records, null, 2), { encoding: 'utf8', mode: 0o600 });
  }

  function getKey(providerId) {
    const spec = CREDENTIAL_SPECS[providerId];
    if (!spec) return null;

    if (memorySessionKeys.has(providerId)) {
      const memCheck = validateApiKeyFormat(memorySessionKeys.get(providerId));
      return memCheck.ok ? memCheck.value : null;
    }

    const disk = readDiskRecords();
    const entry = disk[providerId];
    if (entry && typeof entry.encryptedBase64 === 'string' && entry.encryptedBase64.length > 0) {
      if (isSafeStorageReady()) {
        try {
          const decrypted = safeStorage.decryptString(Buffer.from(entry.encryptedBase64, 'base64'));
          const check = validateApiKeyFormat(decrypted);
          if (check.ok) return check.value;
        } catch {
          // Ignore corrupted ciphertext; fall back to env var if configured
        }
      }
    }

    const envVal = process.env[spec.envVar];
    const envCheck = validateApiKeyFormat(envVal);
    if (envCheck.ok) {
      return envCheck.value;
    }

    return null;
  }

  function setKey(providerId, rawSecret) {
    const spec = CREDENTIAL_SPECS[providerId];
    if (!spec) {
      return { ok: false, error: 'Unsupported provider credential ID.' };
    }
    const validation = validateApiKeyFormat(rawSecret);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    const trimmed = validation.value;

    if (isSafeStorageReady()) {
      try {
        const encryptedBase64 = safeStorage.encryptString(trimmed).toString('base64');
        const disk = readDiskRecords();
        disk[providerId] = {
          encryptedBase64,
          updatedAt: Date.now(),
        };
        writeDiskRecords(disk);
        memorySessionKeys.delete(providerId);
        return {
          ok: true,
          storageMode: 'safeStorage',
          status: getStatus(),
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to encrypt key with Electron safeStorage.',
        };
      }
    }

    // Never persist plaintext secrets to disk if OS keychain/safeStorage is unavailable.
    memorySessionKeys.set(providerId, trimmed);
    return {
      ok: true,
      storageMode: 'session_memory',
      warning: 'OS keychain encryption unavailable; key is stored in memory for this session only.',
      status: getStatus(),
    };
  }

  function clearKey(providerId) {
    if (!CREDENTIAL_SPECS[providerId]) {
      return { ok: false, error: 'Unsupported provider credential ID.' };
    }
    memorySessionKeys.delete(providerId);
    const disk = readDiskRecords();
    if (disk[providerId]) {
      delete disk[providerId];
      try {
        writeDiskRecords(disk);
      } catch {
        // ignore disk cleanup failure
      }
    }
    return { ok: true, status: getStatus() };
  }

  function getStatus() {
    const safeReady = isSafeStorageReady();
    const disk = readDiskRecords();
    const providers = {};

    for (const [id, spec] of Object.entries(CREDENTIAL_SPECS)) {
      const memVal = memorySessionKeys.get(id);
      const diskEntry = disk[id];
      const envVal = process.env[spec.envVar];
      const activeKey = getKey(id);

      let source = 'none';
      if (memVal) source = 'session_memory';
      else if (diskEntry?.encryptedBase64 && safeReady && activeKey) source = 'safeStorage';
      else if (envVal && envVal.trim()) source = 'env';

      providers[id] = {
        id,
        label: spec.label,
        configured: Boolean(activeKey),
        maskedPreview: activeKey ? maskSecret(activeKey) : null,
        source,
      };
    }

    return {
      safeStorageAvailable: safeReady,
      providers,
    };
  }

  return {
    getKey,
    setKey,
    clearKey,
    getStatus,
    CREDENTIAL_SPECS,
  };
}

module.exports = {
  createDealsCredentialsManager,
  CREDENTIAL_SPECS,
};
