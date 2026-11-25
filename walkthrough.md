# Security Summary

This walkthrough documents the security audit and hardening applied across SecretArea Desktop (`secretarea`), covering the Electron main process, IPC bridges, Download Manager and qBittorrent integration, gaming API credential handling, Hardware Intelligence exports and database updater, React frontend, and Vite production build configuration.

## What Was Audited and Fixed

1. **Hardware Database Feed Validation & Request Protection (`/electron/hardware/hardwareDbManager.cjs`)**
   - **Why it matters**: Allowing custom feed URLs or redirects without checking destination hosts can trick the desktop process into sending requests to local services (such as `127.0.0.1` or cloud metadata endpoints) or plain HTTP mirrors, while malformed match patterns could freeze CPU threads during hardware matching.
   - **What changed**: Added strict public HTTPS enforcement (`isSafeRemoteHttpsFeedUrl`), blocked embedded URL credentials (`user:pass@`), rejected loopback/private/link-local/CGNAT IPs and `.localhost`/`.local`/`.internal` domains (with DNS resolution verification via `assertHostnameResolvesPublic`), enforced a 5-redirect cap that re-validates every `Location` hop, prevented invalid `feedUrlOverride` inputs from being persisted to metadata, and added `isSafeMatchPattern` checks to reject nested backtracking regexes (`(a+)+`) and overly long pattern lists.

2. **API Credentials & Allowlisted Deals Network Bridge (`/electron/deals/dealsCredentialsManager.cjs`, `/electron/deals/dealsNetworkBridge.cjs`)**
   - **Why it matters**: Control characters (`\r`, `\n`, `\0`) inside saved API keys can inject extra HTTP headers when requests are sent from the main process, and URLs with embedded credentials can trick origin checks.
   - **What changed**: Added `validateApiKeyFormat` in `dealsCredentialsManager.cjs` to reject empty strings, keys over 2,048 characters, and control/newline characters before storing or injecting keys (enforced in both `setKey` and `getKey`). Confirmed keys are stored encrypted via Electron `safeStorage` when OS keychain encryption is available and fall back strictly to in-memory session storage (`session_memory`)—never plaintext disk files—when unavailable. Hardened `isAllowedDealsApiUrl` in `dealsNetworkBridge.cjs` to block embedded `username`/`password`, control characters, and URLs over 4,096 characters alongside the strict HTTPS host allowlist. Verified `GEMINI_API_KEY` and Firebase are neither used nor bundled in the renderer (`dist/`).

3. **Download Manager & qBittorrent Security (`/electron/downloadManager.cjs`, `/electron/main.cjs`)**
   - **Why it matters**: An integrated download browser (`will-download`) and local qBittorrent Web UI bridge must never allow web pages or redirects to download `file://` files or hit local loopback services (`127.0.0.1:8080`), follow symlinks out of the download directory, or inject HTTP headers via torrent credentials.
   - **What changed**:
     - Hardened `isSafeRemoteDownloadUrl` to reject embedded `user:pass@` credentials and URLs over 4,096 characters, in addition to blocking non-HTTP(S) schemes and private/loopback hosts.
     - Updated `registerGlobalWillDownload()` so `session.defaultSession.on('will-download')` validates both `item.getURL()` and every entry in `item.getURLChain()` against `isSafeRemoteDownloadUrl`, calling `event.preventDefault()`, `item.cancel()`, and failing any associated task if unsafe.
     - Added `assertNotSymlinkIfExists` before writing `.part` files and before renaming completed files in `runHttpStreamTask` and `runMegaTask`.
     - Added `hasHeaderControlChars` checks in `testTorrentConnection` and `saveTorrentConfig` to block newline/control characters in qBittorrent credentials, and expanded `scrubSensitiveText` to redact URL credentials and query-string tokens alongside `Bearer` and `SID` values.
     - Hardened `parseSafeExternalUrl` in `/electron/main.cjs` so `window.open` / `will-navigate` `shell.openExternal` handoffs reject embedded credentials, private/loopback hostnames, whitespace in `magnet:`/`tg:` URIs, and URLs over 2,048 characters.

4. **PDF Report Window Isolation & Worker Cleanup (`/electron/hardware/hardwareIntelligenceIpc.cjs`, `/electron/hardware/benchmarkRunner.cjs`)**
   - **Why it matters**: Rendering HTML reports in an offscreen `BrowserWindow` for PDF export requires strict isolation so untrusted text can never execute scripts or fetch remote resources, and multi-threaded CPU benchmarks must terminate cleanly if canceled or closed.
   - **What changed**:
     - Added filename sanitization (`sanitizeDefaultReportFilename`) and input size limits (10 MB JSON, 5 MB HTML) to `exportReportJson` and `exportReportPdf`.
     - Configured the hidden PDF `BrowserWindow` with `webSecurity: true`, `allowRunningInsecureContent: false`, `webviewTag: false`, `javascript: false`, `setWindowOpenHandler(() => ({ action: 'deny' }))`, `will-attach-webview` deny, non-`data:text/html;` `will-navigate` blocking, and `injectStrictReportCsp` (`default-src 'none'; style-src 'unsafe-inline';`).
     - Updated `benchmarkRunner.cjs` to track spawned CPU `Worker` instances in `activeWorkers`, enforce a 4-second safety timeout, check cancellation state after completion, and terminate active workers immediately when `cancel()` is invoked.

5. **Privacy Shield Redaction & Frontend URL Hygiene (`/src/services/hardwareIntelligence.ts`, `/src/deals/providers/gameCensusProvider.ts`, `/src/services/desktopDownload.ts`, `/src/services/sheetsApi.ts`, `/src/components/GameDetailModal.tsx`, `/src/components/ExtrasView.tsx`, `/vite.config.ts`)**
   - **Why it matters**: Diagnostic exports with Privacy Shield enabled must scrub hostnames, device serial numbers, network SSIDs, and user profile paths; external store/community/installer URLs must never allow `javascript:`, `data:`, plain `http:`, or local endpoints; and packaged `file://` loads need an in-HTML Content Security Policy fallback.
   - **What changed**:
     - Expanded `privacyShield` redaction in `buildHardwareHealthReportPayload` (also shared by `buildPrintableReportHtml`) to mask `storage[].serialMasked`, `memory.modules[].serialMasked`, `displays[].serialMasked`, `network.adapters[].ssid`, `diagnosticEvents.pnpErrors[].deviceId`, and Windows/Unix user paths + hostnames inside `diagnosticEvents.eventLogWarnings[].message`.
     - Wrapped The Game Census external links (`data.url`, `m.url`) with `sanitizeExternalHttpUrl()`.
     - Restricted `resolveInstallerUrl` and `triggerExeDownload` in `desktopDownload.ts` to public HTTPS URLs only (`isSafePublicHttpsUrl`), and enforced strict HTTPS public-host validation (`isValidHttpsEndpoint`) before every Apps Script catalog/comments/request `fetch` in `sheetsApi.ts`.
     - Added defensive protocol checks (`https:` / `http:` / `magnet:?`) on external links and `window.open` handlers in `GameDetailModal.tsx` and `ExtrasView.tsx`.
     - Added a build-time-only `transformIndexHtml` hook in `/vite.config.ts` to inject a strict Content-Security-Policy `<meta>` tag into `dist/index.html` for packaged `file://` execution without interfering with Vite dev mode.

## PoC Verification

Because this audit environment runs on Linux without Electron's native Windows binary or a live Windows desktop session, CJS module tests were executed under Node 22 / `tsx` using an in-memory `electron` module stub (`safeStorage.isEncryptionAvailable = () => false`, mock `dialog`, `BrowserWindow`, and `session.defaultSession`), while TypeScript checks and production Vite builds ran directly on disk.

### Automated Checks Executed and Passed
- **TypeScript Type Check (`npm run lint` / `tsc --noEmit`)**: Passed with 0 errors.
- **Production Vite Build (`npm run build`)**: Passed (`dist/index.html`, `dist/assets/index-*.js`, `dist/assets/index-*.css`), 0 source maps (`*.map`) generated, and `dist/index.html` confirmed to contain the production CSP `<meta http-equiv="Content-Security-Policy" ...>` tag.
- **Production Bundle Secret Scan (`grep` across `dist/`)**: Zero occurrences of `GEMINI_API_KEY`, `STEAM_INDEX_API_KEY`, `APISH_METACRITIC_API_KEY`, `OPENCRITIC_RAPIDAPI_KEY`, `@google/genai`, `GoogleGenAI`, or Google API key prefixes (`AIza...`).
- **Electron Syntax Check (`node --check`)**: Passed across all 19 `.cjs` modules in `electron/`, `electron/deals/`, and `electron/hardware/`.
- **Targeted Security & Regression Test Suite (`npx tsx`)**: All 9 verification groups passed:
  1. `hardwareDbManager.cjs`: Rejected `http://`, `127.0.0.1`, `localhost`, `[::1]`, `169.254.169.254`, `10.0.0.1`, `192.168.1.5`, `172.16.5.1`, and `user:pass@` URLs; kept default feed URL unmutated on rejected override; rejected ReDoS pattern `(a+)+$`.
  2. `dealsCredentialsManager.cjs`: Rejected `\r\n` and `\0` in API keys; verified `session_memory` fallback with no plaintext `deals-credentials.json` written when `safeStorage` is unavailable; verified masked preview (`••••`) hides raw characters.
  3. `dealsNetworkBridge.cjs`: Allowed allowlisted HTTPS host and blocked `user:pass@`, `http://`, `127.0.0.1`, and non-allowlisted domains.
  4. `downloadManager.cjs`: Verified `isSafeRemoteDownloadUrl`, `isPathInsideDir`, and `scrubSensitiveText` (redacting `Bearer`, `SID`, URL credentials, and query `token=`); confirmed `will-download` listener blocks and cancels `http://127.0.0.1:8080/...` and `file:///etc/passwd` while sanitizing safe HTTPS filenames into the configured download directory; verified `testTorrentConnection` and `downloads:save-torrent-config` reject newline/control characters in qBittorrent credentials.
  5. `hardwareIntelligenceIpc.cjs`: Rejected oversized JSON (> 10 MB) and HTML (> 5 MB) export payloads; verified hidden PDF `BrowserWindow` loads with `default-src 'none'` strict CSP injected.
  6. `pcCleaner.cjs`: Verified `isPathSafeForCleaner` rejects `C:\Windows\System32\cmd.exe` and user Documents paths while allowing explicit safe cache targets.
  7. `benchmarkRunner.cjs`: Verified `cpu_multi` worker cancellation returned `cancelled: true` cleanly in 97 ms.
  8. `hardwareIntelligence.ts`: Verified JSON and PDF HTML reports built with `privacyShield: true` contain none of the test hostname, system/board/RAM/disk/display serials, UUID, MAC, Wi-Fi SSID, PnP device ID, or Windows username path (`C:\Users\JohnSecret`).
  9. `desktopDownload.ts`, `sheetsApi.ts`, `gameCensusProvider.ts`: Verified `resolveInstallerUrl` rejects `http://`, `127.0.0.1`, and `user:pass@`; verified `fetchCatalogFromGas` rejects non-HTTPS/private/credential URLs before invoking `fetch`; verified `GameCensusProvider` replaces `javascript:` and `data:` `url` values with safe fallback `https://thegamecensus.com/game/<id>` URLs.

### Untested on Windows (Requires Live Windows Verification)
- Live Electron desktop window startup, Chromium sandbox behavior, and `app.isPackaged` `file://` load behavior on Windows.
- Electron `safeStorage` DPAPI encryption/decryption persistence across restarts on Windows.
- Real Windows hardware telemetry (WMI/CIM PowerShell queries, multi-GPU enumeration, SMART disk health, battery/fan sensors, PresentMon live capture, PC Cleaner real execution).
- Live qBittorrent Web UI authentication and download resumption, plus `electron-updater` GitHub Releases install/verification on Windows (installer is currently **unsigned** unless `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` secrets and `build.win.publisherName` are configured).
