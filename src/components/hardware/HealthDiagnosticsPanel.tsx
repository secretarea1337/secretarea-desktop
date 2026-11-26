import { useState } from 'react';
import {
  ArrowClockwise,
  DownloadSimple,
  Fan,
  FilePdf,
  Heartbeat,
  ShieldCheck,
  Thermometer,
  WarningCircle,
  Wrench,
} from '@phosphor-icons/react';
import type {
  DataProvenance,
  DeepHardwareInventory,
  HardwareMonitorSnapshot,
  HealthAssessmentReport,
  WorkloadProfileId,
} from '../../types';
import {
  formatTemperatureC,
  getDesktopHardwareIntelligenceBridge,
} from '../../services/hardwareMonitor';
import {
  buildHardwareHealthReportPayload,
  buildPrintableReportHtml,
  reconcileLiveFanSensors,
} from '../../services/hardwareIntelligence';
import { ExpandablePanel, KeyValueRow, ProvenanceTag } from './SharedIntelligenceUi';

interface HealthDiagnosticsPanelProps {
  isDesktopApp: boolean;
  snapshot: HardwareMonitorSnapshot;
  inventory: DeepHardwareInventory;
  isLoadingInventory: boolean;
  onRefreshInventory: () => void;
  assessment: HealthAssessmentReport;
  workload: WorkloadProfileId;
  onChangeWorkload: (w: WorkloadProfileId) => void;
  provenanceLabels: Record<DataProvenance, string>;
  t: Record<string, string>;
}

const WORKLOAD_OPTIONS: Array<{ id: WorkloadProfileId; key: string }> = [
  { id: 'gaming', key: 'workloadGaming' },
  { id: 'office', key: 'workloadOffice' },
  { id: 'programming', key: 'workloadProgramming' },
  { id: '3d_rendering', key: 'workload3d' },
  { id: 'video_editing', key: 'workloadVideo' },
  { id: 'graphic_design', key: 'workloadDesign' },
  { id: 'ai_ml', key: 'workloadAi' },
  { id: 'professional', key: 'workloadPro' },
  { id: 'mixed', key: 'workloadMixed' },
];

export function HealthDiagnosticsPanel({
  isDesktopApp,
  snapshot,
  inventory,
  isLoadingInventory,
  onRefreshInventory,
  assessment,
  workload,
  onChangeWorkload,
  provenanceLabels,
  t,
}: HealthDiagnosticsPanelProps) {
  const [privacyShield, setPrivacyShield] = useState(true);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [driverFilter, setDriverFilter] = useState('');

  const handleExportJson = async () => {
    setExportMessage(null);
    const payload = buildHardwareHealthReportPayload({
      snapshot,
      inventory,
      assessment,
      workload,
      privacyShield,
    });
    const jsonContent = JSON.stringify(payload, null, 2);
    const bridge = getDesktopHardwareIntelligenceBridge();
    if (isDesktopApp && bridge) {
      const res = await bridge.exportReportJson({ jsonContent });
      if (res?.ok && res.filePath) {
        setExportMessage(`${t.intelExportSuccess}: ${res.filePath}`);
      }
      return;
    }
    // Browser blob download fallback
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secretarea-hardware-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage(t.intelExportSuccess);
  };

  const handleExportPdf = async () => {
    setExportMessage(null);
    const htmlContent = buildPrintableReportHtml({
      snapshot,
      inventory,
      assessment,
      workload,
      privacyShield,
    });
    const bridge = getDesktopHardwareIntelligenceBridge();
    if (isDesktopApp && bridge) {
      const res = await bridge.exportReportPdf({ htmlContent });
      if (res?.ok && res.filePath) {
        setExportMessage(`${t.intelExportSuccess}: ${res.filePath}`);
      }
      return;
    }
    // Web mode printable HTML download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secretarea-hardware-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMessage(t.intelExportHtmlWebNote);
  };

  const fanStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return { text: t.fanStatusRunning, cls: 'text-emerald-600 dark:text-[#34d399]' };
      case 'stopped_confirmed':
        return { text: t.fanStatusStopped, cls: 'text-amber-600 dark:text-amber-300' };
      case 'abnormal_rpm':
        return { text: t.fanStatusAbnormal, cls: 'text-rose-600 dark:text-[#fb7185]' };
      case 'not_detected':
        return { text: t.fanStatusNotDetected, cls: 'text-slate-500 dark:text-[#8b9bb4]' };
      case 'sensor_unavailable':
        return { text: t.fanStatusUnavailable, cls: 'text-slate-500 dark:text-[#8b9bb4]' };
      default:
        return { text: t.intelUnknown, cls: 'text-slate-500 dark:text-[#8b9bb4]' };
    }
  };

  const filteredDrivers = inventory.drivers.filter((d) => {
    const q = driverFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      d.deviceName.toLowerCase().includes(q) ||
      (d.deviceClass || '').toLowerCase().includes(q) ||
      (d.manufacturer || '').toLowerCase().includes(q)
    );
  });

  // Merge live fans from 1.5s snapshot and recompute live status/percent cleanly
  const activeFans = reconcileLiveFanSensors(
    inventory.fans.items,
    snapshot.liveSensors?.fans || []
  );

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Workload Profile + Privacy Shield + Report Export */}
      <section className="sa-ps5-panel rounded-xl bg-white dark:bg-[#171d25] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5 shadow-xs dark:shadow-md space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700 dark:text-[#cbd5e1]">
              <span className="whitespace-nowrap">{t.workloadProfileLabel}:</span>
              <select
                value={workload}
                onChange={(e) => onChangeWorkload(e.target.value as WorkloadProfileId)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.12] text-[12.5px] font-semibold text-slate-900 dark:text-white focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer"
              >
                {WORKLOAD_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {t[opt.key] || opt.id}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onRefreshInventory}
              disabled={isLoadingInventory}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] text-[12px] font-semibold text-slate-700 dark:text-[#d5e0ee] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <ArrowClockwise className={`w-4 h-4 ${isLoadingInventory ? 'motion-safe:animate-spin' : ''}`} />
              <span>{t.intelRefreshDeepScan}</span>
            </button>
          </div>

          {/* Privacy Shield & Report Exports */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPrivacyShield((p) => !p)}
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                privacyShield
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-[#34d399]'
                  : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#9cb0c9]'
              }`}
            >
              <ShieldCheck weight="duotone" className="w-4 h-4 shrink-0" />
              <span>{privacyShield ? t.intelPrivacyOn : t.intelPrivacyOff}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportJson()}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1f2835] dark:hover:bg-[#293546] border border-slate-200 dark:border-white/[0.1] text-[12px] font-semibold text-slate-800 dark:text-white whitespace-nowrap cursor-pointer transition-colors"
            >
              <DownloadSimple className="w-4 h-4 shrink-0" />
              <span>{t.intelExportJson}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7] text-white text-[12px] font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              <FilePdf className="w-4 h-4 shrink-0" />
              <span>{isDesktopApp ? t.intelExportPdf : t.intelExportHtml}</span>
            </button>
          </div>
        </div>

        {exportMessage && (
          <div className="rounded-lg bg-sky-50 dark:bg-[#38bdf8]/10 border border-sky-200 dark:border-[#38bdf8]/25 px-3 py-2 text-[12px] text-sky-900 dark:text-[#bae6fd]">
            {exportMessage}
          </div>
        )}

        {inventory.detectionLimitations.length > 0 && (
          <div className="rounded-lg bg-amber-50/80 dark:bg-amber-500/[0.07] border border-amber-200 dark:border-amber-400/25 px-3.5 py-2.5 text-[12px] text-amber-900 dark:text-amber-200 space-y-1">
            {inventory.detectionLimitations.map((lim, i) => (
              <p key={i} className="leading-relaxed">
                {lim}
              </p>
            ))}
          </div>
        )}

        {/* 4 Distinct Smart Health KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 pt-1">
          <div className="sa-ps5-subpanel rounded-xl bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.healthPhysicalTitle}
              </span>
              <ProvenanceTag
                provenance={assessment.overallPhysicalHealthScore !== null ? 'measured' : 'sensor_unavailable'}
                labels={provenanceLabels}
              />
            </div>
            <div dir="ltr" className="text-[24px] font-display font-bold font-mono-tabular text-slate-900 dark:text-white">
              {assessment.overallPhysicalHealthScore !== null
                ? `${assessment.overallPhysicalHealthScore} / 100`
                : t.naValue}
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
              {assessment.measuredComponentsCount} / {assessment.totalComponentsCount} {t.healthMeasuredCoverage}
            </p>
          </div>

          <div className="sa-ps5-subpanel rounded-xl bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.healthPerformanceTitle}
              </span>
              <ProvenanceTag provenance="estimated" labels={provenanceLabels} />
            </div>
            <div dir="ltr" className="text-[24px] font-display font-bold font-mono-tabular text-[#0284c7] dark:text-[#38bdf8]">
              {assessment.performanceCapabilityScore !== null
                ? `${assessment.performanceCapabilityScore} / 100`
                : t.naValue}
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4] truncate">
              {assessment.bottleneckSummary.primaryLimitingFactor}
            </p>
          </div>

          <div className="sa-ps5-subpanel rounded-xl bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.healthAgeTitle}
              </span>
              <ProvenanceTag
                provenance={assessment.oldestDetectedComponentYear ? 'manufacturer_spec' : 'unknown'}
                labels={provenanceLabels}
              />
            </div>
            <div className="text-[15px] font-display font-bold text-slate-900 dark:text-white leading-snug pt-0.5">
              {assessment.hardwareAgeLabel}
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-[#8b9bb4]">
              {t.healthAgeNote}
            </p>
          </div>

          <div className="sa-ps5-subpanel rounded-xl bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.healthLifespanTitle}
              </span>
              <ProvenanceTag provenance="estimated" labels={provenanceLabels} />
            </div>
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug pt-0.5">
              {assessment.estimatedUsefulLifeRange}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#8b9bb4]">
              {t.healthLifespanDisclaimer}
            </p>
          </div>
        </div>
      </section>

      {/* Component Health Breakdown & Bottleneck Summary */}
      <ExpandablePanel
        title={t.healthBreakdownTitle}
        subtitle={assessment.bottleneckSummary.explanation}
        icon={<Heartbeat weight="duotone" className="w-4.5 h-4.5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {assessment.componentScores.map((c) => {
            const tone =
              c.status === 'healthy'
                ? 'text-emerald-600 dark:text-[#34d399]'
                : c.status === 'fair'
                ? 'text-[#0284c7] dark:text-[#38bdf8]'
                : c.status === 'warning'
                ? 'text-amber-600 dark:text-[#fbbf24]'
                : c.status === 'critical'
                ? 'text-rose-600 dark:text-[#fb7185]'
                : 'text-slate-500 dark:text-[#8b9bb4]';
            return (
              <div
                key={c.id}
                className="sa-ps5-subpanel rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white">{c.label}</span>
                  <ProvenanceTag provenance={c.provenance} labels={provenanceLabels} />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span dir="ltr" className={`text-[18px] font-bold font-mono-tabular ${tone}`}>
                    {c.score !== null ? `${c.score} / 100` : t.intelUnavailable}
                  </span>
                  <span className={`text-[11px] font-semibold uppercase ${tone}`}>{c.status}</span>
                </div>
                <p className="text-[12px] text-slate-600 dark:text-[#9cb0c9] leading-relaxed">{c.summary}</p>
              </div>
            );
          })}
        </div>
      </ExpandablePanel>

      {/* Fans, Cooling & Thermal Diagnostics */}
      <ExpandablePanel
        title={t.thermalCoolingTitle}
        subtitle={
          inventory.fans.sensorSource
            ? `${t.intelSourceLabel}: ${inventory.fans.sensorSource}`
            : t.fanNoSourceHint
        }
        icon={<Fan weight="duotone" className="w-4.5 h-4.5" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Fans Inventory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.fansDetectedHeader} ({activeFans.length})
              </h4>
              <ProvenanceTag provenance={activeFans.length > 0 ? 'measured' : 'sensor_unavailable'} labels={provenanceLabels} />
            </div>
            {activeFans.length === 0 ? (
              <div className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-4 text-[12.5px] text-slate-600 dark:text-[#9cb0c9] leading-relaxed">
                {t.fansUnavailableBody}
              </div>
            ) : (
              <div className="space-y-2">
                {activeFans.map((fan) => {
                  const st = fanStatusBadge(fan.status);
                  return (
                    <div
                      key={fan.id}
                      className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {fan.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#8b9bb4] truncate">
                          {fan.source}
                          {fan.minRpm !== null && fan.maxRpm !== null
                            ? ` · Min ${fan.minRpm} / Max ${fan.maxRpm} RPM`
                            : ''}
                        </div>
                      </div>
                      <div className="text-end shrink-0">
                        <div dir="ltr" className="text-[13px] font-mono-tabular font-bold text-slate-900 dark:text-white">
                          {fan.rpm !== null
                            ? `${fan.rpm} RPM`
                            : fan.percent !== null
                            ? `${fan.percent}%`
                            : t.naValue}
                        </div>
                        <div className={`text-[11px] font-semibold ${st.cls}`}>{st.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Temperature Sensors + Inspection Disclaimer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.thermalSensorsHeader}
              </h4>
              <Thermometer className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8]" />
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3.5 space-y-1">
              <KeyValueRow
                label={t.cpuTitle}
                value={formatTemperatureC(snapshot.cpu.temperatureCelsius, t.intelSensorUnavailable)}
                ltr
              />
              {snapshot.gpus.map((g) => (
                <KeyValueRow
                  key={g.id}
                  label={g.model || t.gpuTitle}
                  value={`${formatTemperatureC(g.temperatureCelsius, t.intelSensorUnavailable)}${
                    typeof g.hotspotTempCelsius === 'number'
                      ? ` (Hotspot ${Math.round(g.hotspotTempCelsius)} °C)`
                      : ''
                  }`}
                  ltr
                />
              ))}
              {inventory.storage.map((d) => (
                <KeyValueRow
                  key={d.id}
                  label={d.friendlyName}
                  value={formatTemperatureC(d.temperatureC, t.intelSensorUnavailable)}
                  ltr
                />
              ))}
              {inventory.thermals.sensors
                .filter((s) => s.category === 'motherboard' || s.category === 'chipset' || s.category === 'vram')
                .slice(0, 6)
                .map((s) => (
                  <KeyValueRow
                    key={s.id}
                    label={s.name}
                    value={s.value !== null ? `${s.value} °C` : t.naValue}
                    ltr
                  />
                ))}
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-400/25 px-3.5 py-2.5 text-[11.5px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>{t.thermalPhysicalNoticeTitle}:</strong> {inventory.thermals.inspectionNote}
            </div>
          </div>
        </div>
      </ExpandablePanel>

      {/* Hardware Errors, Event Viewer & Signed Drivers */}
      <ExpandablePanel
        title={t.errorsDriversTitle}
        subtitle={t.errorsDriversSubtitle}
        icon={<Wrench weight="duotone" className="w-4.5 h-4.5" />}
        defaultExpanded={false}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Device Manager PnP Errors */}
            <div className="space-y-2">
              <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.pnpErrorsHeader} ({inventory.diagnosticEvents.pnpErrors.length})
              </h4>
              {inventory.diagnosticEvents.pnpErrors.length === 0 ? (
                <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-500/[0.08] border border-emerald-200 dark:border-emerald-400/25 p-3 text-[12px] text-emerald-800 dark:text-[#34d399]">
                  {isDesktopApp ? t.pnpNoErrors : t.desktopOnlyHint}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pe-1">
                  {inventory.diagnosticEvents.pnpErrors.map((err, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/25 p-3 text-[12px]"
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-rose-900 dark:text-rose-200">
                        <span className="flex items-center gap-1.5">
                          <WarningCircle className="w-4 h-4 shrink-0" />
                          {err.name}
                        </span>
                        <span dir="ltr" className="font-mono-tabular">
                          Code {err.errorCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5 truncate" dir="ltr">
                        {err.deviceClass} · {err.deviceId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Viewer Hardware / Driver Warnings */}
            <div className="space-y-2">
              <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                {t.eventLogsHeader} ({inventory.diagnosticEvents.eventLogWarnings.length})
              </h4>
              {inventory.diagnosticEvents.eventLogErrorNote && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/25 p-3 text-[12px] text-amber-800 dark:text-amber-200">
                  {inventory.diagnosticEvents.eventLogErrorNote}
                </div>
              )}
              {inventory.diagnosticEvents.eventLogWarnings.length === 0 ? (
                <div className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px] text-slate-600 dark:text-[#9cb0c9]">
                  {t.eventLogsEmpty}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pe-1">
                  {inventory.diagnosticEvents.eventLogWarnings.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200/80 dark:border-white/[0.06] p-3 text-[12px] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {ev.providerName} (#{ev.eventId})
                        </span>
                        <span className="text-[11px] font-semibold uppercase text-amber-600 dark:text-amber-300">
                          {ev.level} · {ev.category}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-[#9cb0c9] text-[11.5px] leading-snug">
                        {ev.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Signed Hardware Drivers Table */}
          {inventory.drivers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-[12.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8b9bb4]">
                  {t.signedDriversHeader} ({filteredDrivers.length})
                </h4>
                <input
                  type="search"
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  placeholder={t.searchDriversPlaceholder}
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-50 dark:bg-[#10151c] border border-slate-200 dark:border-white/[0.12] text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#0284c7] focus:outline-none w-full sm:w-64"
                />
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/[0.08] max-h-72">
                <table className="w-full text-start text-[12px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-[#10151c] text-slate-600 dark:text-[#8b9bb4] sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">{t.driverDeviceCol}</th>
                      <th className="py-2 px-3 font-semibold">{t.driverClassCol}</th>
                      <th className="py-2 px-3 font-semibold">{t.driverVersionCol}</th>
                      <th className="py-2 px-3 font-semibold">{t.driverDateCol}</th>
                      <th className="py-2 px-3 font-semibold">{t.driverSignedCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {filteredDrivers.map((drv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{drv.deviceName}</td>
                        <td className="py-2 px-3 text-slate-500 dark:text-[#8b9bb4]">{drv.deviceClass || t.naValue}</td>
                        <td dir="ltr" className="py-2 px-3 font-mono-tabular text-slate-700 dark:text-[#cbd5e1]">
                          {drv.driverVersion || t.naValue}
                        </td>
                        <td dir="ltr" className="py-2 px-3 font-mono-tabular text-slate-500 dark:text-[#8b9bb4]">
                          {drv.driverDate || t.naValue}
                        </td>
                        <td className="py-2 px-3">
                          {drv.isSigned === true ? (
                            <span className="text-emerald-600 dark:text-[#34d399] font-semibold">
                              {t.driverSigned}
                            </span>
                          ) : drv.isSigned === false ? (
                            <span className="text-rose-600 dark:text-[#fb7185] font-semibold">
                              {t.driverUnsigned}
                            </span>
                          ) : (
                            t.naValue
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </ExpandablePanel>
    </div>
  );
}
