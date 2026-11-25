const https = require('https');

const ALLOWED_DEALS_API_HOSTS = new Set([
  'www.cheapshark.com',
  'www.gamerpower.com',
  'www.freetogame.com',
  'store-site-backend-static.ak.epicgames.com',
  'open.er-api.com',
  'api.frankfurter.dev',
  'api.steampowered.com',
  'store.steampowered.com',
  'api.steamdata.dev',
  'thegamecensus.com',
  'public-api.steamidx.com',
  'api.api.sh',
  'opencritic-api.p.rapidapi.com',
  'api.opencritic.com',
]);

const PROVIDER_AUTH_HOST_MAP = {
  steam_index: new Set(['public-api.steamidx.com']),
  metacritic_apish: new Set(['api.api.sh']),
  opencritic_rapidapi: new Set(['opencritic-api.p.rapidapi.com']),
};

const MAX_RESPONSE_BYTES = 6 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 14000;

function isAllowedDealsApiUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  const trimmed = rawUrl.trim();
  if (trimmed.length > 4096 || /[\x00-\x1f\x7f]/.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    return ALLOWED_DEALS_API_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function buildAuthHeadersForProvider(providerId, targetUrl, credentialsManager) {
  if (!providerId || !credentialsManager) return { ok: true, headers: {} };
  const allowedHosts = PROVIDER_AUTH_HOST_MAP[providerId];
  if (!allowedHosts) return { ok: true, headers: {} };

  let parsedHost = '';
  try {
    parsedHost = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return { ok: false, error: 'Invalid provider URL.' };
  }

  if (!allowedHosts.has(parsedHost)) {
    return { ok: false, error: 'Credential injection blocked: host mismatch.' };
  }

  const secret = credentialsManager.getKey(providerId);
  if (!secret) {
    return { ok: false, missingCredential: true, error: 'API key not configured.' };
  }

  if (providerId === 'steam_index') {
    return {
      ok: true,
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    };
  }
  if (providerId === 'metacritic_apish') {
    return {
      ok: true,
      headers: {
        'x-api-key': secret,
      },
    };
  }
  if (providerId === 'opencritic_rapidapi') {
    return {
      ok: true,
      headers: {
        'X-RapidAPI-Key': secret,
        'X-RapidAPI-Host': 'opencritic-api.p.rapidapi.com',
      },
    };
  }

  return { ok: true, headers: {} };
}

function fetchAllowedJson(urlString, appVersion, extraHeaders = {}) {
  return new Promise((resolve) => {
    if (!isAllowedDealsApiUrl(urlString)) {
      resolve({
        ok: false,
        status: 403,
        headers: {},
        body: '',
        error: 'Blocked non-allowlisted API host.',
      });
      return;
    }

    const req = https.get(
      urlString,
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': `SecretAreaDesktop/${appVersion || '1.0.5'} (+https://www.secretarea.site)`,
          Accept: 'application/json',
          ...extraHeaders,
        },
      },
      (res) => {
        const status = Number(res.statusCode || 0);
        const pickHeader = (name) =>
          res.headers[name] ? String(res.headers[name]) : undefined;

        const outHeaders = {};
        for (const h of [
          'retry-after',
          'x-total-page-count',
          'content-type',
          'ratelimit-limit',
          'ratelimit-remaining',
          'ratelimit-reset',
          'location',
        ]) {
          const val = pickHeader(h);
          if (val) outHeaders[h] = val;
        }

        let byteCount = 0;
        const chunks = [];
        let aborted = false;

        res.on('data', (chunk) => {
          byteCount += chunk.length;
          if (byteCount > MAX_RESPONSE_BYTES) {
            aborted = true;
            req.destroy();
            resolve({
              ok: false,
              status: 413,
              headers: {},
              body: '',
              error: 'Response exceeded maximum allowed size.',
            });
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          if (aborted) return;
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: outHeaders,
            body,
            error: status >= 200 && status < 300 ? undefined : `HTTP ${status}`,
          });
        });

        res.on('error', (err) => {
          if (aborted) return;
          resolve({
            ok: false,
            status: 0,
            headers: {},
            body: '',
            error: err instanceof Error ? err.message : 'Network stream error',
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        status: 408,
        headers: {},
        body: '',
        error: 'Request timed out',
      });
    });

    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 0,
        headers: {},
        body: '',
        error: err instanceof Error ? err.message : 'Network request error',
      });
    });
  });
}

function registerDealsNetworkBridge(ipcMain, isTrustedSender, getAppVersion, credentialsManager) {
  ipcMain.handle('deals:fetch-json', async (event, targetUrl) => {
    if (!isTrustedSender(event)) {
      return {
        ok: false,
        status: 403,
        headers: {},
        body: '',
        error: 'Untrusted sender',
      };
    }
    const version = typeof getAppVersion === 'function' ? getAppVersion() : '1.0.5';
    return fetchAllowedJson(targetUrl, version);
  });

  ipcMain.handle('deals:fetch-provider-json', async (event, payload) => {
    if (!isTrustedSender(event)) {
      return {
        ok: false,
        status: 403,
        headers: {},
        body: '',
        error: 'Untrusted sender',
      };
    }
    const targetUrl = payload && typeof payload.url === 'string' ? payload.url : '';
    const providerId = payload && typeof payload.providerId === 'string' ? payload.providerId : '';
    if (!isAllowedDealsApiUrl(targetUrl)) {
      return {
        ok: false,
        status: 403,
        headers: {},
        body: '',
        error: 'Blocked non-allowlisted API host.',
      };
    }

    const authResult = buildAuthHeadersForProvider(providerId, targetUrl, credentialsManager);
    if (!authResult.ok) {
      return {
        ok: false,
        status: authResult.missingCredential ? 401 : 403,
        headers: {},
        body: '',
        missingCredential: Boolean(authResult.missingCredential),
        error: authResult.error,
      };
    }

    const version = typeof getAppVersion === 'function' ? getAppVersion() : '1.0.5';
    return fetchAllowedJson(targetUrl, version, authResult.headers);
  });

  ipcMain.handle('deals:get-credential-status', async (event) => {
    if (!isTrustedSender(event)) {
      return { safeStorageAvailable: false, providers: {} };
    }
    return credentialsManager ? credentialsManager.getStatus() : { safeStorageAvailable: false, providers: {} };
  });

  ipcMain.handle('deals:set-credential', async (event, payload) => {
    if (!isTrustedSender(event)) {
      return { ok: false, error: 'Untrusted sender' };
    }
    if (!credentialsManager) {
      return { ok: false, error: 'Credential manager unavailable' };
    }
    const providerId = payload && typeof payload.providerId === 'string' ? payload.providerId : '';
    const apiKey = payload && typeof payload.apiKey === 'string' ? payload.apiKey : '';
    return credentialsManager.setKey(providerId, apiKey);
  });

  ipcMain.handle('deals:clear-credential', async (event, providerId) => {
    if (!isTrustedSender(event)) {
      return { ok: false, error: 'Untrusted sender' };
    }
    if (!credentialsManager) {
      return { ok: false, error: 'Credential manager unavailable' };
    }
    return credentialsManager.clearKey(typeof providerId === 'string' ? providerId : '');
  });
}

module.exports = {
  registerDealsNetworkBridge,
  isAllowedDealsApiUrl,
  ALLOWED_DEALS_API_HOSTS,
};
