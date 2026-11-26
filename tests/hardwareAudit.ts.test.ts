/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHardwareHealthReportPayload,
  buildPrintableReportHtml,
  computeFutureProjection,
  computeHealthAssessment,
  evaluateCatalogGamesOnCurrentPc,
  reconcileLiveFanSensors,
} from '../src/services/hardwareIntelligence.ts';
import { selectPrimaryGpu } from '../src/services/hardwareMonitor.ts';
import { BUNDLED_HARDWARE_DATABASE } from '../src/data/hardwareDatabase.ts';
import type {
  DeepHardwareInventory,
  GameItem,
  HardwareMonitorSnapshot,
} from '../src/types.ts';

function createBaseSnapshot(overrides: Partial<HardwareMonitorSnapshot> = {}): HardwareMonitorSnapshot {
  return {
    timestamp: 1700000000000,
    platform: 'win32',
    hostname: 'WorkHost-PC',
    uptimeSeconds: 3600,
    isMonitoring: true,
    intervalMs: 1500,
    cpu: {
      model: 'AMD Ryzen 7 7800X3D',
      manufacturer: 'AMD',
      usagePercent: 22,
      temperatureCelsius: 58,
      clockSpeedGhz: 4.8,
      physicalCores: 8,
      logicalThreads: 16,
      powerWatts: 54,
      coreLoads: [],
    },
    gpus: [
      {
        id: 'gpu-0',
        model: 'NVIDIA GeForce RTX 4070',
        manufacturer: 'NVIDIA',
        utilizationPercent: 35,
        temperatureCelsius: 52,
        vramUsedMB: 2400,
        vramTotalMB: 12288,
        clockSpeedMhz: 2475,
        fanSpeedPercent: 40,
        fanSpeedRpm: 1200,
        powerWatts: 110,
      },
    ],
    ram: {
      totalBytes: 32 * 1024 ** 3,
      usedBytes: 12 * 1024 ** 3,
      availableBytes: 20 * 1024 ** 3,
      usagePercent: 37.5,
      memoryType: 'DDR5',
      speedMhz: 6000,
      populatedSlots: 2,
      channelMode: 'Dual Channel',
    },
    storage: [
      {
        id: 'drive-0',
        name: 'NVMe SSD',
        model: 'Samsung 990 PRO',
        mount: 'C:',
        driveType: 'NVMe SSD',
        totalBytes: 1000 * 1024 ** 3,
        usedBytes: 400 * 1024 ** 3,
        freeBytes: 600 * 1024 ** 3,
        usagePercent: 40,
        readBytesPerSec: 1000,
        writeBytesPerSec: 500,
        temperatureCelsius: 41,
      },
    ],
    storageTotals: {
      totalBytes: 1000 * 1024 ** 3,
      usedBytes: 400 * 1024 ** 3,
      freeBytes: 600 * 1024 ** 3,
      usagePercent: 40,
      readBytesPerSec: 1000,
      writeBytesPerSec: 500,
    },
    network: {
      activeInterface: null,
      interfaces: [],
      totalDownloadBytesPerSec: 0,
      totalUploadBytesPerSec: 0,
    },
    ...overrides,
  };
}

function createBaseInventory(overrides: Partial<DeepHardwareInventory> = {}): DeepHardwareInventory {
  return {
    collectedAt: 1700000000000,
    sourceMode: 'desktop_ipc',
    platform: 'win32',
    isElevated: true,
    detectionLimitations: [],
    system: {
      formFactor: 'desktop',
      chassisTypeLabel: 'Desktop',
      manufacturer: 'ASUS',
      model: 'Custom Workstation',
      sku: 'SKU-1234',
      family: 'Desktop',
      serialMasked: 'SYS-SERIAL-001',
      uuidMasked: 'UUID-SECRET-999',
      architecture: 'x64',
      osName: 'Windows 11 Pro',
      osVersion: '10.0.22631',
      osBuild: '22631',
      bootMode: 'UEFI',
      secureBoot: true,
      tpm: {
        present: true,
        enabled: true,
        specVersion: '2.0',
        manufacturer: 'AMD',
        status: 'detected',
        provenance: 'detected',
      },
      sensorBackends: {
        lhmRunning: true,
        ohmRunning: false,
        nvidiaSmiAvailable: true,
        smartctlAvailable: false,
      },
      provenance: 'detected',
    },
    motherboard: {
      manufacturer: 'ASUS',
      model: 'ROG STRIX B650E-F',
      version: '1.0',
      serialMasked: 'MB-SECRET-777',
      chipset: 'AMD B650E',
      socket: 'AM5',
      biosVendor: 'AMI',
      biosVersion: '2613',
      biosReleaseDate: '2024-06-01',
      memorySlotsTotal: 4,
      memorySlotsUsed: 2,
      maxRamGB: 192,
      ramGenSupported: 'DDR5',
      pcieSlots: [],
      voltages: [],
      boardTemps: [],
      provenance: 'detected',
    },
    cpu: {
      model: 'AMD Ryzen 7 7800X3D',
      manufacturer: 'AMD',
      architecture: 'x64',
      socket: 'AM5',
      physicalCores: 8,
      logicalThreads: 16,
      baseClockGhz: 4.2,
      maxBoostClockGhz: 5.05,
      l2CacheKB: 8192,
      l3CacheKB: 98304,
      stepping: '2',
      virtualizationFirmwareEnabled: true,
      hypervisorPresent: false,
      instructionSets: ['AVX2', 'AVX512'],
      throttlingState: 'none',
      provenance: 'detected',
    },
    gpus: [
      {
        id: 'dgpu-0',
        model: 'NVIDIA GeForce RTX 4070',
        vendor: 'NVIDIA',
        isIntegrated: false,
        workloadRole: 'Primary 3D Rendering',
        driverVersion: '566.14',
        driverDate: '2024-11-12',
        vramMB: 12288,
        directXFeatureLevel: '12_2',
        pnpDeviceId: 'PCI\\VEN_10DE&DEV_2786\\SECRET_GPU_ID',
        provenance: 'detected',
      },
    ],
    memory: {
      totalBytes: 32 * 1024 ** 3,
      slotsTotal: 4,
      slotsUsed: 2,
      maxCapacityBytes: 192 * 1024 ** 3,
      channelMode: 'Dual Channel',
      eccStatus: 'Non-ECC',
      pageFileTotalMB: 4096,
      pageFileUsedMB: 512,
      modules: [
        {
          bankLabel: 'BANK 0',
          deviceLocator: 'DIMM_A2',
          manufacturer: 'G.Skill',
          partNumber: 'F5-6000J3038F16G',
          serialMasked: 'SN-DIMM-987654',
          capacityBytes: 16 * 1024 ** 3,
          configuredSpeedMhz: 6000,
          ratedSpeedMhz: 6000,
          memoryType: 'DDR5',
          formFactor: 'DIMM',
          voltageMv: 1350,
          isSolderedHint: false,
          provenance: 'detected',
        },
      ],
      provenance: 'detected',
    },
    storage: [
      {
        id: 'disk-0',
        index: 0,
        friendlyName: 'Samsung SSD 990 PRO 1TB',
        model: 'Samsung SSD 990 PRO 1TB',
        vendor: 'Samsung',
        serialMasked: 'SN-NVME-112233',
        mediaType: 'NVMe SSD',
        busType: 'NVMe',
        interfaceDetail: 'NVMe (PCIe 4.0)',
        sizeBytes: 1000 * 1024 ** 3,
        temperatureC: 41,
        smartSupported: true,
        smartAvailable: true,
        smartHealthStatus: 'healthy',
        smartSource: 'CIM',
        powerOnHours: 800,
        powerCycles: 120,
        wearPercent: 2,
        remainingLifePercent: 98,
        tbwBytes: null,
        tbrBytes: null,
        reallocatedSectors: 0,
        pendingSectors: 0,
        mediaErrors: 0,
        unsafeShutdowns: 1,
        readErrorsUncorrected: 0,
        writeErrorsUncorrected: 0,
        warnings: [],
        provenance: 'measured',
      },
    ],
    fans: {
      items: [
        {
          id: 'fan-cpu',
          name: 'CPU Fan',
          role: 'cpu',
          rpm: 1450,
          percent: 55,
          minRpm: 600,
          maxRpm: 2200,
          status: 'running',
          linkedTempSensor: 'CPU Package',
          source: 'LibreHardwareMonitor WMI',
          provenance: 'measured',
        },
      ],
      totalDetectedCount: 1,
      runningCount: 1,
      stoppedCount: 0,
      sensorSource: 'LibreHardwareMonitor WMI',
      provenance: 'measured',
    },
    thermals: {
      sensors: [],
      inspectionNote: 'Test inspection note',
    },
    ports: {
      confirmedPhysical: [],
      controllers: [],
      connectedDevices: [
        {
          id: 'conn-0',
          category: 'connected_device',
          kind: 'usb',
          name: 'USB Drive mounted at C:\\Users\\AliceUser\\Vault on WorkHost-PC',
          connectorType: 'USB',
          versionOrSpec: null,
          theoreticalBandwidth: null,
          status: 'connected',
          connectedDeviceName: 'C:\\Users\\AliceUser\\Backup on WorkHost-PC',
          capabilities: [],
          confidence: 'high',
          source: 'PnP',
          provenance: 'detected',
        },
      ],
      unconfirmedPhysical: [],
      summaryNotes: [],
      provenance: 'detected',
    },
    power: {
      psuTelemetryExposed: false,
      psuNote: 'PSU not exposed',
      acAdapterConnected: null,
      powerPlan: 'Balanced',
      battery: null,
    },
    displays: [
      {
        id: 'disp-0',
        name: 'LG UltraGear',
        manufacturer: 'GSM',
        serialMasked: 'DISP-SECRET-555',
        diagonalInches: 27,
        physicalWidthMm: 600,
        physicalHeightMm: 340,
        nativeResolution: '2560 × 1440',
        currentResolution: '2560 × 1440',
        refreshRateHz: 165,
        maxRefreshRateHz: 165,
        colorDepthBits: 8,
        connectionType: 'DisplayPort',
        isInternal: false,
        isPrimary: true,
        hdrCapable: null,
        vrrCapable: null,
        gpuPnpDeviceId: 'PCI\\VEN_10DE&DEV_2786\\SECRET_GPU_ID',
        provenance: 'detected',
      },
    ],
    network: {
      adapters: [
        {
          id: 'net-0',
          name: 'Intel Wi-Fi 6E AX210',
          interfaceName: 'Wi-Fi',
          kind: 'wifi',
          status: 'Up',
          macMasked: 'AA:BB:CC:**:EE:FF',
          linkSpeedMbps: 1200,
          wifiGeneration: 'Wi-Fi 6 / 6E',
          ssid: 'MyHome_5G_SecretWiFi',
          signalQualityPercent: 88,
          rssiDbm: -56,
          driverVersion: '23.60.1.2',
          driverDate: '2024-05-01',
          provenance: 'detected',
        },
      ],
      bluetoothAdapters: [],
    },
    peripherals: [],
    otherComponents: [],
    drivers: [],
    diagnosticEvents: {
      pnpErrors: [
        {
          name: 'Device on C:\\Users\\AliceUser on WorkHost-PC',
          deviceId: 'PCI\\VEN_10DE&DEV_2684\\4&SecretDevice',
          deviceClass: 'Display',
          errorCode: 43,
          status: 'Error',
        },
      ],
      eventLogWarnings: [
        {
          id: 'evt-0',
          timestamp: '2026-11-25T10:00:00Z',
          level: 'Warning',
          providerName: 'Disk',
          eventId: 153,
          category: 'disk',
          message: 'IO warning for C:\\Users\\AliceUser on WorkHost-PC serial SN-NVME-112233',
        },
      ],
      eventLogErrorNote: null,
    },
    ...overrides,
  };
}

test('Privacy Shield redacts all sensitive identifiers in JSON and printable HTML while keeping unprotected mode intact', () => {
  const snapshot = createBaseSnapshot();
  const inventory = createBaseInventory();
  const assessment = computeHealthAssessment({
    snapshot,
    inventory,
    workload: 'gaming',
    dbEntries: BUNDLED_HARDWARE_DATABASE,
    userPsuWatts: 750,
  });

  const sensitiveMarkers = [
    'MyHome_5G_SecretWiFi',
    'SN-DIMM-987654',
    'SN-NVME-112233',
    '4&SecretDevice',
    'AliceUser',
    'WorkHost-PC',
    'SECRET_GPU_ID',
    'DISP-SECRET-555',
    'AA:BB:CC:**:EE:FF',
    'SYS-SERIAL-001',
    'UUID-SECRET-999',
    'MB-SECRET-777',
  ];

  // Privacy Shield ON
  const protectedPayload = buildHardwareHealthReportPayload({
    snapshot,
    inventory,
    assessment,
    workload: 'gaming',
    privacyShield: true,
  });
  const protectedJson = JSON.stringify(protectedPayload);
  const protectedHtml = buildPrintableReportHtml({
    snapshot,
    inventory,
    assessment,
    workload: 'gaming',
    privacyShield: true,
  });

  for (const marker of sensitiveMarkers) {
    assert.equal(protectedJson.includes(marker), false, `Protected JSON leaked marker: ${marker}`);
    assert.equal(protectedHtml.includes(marker), false, `Protected HTML leaked marker: ${marker}`);
  }

  assert.equal(protectedPayload.network.adapters[0].ssid, '[Redacted by Privacy Shield]');
  assert.equal(protectedPayload.memory.modules[0].serialMasked, '[Redacted by Privacy Shield]');
  assert.equal(protectedPayload.storage[0].serialMasked, '[Redacted by Privacy Shield]');
  assert.equal(protectedPayload.diagnosticEvents.pnpErrors[0].deviceId, '[Redacted by Privacy Shield]');
  assert.equal(protectedPayload.diagnosticEvents.eventLogWarnings[0].message, '[Redacted by Privacy Shield]');

  // Privacy Shield OFF preserves normal hardware diagnostics
  const unprotectedPayload = buildHardwareHealthReportPayload({
    snapshot,
    inventory,
    assessment,
    workload: 'gaming',
    privacyShield: false,
  });
  assert.equal(unprotectedPayload.hostname, 'WorkHost-PC');
  assert.equal(unprotectedPayload.network.adapters[0].ssid, 'MyHome_5G_SecretWiFi');
  assert.equal(unprotectedPayload.memory.modules[0].serialMasked, 'SN-DIMM-987654');
  assert.equal(unprotectedPayload.storage[0].serialMasked, 'SN-NVME-112233');
  assert.equal(unprotectedPayload.diagnosticEvents.pnpErrors[0].deviceId, 'PCI\\VEN_10DE&DEV_2684\\4&SecretDevice');
});

test('selectPrimaryGpu & computeFutureProjection pick discrete GPU over Intel Arc iGPU and AMD iGPU', () => {
  const best = selectPrimaryGpu([
    {
      id: 'igpu-intel',
      model: 'Intel(R) Arc(TM) Graphics',
      manufacturer: 'Intel Corporation',
      utilizationPercent: 5,
      temperatureCelsius: 40,
      vramUsedMB: null,
      vramTotalMB: 2048,
      clockSpeedMhz: null,
      fanSpeedPercent: null,
      fanSpeedRpm: null,
      powerWatts: null,
    },
    {
      id: 'igpu-amd',
      model: 'AMD Radeon(TM) Graphics',
      manufacturer: 'AMD',
      utilizationPercent: 2,
      temperatureCelsius: 42,
      vramUsedMB: null,
      vramTotalMB: 512,
      clockSpeedMhz: null,
      fanSpeedPercent: null,
      fanSpeedRpm: null,
      powerWatts: null,
    },
    {
      id: 'dgpu',
      model: 'NVIDIA GeForce RTX 4070',
      manufacturer: 'NVIDIA',
      utilizationPercent: 10,
      temperatureCelsius: 48,
      vramUsedMB: 1024,
      vramTotalMB: 12288,
      clockSpeedMhz: 2100,
      fanSpeedPercent: 30,
      fanSpeedRpm: 1000,
      powerWatts: 50,
    },
  ]);
  assert.equal(best?.id, 'dgpu');

  const snapshot = createBaseSnapshot({
    gpus: [
      {
        id: 'igpu-intel',
        model: 'Intel(R) Arc(TM) Graphics',
        manufacturer: 'Intel Corporation',
        utilizationPercent: 12,
        temperatureCelsius: 44,
        vramUsedMB: 512,
        vramTotalMB: 2048,
        clockSpeedMhz: null,
        fanSpeedPercent: null,
        fanSpeedRpm: null,
        powerWatts: null,
      },
      {
        id: 'dgpu',
        model: 'NVIDIA GeForce RTX 4070',
        manufacturer: 'NVIDIA',
        utilizationPercent: 0,
        temperatureCelsius: 39,
        vramUsedMB: 256,
        vramTotalMB: 12288,
        clockSpeedMhz: 210,
        fanSpeedPercent: 0,
        fanSpeedRpm: 0,
        powerWatts: 18,
      },
    ],
  });
  const inventory = createBaseInventory({
    gpus: [
      {
        id: 'dgpu',
        model: 'NVIDIA GeForce RTX 4070',
        vendor: 'NVIDIA',
        isIntegrated: false,
        workloadRole: 'Primary 3D',
        driverVersion: '566.14',
        driverDate: '2024-11-12',
        vramMB: 12288,
        directXFeatureLevel: '12_2',
        pnpDeviceId: null,
        provenance: 'detected',
      },
      {
        id: 'igpu-intel',
        model: 'Intel(R) Arc(TM) Graphics',
        vendor: 'Intel Corporation',
        isIntegrated: true,
        workloadRole: 'Display Output',
        driverVersion: '32.0.101',
        driverDate: '2024-10-01',
        vramMB: 2048,
        directXFeatureLevel: '12_2',
        pnpDeviceId: null,
        provenance: 'detected',
      },
    ],
  });

  const proj = computeFutureProjection({
    targetYear: 2030,
    snapshot,
    inventory,
    dbEntries: BUNDLED_HARDWARE_DATABASE,
  });

  const gpuFact = proj.verifiedFacts.find((line) => line.startsWith('Primary GPU:'));
  assert.ok(gpuFact);
  assert.match(gpuFact, /RTX 4070/i);
  assert.doesNotMatch(gpuFact, /Intel\(R\) Arc\(TM\) Graphics/i);
});

test('Zero fabricated hardware defaults in game compatibility and health assessment when hardware specs are unknown', () => {
  const unknownSnapshot: HardwareMonitorSnapshot = {
    timestamp: Date.now(),
    platform: 'web',
    hostname: null,
    uptimeSeconds: null,
    isMonitoring: false,
    intervalMs: 1500,
    cpu: {
      model: null,
      manufacturer: null,
      usagePercent: null,
      temperatureCelsius: null,
      clockSpeedGhz: null,
      physicalCores: null,
      logicalThreads: null,
      powerWatts: null,
      coreLoads: [],
    },
    gpus: [
      {
        id: 'unknown-0',
        model: 'Unknown GPU',
        manufacturer: null,
        utilizationPercent: null,
        temperatureCelsius: null,
        vramUsedMB: null,
        vramTotalMB: null,
        clockSpeedMhz: null,
        fanSpeedPercent: null,
        fanSpeedRpm: null,
        powerWatts: null,
      },
    ],
    ram: {
      totalBytes: 0,
      usedBytes: null,
      availableBytes: null,
      usagePercent: null,
      memoryType: null,
      speedMhz: null,
    },
    storage: [],
    storageTotals: {
      totalBytes: null,
      usedBytes: null,
      freeBytes: null,
      usagePercent: null,
      readBytesPerSec: null,
      writeBytesPerSec: null,
    },
    network: {
      activeInterface: null,
      interfaces: [],
      totalDownloadBytesPerSec: null,
      totalUploadBytesPerSec: null,
    },
  };

  const unknownInventory = createBaseInventory({
    sourceMode: 'web_browser',
    platform: 'web',
    isElevated: null,
    cpu: {
      model: null,
      manufacturer: null,
      architecture: 'web',
      socket: null,
      physicalCores: null,
      logicalThreads: null,
      baseClockGhz: null,
      maxBoostClockGhz: null,
      l2CacheKB: null,
      l3CacheKB: null,
      stepping: null,
      virtualizationFirmwareEnabled: null,
      hypervisorPresent: null,
      instructionSets: [],
      throttlingState: 'unknown',
      provenance: 'sensor_unavailable',
    },
    gpus: [
      {
        id: 'unknown-gpu',
        model: 'Unknown GPU',
        vendor: null,
        isIntegrated: true,
        workloadRole: 'Unknown',
        driverVersion: null,
        driverDate: null,
        vramMB: null,
        directXFeatureLevel: null,
        pnpDeviceId: null,
        provenance: 'sensor_unavailable',
      },
    ],
    memory: {
      totalBytes: null,
      slotsTotal: null,
      slotsUsed: null,
      maxCapacityBytes: null,
      channelMode: null,
      eccStatus: null,
      pageFileTotalMB: null,
      pageFileUsedMB: null,
      modules: [],
      provenance: 'sensor_unavailable',
    },
    storage: [],
    fans: {
      items: [],
      totalDetectedCount: 0,
      runningCount: 0,
      stoppedCount: 0,
      sensorSource: null,
      provenance: 'sensor_unavailable',
    },
  });

  const sampleGame: GameItem = {
    id: 'game-test-1',
    tab: 'game',
    category: 'Action',
    name: 'Cyber Adventure Test',
    version: '1.0',
    repackSize: '45 GB',
    repackSizeMB: 46080,
    originalSize: '90 GB',
    genreList: ['Action'],
    genresRaw: 'Action',
    languages: 'English',
    repackBy: 'Test',
    coverImage: '',
    galleryImages: [],
    galleryVideos: [],
    description: '',
    parsedRequirements: {
      os: 'Windows 10 64-bit',
      cpu: 'Intel Core i5-8400 or AMD Ryzen 5 2600',
      ram: '16 GB RAM',
      gpu: 'NVIDIA GeForce GTX 1060 6GB',
      raw: 'OS: Windows 10 64-bit\nProcessor: Intel Core i5-8400\nMemory: 16 GB RAM\nGraphics: NVIDIA GeForce GTX 1060 6GB',
    },
    parsedSteps: [],
    mirrors: [],
    primaryMagnet: null,
    trailerUrl: '',
    embedTrailerUrl: null,
    isPinned: false,
    isFree: false,
    isNew: false,
    parsedTools: [],
    dateAdded: '2026-11-25',
    dateTimestamp: 1700000000000,
    rawFields: {},
  };

  // Game evaluation must NOT fabricate 8 GB / 4 cores / 3.0 GHz / C: / 500 GB / pass status
  const [evaluated] = evaluateCatalogGamesOnCurrentPc({
    games: [sampleGame],
    snapshot: unknownSnapshot,
    inventory: unknownInventory,
    searchQuery: '',
  });
  assert.notEqual(evaluated.evaluation.status, 'can-run');
  assert.equal(evaluated.evaluation.status, 'unknown');
  for (const row of evaluated.evaluation.rows) {
    assert.notEqual(row.status, 'pass', `Row ${row.key} should not pass when hardware specs are unknown`);
    assert.doesNotMatch(row.userText, /500\s*GB|120\s*GB|8\s*GB|3\.0\s*GHz|4\s*cores/i);
  }

  // Health assessment must NOT fabricate 50 performance score, 220 GPU tier, Playable/Basic/Limited verdicts
  const health = computeHealthAssessment({
    snapshot: unknownSnapshot,
    inventory: unknownInventory,
    workload: 'gaming',
    dbEntries: BUNDLED_HARDWARE_DATABASE,
    userPsuWatts: null,
  });

  assert.equal(health.performanceCapabilityScore, null);
  assert.match(health.estimatedUsefulLifeRange, /^Unknown/i);
  for (const res of health.gamingSuitability.resolutions) {
    assert.equal(res.verdict, 'Unknown');
  }
  for (const pro of health.proCompatibility) {
    assert.equal(pro.verdict, 'Unknown');
  }
});

test('reconcileLiveFanSensors updates status dynamically across running, stopped_confirmed, abnormal_rpm, and sensor_unavailable', () => {
  const initialFans = createBaseInventory().fans.items;

  // 0 RPM -> stopped_confirmed
  const stopped = reconcileLiveFanSensors(initialFans, [
    { id: 'fan-cpu', name: 'CPU Fan', rpm: 0, percent: 0, source: 'LHM' },
  ]);
  assert.equal(stopped[0].status, 'stopped_confirmed');
  assert.equal(stopped[0].rpm, 0);
  assert.equal(stopped[0].provenance, 'measured');

  // >0 RPM -> running
  const running = reconcileLiveFanSensors(stopped, [
    { id: 'fan-cpu', name: 'CPU Fan', rpm: 1850, percent: 70, source: 'LHM' },
  ]);
  assert.equal(running[0].status, 'running');
  assert.equal(running[0].rpm, 1850);

  // Missing sensor -> sensor_unavailable
  const missing = reconcileLiveFanSensors(running, [
    { id: 'fan-cpu', name: 'CPU Fan', rpm: null, percent: null, source: 'LHM' },
  ]);
  assert.equal(missing[0].status, 'sensor_unavailable');
  assert.equal(missing[0].provenance, 'sensor_unavailable');

  // Very low non-zero RPM (<150) -> abnormal_rpm
  const abnormal = reconcileLiveFanSensors(running, [
    { id: 'fan-cpu', name: 'CPU Fan', rpm: 50, percent: 5, source: 'LHM' },
  ]);
  assert.equal(abnormal[0].status, 'abnormal_rpm');
});
