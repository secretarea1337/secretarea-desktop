import { useState } from 'react';
import {
  BatteryCharging,
  Circuitry,
  Cpu,
  DesktopTower,
  GraphicsCard,
  HardDrive,
  Laptop,
  Memory,
  Monitor,
  Plug,
  Usb,
  WifiHigh,
} from '@phosphor-icons/react';
import type {
  DataProvenance,
  DeepHardwareInventory,
  HardwareMonitorSnapshot,
  PortEntry,
} from '../../types';
import {
  formatStorageBytes,
  formatTemperatureC,
} from '../../services/hardwareMonitor';
import { ExpandablePanel, KeyValueRow, ProvenanceTag } from './SharedIntelligenceUi';

interface SystemInventoryPortsPanelProps {
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  provenanceLabels: Record<DataProvenance, string>;
  t: Record<string, string>;
}

type PortBucketTab = 'confirmed_physical' | 'controller' | 'connected_device' | 'unconfirmed_physical';

export function SystemInventoryPortsPanel({
  snapshot,
  inventory,
  provenanceLabels,
  t,
}: SystemInventoryPortsPanelProps) {
  const [portTab, setPortTab] = useState<PortBucketTab>('confirmed_physical');

  const isLaptop =
    inventory.system.formFactor === 'laptop' || inventory.system.formFactor === 'tablet_convertible';

  const portLists: Record<PortBucketTab, PortEntry[]> = {
    confirmed_physical: inventory.ports.confirmedPhysical,
    controller: inventory.ports.controllers,
    connected_device: inventory.ports.connectedDevices,
    unconfirmed_physical: inventory.ports.unconfirmedPhysical,
  };
  const visiblePorts = portLists[portTab];

  const smartBadgeClass = (st: string) => {
    switch (st) {
      case 'healthy':
        return 'text-emerald-600 dark:text-[#34d399]';
      case 'warning':
        return 'text-amber-600 dark:text-[#fbbf24]';
      case 'critical':
        return 'text-rose-600 dark:text-[#fb7185]';
      default:
        return 'text-slate-500 dark:text-[#8b9bb4]';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. System Identification & Motherboard Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpandablePanel
          title={t.sysIdTitle}
          subtitle={inventory.system.chassisTypeLabel || inventory.system.formFactor.toUpperCase()}
          icon={isLaptop ? <Laptop weight="duotone" className="w-4.5 h-4.5" /> : <DesktopTower weight="duotone" className="w-4.5 h-4.5" />}
          rightSlot={<ProvenanceTag provenance={inventory.system.provenance} labels={provenanceLabels} />}
        >
          <div className="space-y-0.5">
            <KeyValueRow label={t.sysFormFactor} value={inventory.system.formFactor.toUpperCase()} />
            <KeyValueRow label={t.manufacturerLabel} value={inventory.system.manufacturer || t.naValue} />
            <KeyValueRow label={t.modelLabel} value={inventory.system.model || t.naValue} />
            <KeyValueRow label={t.sysSku} value={inventory.system.sku || t.naValue} ltr />
            <KeyValueRow label={t.sysSerialMasked} value={inventory.system.serialMasked || t.naValue} ltr />
            <KeyValueRow label={t.sysOsBuild} value={`${inventory.system.osName || t.naValue}${inventory.system.osBuild ? ` (${inventory.system.osBuild})` : ''}`} />
            <KeyValueRow label={t.sysArch} value={inventory.system.architecture} ltr />
            <KeyValueRow label={t.sysBootMode} value={inventory.system.bootMode} ltr />
            <KeyValueRow
              label={t.sysSecureBoot}
              value={
                inventory.system.secureBoot === true
                  ? 'Enabled'
                  : inventory.system.secureBoot === false
                  ? 'Disabled'
                  : t.intelUnknown
              }
            />
            <KeyValueRow
              label={t.sysTpm}
              value={
                inventory.system.tpm.present
                  ? `${inventory.system.tpm.enabled ? 'Enabled' : 'Present'} (${inventory.system.tpm.specVersion || '2.0'})`
                  : t.intelNotDetected
              }
              ltr
            />
            <KeyValueRow
              label={t.sysSensorBackends}
              value={
                [
                  inventory.system.sensorBackends.lhmRunning ? 'LHM' : null,
                  inventory.system.sensorBackends.ohmRunning ? 'OHM' : null,
                  inventory.system.sensorBackends.nvidiaSmiAvailable ? 'nvidia-smi' : null,
                  inventory.system.sensorBackends.smartctlAvailable ? 'smartctl' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'OS Built-in CIM/WMI'
              }
            />
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title={t.moboTitle}
          subtitle={`${inventory.motherboard.manufacturer || ''} ${inventory.motherboard.model || ''}`.trim() || t.intelUnavailable}
          icon={<Circuitry weight="duotone" className="w-4.5 h-4.5" />}
          rightSlot={<ProvenanceTag provenance={inventory.motherboard.provenance} labels={provenanceLabels} />}
        >
          <div className="space-y-0.5">
            <KeyValueRow label={t.manufacturerLabel} value={inventory.motherboard.manufacturer || t.naValue} />
            <KeyValueRow label={t.modelLabel} value={inventory.motherboard.model || t.naValue} />
            <KeyValueRow label={t.moboChipset} value={inventory.motherboard.chipset || t.intelUnknown} ltr />
            <KeyValueRow label={t.moboSocket} value={inventory.motherboard.socket || t.intelUnknown} ltr />
            <KeyValueRow
              label={t.moboBios}
              value={`${inventory.motherboard.biosVendor || ''} ${inventory.motherboard.biosVersion || t.naValue}`.trim()}
              ltr
            />
            <KeyValueRow label={t.moboBiosDate} value={inventory.motherboard.biosReleaseDate || t.naValue} ltr />
            <KeyValueRow
              label={t.moboRamSupport}
              value={`${inventory.motherboard.ramGenSupported || t.naValue} · ${
                inventory.motherboard.memorySlotsUsed ?? '?'
              }/${inventory.motherboard.memorySlotsTotal ?? '?'} slots${
                inventory.motherboard.maxRamGB ? ` (Max ${inventory.motherboard.maxRamGB} GB)` : ''
              }`}
              ltr
            />
          </div>

          {inventory.motherboard.pcieSlots.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.moboPcieSlots}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {inventory.motherboard.pcieSlots.slice(0, 8).map((sl, i) => (
                  <div
                    key={i}
                    className="rounded-md bg-slate-50 dark:bg-[#10151c] border border-slate-200/70 dark:border-white/[0.05] px-2.5 py-1.5 text-[11.5px] flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-slate-800 dark:text-[#e2eaf4] truncate">
                      {sl.designation} {sl.laneWidth ? `(${sl.laneWidth})` : ''}
                    </span>
                    <span
                      className={
                        sl.currentUsage === 'In Use'
                          ? 'text-[#0284c7] dark:text-[#38bdf8] font-semibold shrink-0'
                          : 'text-emerald-600 dark:text-[#34d399] font-semibold shrink-0'
                      }
                    >
                      {sl.currentUsage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ExpandablePanel>
      </div>

      {/* 2. Physical Ports & Connectors (Major Feature — 4 Strict Categories) */}
      <ExpandablePanel
        title={t.portsTitle}
        subtitle={t.portsSubtitle}
        icon={<Plug weight="duotone" className="w-4.5 h-4.5" />}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-sky-50/80 dark:bg-[#38bdf8]/10 border border-sky-200 dark:border-[#38bdf8]/25 px-3.5 py-2.5 text-[12px] text-sky-900 dark:text-[#bae6fd]">
            {t.portsHonestyBanner}
          </div>

          {/* 4-Category Port Switcher */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'confirmed_physical', label: t.portsTabConfirmed, count: inventory.ports.confirmedPhysical.length },
                { id: 'controller', label: t.portsTabControllers, count: inventory.ports.controllers.length },
                { id: 'connected_device', label: t.portsTabConnected, count: inventory.ports.connectedDevices.length },
                { id: 'unconfirmed_physical', label: t.portsTabUnconfirmed, count: inventory.ports.unconfirmedPhysical.length },
              ] as const
            ).map((tab) => {
              const active = portTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPortTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#0284c7] dark:bg-[#0ea5e9] border-[#0284c7] text-white'
                      : 'bg-slate-50 dark:bg-[#10151c] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-[#1e2633]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span dir="ltr" className="font-mono-tabular opacity-85">
                    ({tab.count})
                  </span>
                </button>
              );
            })}
          </div>

          {inventory.ports.summaryNotes.length > 0 && (
            <div className="text-[12px] text-amber-700 dark:text-amber-300">
              {inventory.ports.summaryNotes.join(' ')}
            </div>
          )}

          {visiblePorts.length === 0 ? (
            <div className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">
              {t.portsBucketEmpty}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {visiblePorts.map((p) => (
                <div
                  key={p.id}
                  className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate" title={p.name}>
                        {p.name}
                      </div>
                      <div className="text-[11.5px] text-[#0284c7] dark:text-[#38bdf8] font-medium truncate">
                        {p.connectorType || p.kind.toUpperCase()}
                      </div>
                    </div>
                    <ProvenanceTag provenance={p.provenance} labels={provenanceLabels} />
                  </div>
                  <div className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9] space-y-0.5">
                    {p.versionOrSpec && <div>{p.versionOrSpec}</div>}
                    {p.theoreticalBandwidth && (
                      <div dir="ltr" className="font-mono-tabular">
                        Max Spec: {p.theoreticalBandwidth}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 dark:text-[#7c8da6] truncate">
                      {p.source} · {p.confidence.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ExpandablePanel>

      {/* 3. Storage Health & SMART Deep Diagnostics */}
      <ExpandablePanel
        title={t.storageSmartTitle}
        subtitle={t.storageSmartSubtitle}
        icon={<HardDrive weight="duotone" className="w-4.5 h-4.5" />}
      >
        {inventory.storage.length === 0 ? (
          <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">{t.noStorageDetected}</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {inventory.storage.map((d) => (
              <div
                key={d.id}
                className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-[13.5px] font-bold text-slate-900 dark:text-white truncate">
                      {d.friendlyName}
                    </h4>
                    <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
                      {d.interfaceDetail || d.mediaType} · {formatStorageBytes(d.sizeBytes, t.naValue)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[12px] font-bold uppercase ${smartBadgeClass(d.smartHealthStatus)}`}>
                      {d.smartHealthStatus === 'unavailable' ? t.smartUnavailable : d.smartHealthStatus}
                    </div>
                    <ProvenanceTag provenance={d.provenance} labels={provenanceLabels} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11.5px]">
                  <div>
                    <span className="text-slate-500 dark:text-[#8b9bb4] block">{t.temperatureLabel}</span>
                    <strong dir="ltr" className="font-mono-tabular text-slate-900 dark:text-white">
                      {formatTemperatureC(d.temperatureC, t.intelUnavailable)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-[#8b9bb4] block">{t.smartWearLabel}</span>
                    <strong dir="ltr" className="font-mono-tabular text-slate-900 dark:text-white">
                      {d.wearPercent !== null ? `${d.wearPercent}% (${d.remainingLifePercent}% left)` : t.intelUnavailable}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-[#8b9bb4] block">{t.smartPohLabel}</span>
                    <strong dir="ltr" className="font-mono-tabular text-slate-900 dark:text-white">
                      {d.powerOnHours !== null ? `${d.powerOnHours.toLocaleString()} h` : t.intelUnavailable}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-[#8b9bb4] block">{t.smartCyclesLabel}</span>
                    <strong dir="ltr" className="font-mono-tabular text-slate-900 dark:text-white">
                      {d.powerCycles !== null ? d.powerCycles.toLocaleString() : t.intelUnavailable}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-[#8b9bb4] block">{t.smartErrorsLabel}</span>
                    <strong dir="ltr" className="font-mono-tabular text-slate-900 dark:text-white">
                      {d.mediaErrors !== null ? String(d.mediaErrors) : t.intelUnavailable}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-[#8b9bb4] block">{t.sysSerialMasked}</span>
                    <strong dir="ltr" className="font-mono-tabular text-slate-900 dark:text-white">
                      {d.serialMasked || t.naValue}
                    </strong>
                  </div>
                </div>

                {d.warnings.length > 0 && (
                  <div className="text-[11.5px] text-amber-700 dark:text-amber-300 pt-1">
                    {d.warnings.join(' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ExpandablePanel>

      {/* 4. Expanded CPU, Multi-GPU & Per-DIMM RAM Details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ExpandablePanel
          title={t.cpuGpuDeepTitle}
          icon={<Cpu weight="duotone" className="w-4.5 h-4.5" />}
          defaultExpanded={false}
        >
          <div className="space-y-4">
            <div className="space-y-0.5">
              <KeyValueRow label={t.cpuTitle} value={inventory.cpu.model || snapshot.cpu.model || t.naValue} />
              <KeyValueRow
                label={t.coresThreadsLabel}
                value={`${inventory.cpu.physicalCores ?? snapshot.cpu.physicalCores ?? '?'}C / ${inventory.cpu.logicalThreads ?? snapshot.cpu.logicalThreads ?? '?'}T`}
                ltr
              />
              <KeyValueRow
                label={t.cpuCacheLabel}
                value={`L2: ${inventory.cpu.l2CacheKB ? `${inventory.cpu.l2CacheKB} KB` : t.naValue} · L3: ${inventory.cpu.l3CacheKB ? `${Math.round(inventory.cpu.l3CacheKB / 1024)} MB` : t.naValue}`}
                ltr
              />
              <KeyValueRow
                label={t.cpuVirtLabel}
                value={
                  inventory.cpu.virtualizationFirmwareEnabled === true
                    ? 'Enabled in Firmware'
                    : inventory.cpu.virtualizationFirmwareEnabled === false
                    ? 'Disabled in BIOS'
                    : t.intelUnknown
                }
              />
              <KeyValueRow
                label={t.cpuVoltageLabel}
                value={typeof snapshot.cpu.voltageVolts === 'number' ? `${snapshot.cpu.voltageVolts} V` : t.intelSensorUnavailable}
                ltr
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                <GraphicsCard className="w-4 h-4" />
                <span>{t.multiGpuRolesHeader} ({inventory.gpus.length})</span>
              </div>
              {inventory.gpus.map((g) => (
                <div
                  key={g.id}
                  className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{g.model}</span>
                    <span className="text-[11px] font-semibold text-[#0284c7] dark:text-[#38bdf8]">
                      {g.isIntegrated ? 'iGPU (Integrated)' : 'dGPU (Discrete)'}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-[#9cb0c9]">{g.workloadRole}</div>
                  <div dir="ltr" className="text-[11px] font-mono-tabular text-slate-500 dark:text-[#7c8da6]">
                    Driver: {g.driverVersion || t.naValue} {g.driverDate ? `(${g.driverDate})` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ExpandablePanel>

        <ExpandablePanel
          title={t.ramDimmsTitle}
          subtitle={`${inventory.memory.slotsUsed ?? '?'} / ${inventory.memory.slotsTotal ?? '?'} ${t.ramSlotsLabel} · ${inventory.memory.channelMode || t.intelUnknown}`}
          icon={<Memory weight="duotone" className="w-4.5 h-4.5" />}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            <div className="space-y-0.5">
              <KeyValueRow label={t.ramEccLabel} value={inventory.memory.eccStatus || t.intelUnknown} />
              <KeyValueRow
                label={t.ramPagefileLabel}
                value={
                  inventory.memory.pageFileTotalMB !== null
                    ? `${inventory.memory.pageFileUsedMB ?? 0} MB used / ${inventory.memory.pageFileTotalMB} MB allocated`
                    : t.intelUnavailable
                }
                ltr
              />
            </div>

            {inventory.memory.modules.length === 0 ? (
              <p className="text-[12px] text-slate-500 dark:text-[#8b9bb4]">{t.ramDimmsUnavailable}</p>
            ) : (
              <div className="space-y-2">
                {inventory.memory.modules.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px]"
                  >
                    <div className="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
                      <span>{m.deviceLocator || m.bankLabel || `Slot ${i + 1}`}</span>
                      <span dir="ltr" className="font-mono-tabular">
                        {formatStorageBytes(m.capacityBytes, t.naValue)} {m.memoryType || ''}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-slate-600 dark:text-[#9cb0c9] mt-0.5" dir="ltr">
                      {m.manufacturer || 'Unknown Vendor'} · {m.partNumber || 'Part N/A'} ·{' '}
                      {m.configuredSpeedMhz || m.ratedSpeedMhz ? `${m.configuredSpeedMhz || m.ratedSpeedMhz} MT/s` : 'Speed N/A'}
                      {m.formFactor ? ` · ${m.formFactor}` : ''}
                      {m.isSolderedHint ? ' · Soldered' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ExpandablePanel>
      </div>

      {/* 5. Displays (EDID), Power/PSU/Battery, Network & Peripherals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ExpandablePanel
          title={t.displaysDeepTitle}
          icon={<Monitor weight="duotone" className="w-4.5 h-4.5" />}
          defaultExpanded={false}
        >
          {inventory.displays.length === 0 ? (
            <p className="text-[12.5px] text-slate-500 dark:text-[#8b9bb4]">{t.intelUnavailable}</p>
          ) : (
            <div className="space-y-2.5">
              {inventory.displays.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
                    <span>
                      {d.name} {d.diagonalInches ? `(${d.diagonalInches}")` : ''}
                    </span>
                    <span className="text-[11px] text-[#0284c7] dark:text-[#38bdf8]">
                      {d.isInternal ? 'Internal Panel' : 'External'} {d.isPrimary ? '· Primary' : ''}
                    </span>
                  </div>
                  <div dir="ltr" className="font-mono-tabular text-[11.5px] text-slate-600 dark:text-[#9cb0c9]">
                    {d.currentResolution || t.naValue} @ {d.refreshRateHz ? `${d.refreshRateHz} Hz` : '? Hz'} ·{' '}
                    {d.connectionType || 'Connection N/A'}
                    {d.colorDepthBits ? ` · ${d.colorDepthBits}-bit` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ExpandablePanel>

        <ExpandablePanel
          title={t.powerPsuBatteryTitle}
          icon={<BatteryCharging weight="duotone" className="w-4.5 h-4.5" />}
          defaultExpanded={false}
        >
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px] text-slate-600 dark:text-[#9cb0c9] leading-relaxed">
              <strong className="text-slate-900 dark:text-white block mb-1">{t.psuTelemetryHeader}</strong>
              {inventory.power.psuNote}
            </div>
            {inventory.power.battery?.present && (
              <div className="space-y-0.5">
                <KeyValueRow label={t.laptopBatteryLabel} value={`${inventory.power.battery.chargePercent ?? '?'}%`} ltr />
                <KeyValueRow
                  label={t.laptopHealthLabel}
                  value={
                    inventory.power.battery.healthPercent !== null
                      ? `${inventory.power.battery.healthPercent}% (${inventory.power.battery.wearPercent}% wear)`
                      : t.intelUnavailable
                  }
                  ltr
                />
                <KeyValueRow
                  label={t.batteryDesignVsFull}
                  value={
                    inventory.power.battery.designCapacityMwh && inventory.power.battery.fullChargeCapacityMwh
                      ? `${inventory.power.battery.fullChargeCapacityMwh} / ${inventory.power.battery.designCapacityMwh} mWh`
                      : t.intelUnavailable
                  }
                  ltr
                />
                <KeyValueRow
                  label={t.batteryCyclesLabel}
                  value={
                    inventory.power.battery.cycleCount !== null
                      ? String(inventory.power.battery.cycleCount)
                      : t.intelUnavailable
                  }
                  ltr
                />
                <KeyValueRow
                  label={t.batteryRateLabel}
                  value={
                    inventory.power.battery.chargeRateWatts !== null
                      ? `${inventory.power.battery.chargeRateWatts} W`
                      : t.intelUnavailable
                  }
                  ltr
                />
              </div>
            )}
          </div>
        </ExpandablePanel>
      </div>

      {/* 6. Network & Connected Peripherals / System Components */}
      <ExpandablePanel
        title={t.peripheralsNetTitle}
        subtitle={`${inventory.network.adapters.length} ${t.adaptersLabel} · ${inventory.peripherals.length} ${t.peripheralsLabel} · ${inventory.otherComponents.length} ${t.systemComponentsLabel}`}
        icon={<Usb weight="duotone" className="w-4.5 h-4.5" />}
        defaultExpanded={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Network & Wi-Fi / BT */}
          <div className="space-y-2.5">
            <h4 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
              <WifiHigh className="w-4 h-4" />
              <span>{t.networkTitle}</span>
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {inventory.network.adapters
                .filter((a) => a.kind !== 'virtual')
                .map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2 font-bold text-slate-900 dark:text-white">
                      <span className="truncate">{a.name}</span>
                      <span className="text-[11px] uppercase text-[#0284c7] dark:text-[#38bdf8] shrink-0">
                        {a.kind} · {a.status}
                      </span>
                    </div>
                    <div dir="ltr" className="text-[11.5px] font-mono-tabular text-slate-600 dark:text-[#9cb0c9]">
                      Link: {a.linkSpeedMbps ? `${a.linkSpeedMbps} Mbps` : t.naValue}
                      {a.wifiGeneration ? ` · ${a.wifiGeneration}` : ''}
                      {a.signalQualityPercent !== null ? ` · Signal ${a.signalQualityPercent}% (${a.rssiDbm} dBm)` : ''}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Connected Peripherals & Other System Components */}
          <div className="space-y-2.5">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
              {t.peripheralsLabel} & {t.systemComponentsLabel}
            </h4>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {inventory.peripherals.length === 0 && inventory.otherComponents.length === 0 ? (
                <div className="text-[12px] text-slate-500 dark:text-[#8b9bb4]">{t.desktopOnlyHint}</div>
              ) : (
                <>
                  {inventory.peripherals.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-md bg-slate-50 dark:bg-[#10151c] border border-slate-200/70 dark:border-white/[0.05] px-3 py-2 text-[12px] flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
                      <span className="text-[11px] uppercase text-slate-500 dark:text-[#8b9bb4] shrink-0">
                        {p.category.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {inventory.otherComponents.slice(0, 20).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md bg-slate-50 dark:bg-[#10151c] border border-slate-200/70 dark:border-white/[0.05] px-3 py-2 text-[12px] flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-slate-700 dark:text-[#cbd5e1] truncate">{c.name}</span>
                      <span className="text-[11px] uppercase text-slate-500 dark:text-[#8b9bb4] shrink-0">
                        {c.category.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </ExpandablePanel>
    </div>
  );
}
