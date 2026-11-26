# Third-Party Open-Source Software & License Notices

SecretArea Desktop strictly enforces an **Open-Source & Free Eligibility Policy** for external hardware diagnostic tools and telemetry libraries:

- Only genuinely open-source software released under recognized OSI-approved licenses is eligible for integration, download, or execution.
- Freeware that is closed-source or proprietary is strictly **excluded**. SecretArea Desktop never bundles, downloads, installs, executes, or promotes proprietary hardware tools.

---

## Approved Integrated Hardware Telemetry Engine

### 1. LibreHardwareMonitor / LibreHardwareMonitorLib
- **Role in SecretArea Desktop**: Direct in-process `.NET` sensor library (`LibreHardwareMonitorLib.dll`) used on Windows 10/11 for CPU, GPU, motherboard, SuperIO, VRM, memory, storage, fan RPM, voltage, clock, utilization, and power telemetry — without requiring users to install or run the standalone LibreHardwareMonitor GUI.
- **License**: **Mozilla Public License 2.0 (MPL-2.0)**
- **Official Repository**: <https://github.com/LibreHardwareMonitor/LibreHardwareMonitor>
- **Official Releases**: <https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest>
- **Official NuGet Package**: <https://www.nuget.org/packages/LibreHardwareMonitorLib/>
- **License Text**: <https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/blob/master/LICENSE>
- **Copyright**: LibreHardwareMonitor Contributors and Open Hardware Monitor Contributors
- **Distribution & Compliance Notice (MPL-2.0)**:
  - LibreHardwareMonitorLib is downloaded dynamically on user approval directly from its official GitHub Releases (`/releases/latest`) or official NuGet feed (`api.nuget.org`), verified via SHA-256 checksums and PE metadata when available, and stored in the user's local SecretArea `tools/librehardwaremonitor` directory alongside its original `LICENSE` notice.
  - Covered source modifications, if any, remain governed by MPL-2.0 Section 3. SecretArea Desktop does not relicense LibreHardwareMonitorLib.

---

## Core Application Open-Source Ecosystem

SecretArea Desktop is also built on standard open-source libraries declared in `package.json`:
- **Electron** — MIT License (<https://github.com/electron/electron>)
- **React & React DOM** — MIT License (<https://github.com/facebook/react>)
- **systeminformation** — MIT License (<https://github.com/sebhildebrandt/systeminformation>)
- **Phosphor Icons** — MIT License (<https://github.com/phosphor-icons/react>)
- **PresentMon** *(optional user-approved gaming frame pacing capture)* — MIT License (<https://github.com/GameTechDev/PresentMon>)

---

## Excluded Proprietary Tools Policy Record

During security and licensing evaluation, the following third-party utilities were reviewed and **permanently excluded** because they are closed-source proprietary freeware rather than genuinely open-source software:

| Software | Official Website | License Classification | Decision |
| :--- | :--- | :--- | :--- |
| **HWiNFO64** | <https://www.hwinfo.com/download/> | Proprietary closed-source freeware (free for non-commercial personal use only; Pro license required for commercial use) | **Excluded** |
| **CPU-Z** | <https://www.cpuid.com/softwares/cpu-z.html> | Proprietary closed-source freeware (CPUID) | **Excluded** |
| **GPU-Z** | <https://www.techpowerup.com/gpuz/> | Proprietary closed-source freeware (TechPowerUp) | **Excluded** |

No binaries, installers, mirrors, or wrappers for these proprietary utilities are included in, downloaded by, or executed by SecretArea Desktop.
