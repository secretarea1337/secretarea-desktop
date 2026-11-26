const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('package.json preserves Windows NSIS config and defines Linux AppImage + DEB targets', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  assert.equal(pkg.version, '1.0.11');
  assert.equal(pkg.desktopName, 'secretarea.desktop');
  assert.equal(pkg.scripts['desktop:build'], 'vite build && electron-builder --win nsis');
  assert.equal(pkg.scripts['desktop:build:win'], 'vite build && electron-builder --win nsis --x64 --publish never');
  assert.equal(pkg.scripts['desktop:build:linux'], 'vite build && electron-builder --linux AppImage deb --x64 --publish never');

  assert.equal(pkg.build.win.artifactName, 'SecretArea.exe');
  assert.deepEqual(pkg.build.win.target, [{ target: 'nsis', arch: ['x64'] }]);

  assert.deepEqual(pkg.build.publish, [
    {
      provider: 'github',
      owner: 'secretarea1337',
      repo: 'secretarea-desktop',
      releaseType: 'release',
    },
  ]);

  assert.deepEqual(pkg.build.linux.target, [
    { target: 'AppImage', arch: ['x64'] },
    { target: 'deb', arch: ['x64'] },
  ]);
  assert.equal(pkg.build.linux.icon, 'packaging/linux/icons');
  assert.equal(pkg.build.linux.syncDesktopName, true);
  assert.equal(pkg.build.linux.category, 'Game');
  assert.equal(pkg.build.appImage.artifactName, 'SecretArea-${version}-linux-x86_64.AppImage');
  assert.equal(pkg.build.deb.artifactName, 'SecretArea-${version}-linux-amd64.deb');
  assert.equal(pkg.build.deb.compression, 'gz');

  for (const size of [16, 32, 48, 64, 128, 256, 512]) {
    const iconPath = path.join(ROOT, 'packaging', 'linux', 'icons', `${size}x${size}.png`);
    assert.equal(fs.existsSync(iconPath), true, `Missing Linux icon size ${size}x${size}.png`);
  }
});

test('GitHub Actions workflow builds Windows & Linux in parallel and publishes atomically in one job', () => {
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/build-desktop.yml'), 'utf8');

  assert.match(yml, /^  check-version:/m);
  assert.match(yml, /^  build-windows:/m);
  assert.match(yml, /^  build-linux:/m);
  assert.match(yml, /^  publish-release:/m);

  // Parallel builds wait on check-version only
  assert.match(yml, /build-windows:[\s\S]*?needs:\s*check-version[\s\S]*?runs-on:\s*windows-latest/);
  assert.match(yml, /build-linux:[\s\S]*?needs:\s*check-version[\s\S]*?runs-on:\s*ubuntu-latest/);

  // Single atomic release job waits on both platform builds and holds contents: write
  assert.match(
    yml,
    /publish-release:[\s\S]*?needs:\s*\[check-version,\s*build-windows,\s*build-linux\][\s\S]*?permissions:\s*\n\s*contents:\s*write/
  );
  assert.equal((yml.match(/softprops\/action-gh-release@v2/g) || []).length, 1);

  // Required release assets verified before publishing
  for (const expectedAsset of [
    'SecretArea.exe',
    'SecretArea.exe.blockmap',
    'latest.yml',
    'linux-x86_64.AppImage',
    'linux-amd64.deb',
    'latest-linux.yml',
  ]) {
    assert.equal(yml.includes(expectedAsset), true, `Workflow must handle ${expectedAsset}`);
  }

  assert.equal(yml.includes('npm ci --no-audit --no-fund'), true);
  assert.equal(yml.includes('actions/cache@v4'), true);
});

test('Linux platform guards prevent Windows-only startup network calls in OSS/PresentMon/qBit managers', async () => {
  const { createPresentMonManager } = require(path.join(ROOT, 'electron/hardware/presentMonManager.cjs'));
  const { createOpenSourceToolsManager } = require(path.join(ROOT, 'electron/hardware/openSourceToolsManager.cjs'));

  let presentMonFetched = false;
  const pm = createPresentMonManager({
    platformOverride: 'linux',
    getMainWindow: () => null,
    getUserDataPath: () => '/tmp/sa-test-pm',
    readSettings: () => ({}),
    writeSettings: () => {},
    fetchReleaseOverride: async () => {
      presentMonFetched = true;
      return null;
    },
  });
  pm.initStartupCheck();
  assert.equal(pm.getState().actionNeeded, 'unsupported_os');
  assert.equal(pm.getState().shouldPrompt, false);
  assert.equal(presentMonFetched, false);
  pm.shutdown();

  let lhmFetched = false;
  const oss = createOpenSourceToolsManager({
    platformOverride: 'linux',
    getMainWindow: () => null,
    getUserDataPath: () => '/tmp/sa-test-oss',
    readSettings: () => ({}),
    writeSettings: () => {},
    fetchGithubReleaseOverride: async () => {
      lhmFetched = true;
      return null;
    },
  });
  await oss.initStartupCheck();
  assert.equal(oss.getSnapshot().platformSupported, false);
  assert.equal(lhmFetched, false);
  oss.shutdown();
});

test('electron/main.cjs distinguishes Linux AppImage auto-update vs .deb manual fallback and supports Linux XDG autostart', () => {
  const mainSrc = fs.readFileSync(path.join(ROOT, 'electron/main.cjs'), 'utf8');
  assert.match(mainSrc, /function detectLinuxPackageType\(\)/);
  assert.match(mainSrc, /function isAutoUpdateSupported\(\)/);
  assert.match(mainSrc, /getLinuxAutostartDesktopPath/);
  assert.match(mainSrc, /linuxPackageType:\s*detectLinuxPackageType\(\)/);
  assert.match(mainSrc, /autoUpdateSupported:\s*isAutoUpdateSupported\(\)/);
});
