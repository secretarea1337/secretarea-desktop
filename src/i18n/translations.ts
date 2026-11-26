import type { AppLanguage } from '../services/launcherSettings';

export interface LanguageOption {
  code: AppLanguage;
  shortLabel: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    shortLabel: 'EN',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
  },
  {
    code: 'fr',
    shortLabel: 'FR',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
  },
  {
    code: 'es',
    shortLabel: 'ES',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
  },
  {
    code: 'ar',
    shortLabel: 'AR',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
  },
];

export interface LauncherTranslations {
  locale: string;
  nav: {
    home: string;
    library: string;
    gameDeals: string;
    downloads: string;
    extras: string;
    requests: string;
    hardwareMonitor: string;
    settings: string;
    switchLight: string;
    switchDark: string;
    lightLabel: string;
    darkLabel: string;
    selectLanguage: string;
    openMenu: string;
    closeMenu: string;
    languageLabel: string;
    themeLabel: string;
    spin: string;
  };
  topbar: {
    webVersion: string;
    updatesTitle: string;
    enterFullscreen: string;
    exitFullscreen: string;
    muteSounds: string;
    enableSounds: string;
    muteXboxSounds: string;
    enableXboxSounds: string;
    offlineMode: string;
    onlineMode: string;
  };
  settings: {
    pageTitle: string;
    pageSubtitle: string;
    resetDefaults: string;
    resetToast: string;
    languageSectionTitle: string;
    languageSectionDesc: string;
    rtlBadge: string;
    ltrBadge: string;
    startingSectionTitle: string;
    startWithComputerTitle: string;
    startWithComputerDesc: string;
    desktopSupportedBadge: string;
    webNotice: string;
    trayActiveHint: string;
    canRunItTitle: string;
    canRunItDesc: string;
    windowSectionTitle: string;
    compactNavbarTitle: string;
    compactNavbarDesc: string;
    customCursorTitle: string;
    customCursorDesc: string;
    lightModeTitle: string;
    lightModeDesc: string;
    darkModeBadge: string;
    lightModeBadge: string;
    alwaysPs5Title: string;
    alwaysPs5Desc: string;
    alwaysXboxTitle: string;
    alwaysXboxDesc: string;
    audioSectionTitle: string;
    audioSectionDesc: string;
    ambientMusicTitle: string;
    ambientMusicDesc: string;
    uiSoundsTitle: string;
    uiSoundsDesc: string;
    volumeTitle: string;
    volumeDesc: string;
    consoleThemeAudioHint: string;
    activeLabel: string;
    inactiveLabel: string;
    downloadSectionTitle: string;
    downloadFolderTitle: string;
    downloadFolderDesc: string;
    chooseFolderBtn: string;
    openFolderBtn: string;
    torrentSectionTitle: string;
    torrentSectionDesc: string;
    torrentEnableTitle: string;
    torrentEnableDesc: string;
    torrentAutoDetectBtn: string;
    torrentDetectingBtn: string;
    torrentTestBtn: string;
    torrentTestingBtn: string;
    torrentSaveBtn: string;
    torrentSavingBtn: string;
    torrentStatusConnected: string;
    torrentStatusDisconnected: string;
    torrentStatusTesting: string;
    torrentNotInstalledTitle: string;
    torrentNotInstalledDesc: string;
    torrentDownloadBtn: string;
    torrentHostLabel: string;
    torrentPortLabel: string;
    torrentUsernameLabel: string;
    torrentPasswordLabel: string;
    torrentPasswordSavedPlaceholder: string;
    torrentApiKeyLabel: string;
    torrentApiKeyPlaceholder: string;
    torrentApiKeySavedPlaceholder: string;
    torrentLoopbackNotice: string;
    torrentLoopbackError: string;
    torrentGuideTitle: string;
    torrentGuideStep1: string;
    torrentGuideStep2: string;
    torrentGuideStep3: string;
    torrentGuideStep4: string;
    torrentGuideStep5: string;
    torrentWebNotice: string;
    torrentTestingWebPreviewMsg: string;
    torrentTestingWebPreviewHint: string;
    modeDesktopBadge: string;
    modeWebPreviewBadge: string;
    torrentSavedToast: string;
    torrentManageSetupBtn: string;
    replaySetupBtn: string;
    closeBehaviorTitle: string;
    closeBehaviorDesc: string;
    closeBehaviorMinimizeTray: string;
    closeBehaviorExit: string;
    exitAppTitle: string;
    exitAppDesc: string;
    exitAppBtn: string;
    exitAppConfirmBtn: string;
    exitAppCancelBtn: string;
    exitAppWebHint: string;
  };
  performance: {
    sectionTitle: string;
    sectionSubtitle: string;
    liveApplyBadge: string;
    modeEcoTitle: string;
    modeEcoDesc: string;
    modeBalancedTitle: string;
    modeBalancedDesc: string;
    modePerformanceTitle: string;
    modePerformanceDesc: string;
    recommendedBadge: string;
    activeBadge: string;
    advancedTitle: string;
    advancedDesc: string;
    pauseOnMinimizeTitle: string;
    pauseOnMinimizeDesc: string;
    reduceEffectsTitle: string;
    reduceEffectsDesc: string;
    hwIntervalTitle: string;
    hwIntervalDesc: string;
    hwIntervalAuto: string;
    dlThrottleTitle: string;
    dlThrottleDesc: string;
    dlThrottleAuto: string;
    adaptiveTorrentTitle: string;
    adaptiveTorrentDesc: string;
    deferSyncTitle: string;
    deferSyncDesc: string;
    auditTitle: string;
    auditDesc: string;
    auditRefreshBtn: string;
    auditMainCpuLabel: string;
    auditMainHeapLabel: string;
    auditMainRssLabel: string;
    auditTotalProcessesLabel: string;
    auditHwMonitorLabel: string;
    auditDownloadsLabel: string;
    auditTorrentPollerLabel: string;
    auditStateActive: string;
    auditStatePausedHidden: string;
    auditStateIdle: string;
    auditStateOff: string;
    auditWebNote: string;
    auditGpuProcessNote: string;
  };
  customTheme: {
    sectionTitle: string;
    sectionSubtitle: string;
    enableLabel: string;
    surfaceLabel: string;
    surfaceMidnight: string;
    surfaceObsidian: string;
    surfaceAbyss: string;
    surfaceDaylight: string;
    accentColorLabel: string;
    customHexLabel: string;
    buttonStyleLabel: string;
    btnRounded: string;
    btnPill: string;
    btnSharp: string;
    cardRadiusLabel: string;
    cardSharp: string;
    cardMedium: string;
    cardSoft: string;
    glassBlurLabel: string;
    glassBlurDesc: string;
    previewLabel: string;
    previewTitle: string;
    previewPrimaryBtn: string;
    previewSecondaryBtn: string;
    resetBtn: string;
    consoleOverrideNote: string;
    summaryCustomPrefix: string;
  };
  downloads: {
    pageTitle: string;
    pageSubtitle: string;
    quickAddPlaceholder: string;
    quickAddBtn: string;
    addTorrentFileBtn: string;
    quickAddInvalid: string;
    folderLabel: string;
    chooseFolder: string;
    openFolder: string;
    clearFinished: string;
    tabAll: string;
    tabActive: string;
    tabPaused: string;
    tabCompleted: string;
    tabFailed: string;
    searchPlaceholder: string;
    metricActive: string;
    metricSpeed: string;
    metricCompleted: string;
    metricFreeDisk: string;
    statusQueued: string;
    statusResolving: string;
    statusDownloading: string;
    statusPaused: string;
    statusCompleted: string;
    statusFailed: string;
    statusCancelled: string;
    sourceDirect: string;
    sourceMediafire: string;
    sourceMega: string;
    sourceQbittorrent: string;
    sourceBrowser: string;
    actionPause: string;
    actionResume: string;
    actionCancel: string;
    actionDelete: string;
    actionRetry: string;
    actionOpenFile: string;
    actionOpenFolder: string;
    actionRemove: string;
    actionOpenExternal: string;
    peersLabel: string;
    seedsLabel: string;
    unknownSize: string;
    etaCalculating: string;
    torrentConnected: string;
    torrentDisconnected: string;
    torrentWebPreviewStatus: string;
    configureTorrentBtn: string;
    speedGraphTitle: string;
    periodLabel: string;
    period1m: string;
    period5m: string;
    period30m: string;
    period1h: string;
    totalUploadLabel: string;
    totalDownloadLabel: string;
    sizeLabel: string;
    progressLabel: string;
    statusLabel: string;
    downSpeedLabel: string;
    upSpeedLabel: string;
    etaLabel: string;
    ratioLabel: string;
    showGraphBtn: string;
    hideGraphBtn: string;
    emptyTitle: string;
    emptySubtitle: string;
    webNoticeTitle: string;
    webNoticeBody: string;
    startedToast: string;
    failedToast: string;
    detailActiveTitle: string;
    detailManageBtn: string;
    detailOpenExternal: string;
    detailStartInApp: string;
  };
  store: {
    featuredSpotlight: string;
    latestRelease: string;
    download: string;
    watchTrailer: string;
    viewDetails: string;
    exploreCatalog: string;
    repackVsOriginal: string;
    upcomingGames: string;
    recentGames: string;
    canRunTitle: string;
    canRunSubtitle: string;
    scopeAll: string;
    scopeGames: string;
    scopeHypervisor: string;
    scopeSteamTools: string;
    scopePs5: string;
    scopeTools: string;
    canRunBtn: string;
    cannotRunBtn: string;
    scanPc: string;
    gpuLabel: string;
    cpuLabel: string;
    ramLabel: string;
    freeDriveLabel: string;
    canRunEmptyFail: string;
    canRunEmptyPass: string;
    canRunCardPass: string;
    mostPopularGames: string;
    showAll: string;
    hideHv: string;
    hideGames: string;
    newestFirst: string;
    nameAz: string;
    pageOf: string;
    previous: string;
    next: string;
    seeMoreNext: string;
    gameSingular: string;
    gamePlural: string;
    backToPage1: string;
    topStudios: string;
    viewAllStudios: string;
    bestTwoPlayers: string;
    noCatalogLoaded: string;
  };
  library: {
    sectionLabel: string;
    genresIn: string;
    allGenres: string;
    reset: string;
    allCountLabel: string;
    hide: string;
    show: string;
    noMatchingTitles: string;
    sortBy: string;
    sortSmart: string;
    sortLatest: string;
    sortAz: string;
    sortZa: string;
    sortFavorites: string;
    sortSizeAsc: string;
    sortSizeDesc: string;
    sortMirrors: string;
    canRunAll: string;
    canRunPass: string;
    canRunFail: string;
    clear: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptySubtitle: string;
    previous: string;
    next: string;
    next50: string;
    backToPage1: string;
    pageOf: string;
    newToLibrary: string;
    pinned: string;
    free: string;
    canRunCard: string;
  };
  extras: {
    upcomingList: string;
    trailers: string;
    bestSeries: string;
    topOpenWorld: string;
    videosLabel: string;
    titleSingular: string;
    titlePlural: string;
    platforms: string;
    watchTrailer: string;
    noTrailer: string;
    back: string;
    seriesPosters: string;
    gamesInSeries: string;
    bestBadge: string;
  };
  requests: {
    pageTitle: string;
    formTitle: string;
    formSubtitle: string;
    titleLabel: string;
    titlePlaceholder: string;
    categoryLabel: string;
    coverUrlLabel: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    sending: string;
    submitRequest: string;
    recentRequests: string;
    noRequestsYet: string;
    syncedNotice: string;
    localNotice: string;
    communitySupportTitle: string;
    joinCommunityTitle: string;
    joinCommunityDesc: string;
    telegramLabel: string;
    telegramSub: string;
    discordLabel: string;
    discordSub: string;
    joinBtn: string;
    supportBadge: string;
    supportHeadline: string;
    supportDesc: string;
    anonMonero: string;
    openInBrowser: string;
  };
  studios: {
    backToHome: string;
    topStudios: string;
    searchPlaceholder: string;
    noMatch: string;
    gameSingular: string;
    gamePlural: string;
    aboutStudio: string;
    noOverview: string;
    all: string;
    back: string;
    totalTitleSingular: string;
    totalTitlePlural: string;
    noItemsInCategory: string;
    previous: string;
    next: string;
    next20Games: string;
    pageOf: string;
  };
  detail: {
    back: string;
    home: string;
    releaseDetails: string;
    gameId: string;
    version: string;
    originalSize: string;
    downloadSize: string;
    repackSize: string;
    downloadChannels: string;
    channelSingular: string;
    channelPlural: string;
    license: string;
    pinned: string;
    standard: string;
    free: string;
    dateAdded: string;
    developerStudio: string;
    repacker: string;
    languages: string;
    genres: string;
    watchTrailer: string;
    trailerGallery: string;
    switchToTrailer: string;
    openTrailer: string;
    description: string;
    noDescription: string;
    requirementsAndCanRun: string;
    requirementsOnly: string;
    tools: string;
    steps: string;
    completed: string;
    linkedEntries: string;
    hvWarningTitle: string;
    hvWarningBody: string;
    noChannels: string;
    recommendedTag: string;
    recommendedForYou: string;
    canRunItTitle: string;
    thisPcAuto: string;
    customPc: string;
    detectedPc: string;
    thisPcVsMinimum: string;
    scan: string;
    myPc: string;
    close: string;
    yourPcCanRun: string;
    runsWell: string;
    cantRun: string;
    checkSpecs: string;
    weakPrefix: string;
    estimated: string;
    needsPrefix: string;
    pcSpecsHeading: string;
    resetAuto: string;
    gpuInput: string;
    cpuInput: string;
    ramInput: string;
    spaceInput: string;
    cancel: string;
    compareSpecs: string;
    osLabel: string;
    ramLabel: string;
    cpuLabel: string;
    gpuLabel: string;
    noReqsListed: string;
    positive: string;
    negative: string;
  };
  qbitSetup: {
    modalTitle: string;
    modalSubtitle: string;
    stepChecking: string;
    stepDetecting: string;
    stepDownloading: string;
    stepVerifying: string;
    stepInstalling: string;
    stepConfiguring: string;
    stepCompleted: string;
    installedLabel: string;
    notInstalledValue: string;
    latestLabel: string;
    processLabel: string;
    processRunning: string;
    processStopped: string;
    statusUpToDate: string;
    statusNewerInstalled: string;
    statusUpdateAvailable: string;
    statusNotInstalled: string;
    statusRunningBlocked: string;
    statusLookupFailed: string;
    consentNote: string;
    installBtn: string;
    updateBtn: string;
    recheckBtn: string;
    retryBtn: string;
    skipBtn: string;
    closeBtn: string;
    officialDownloadBtn: string;
    launchQbitBtn: string;
    shaVerifiedLabel: string;
    sigVerifiedLabel: string;
    unsignedVerifiedNote: string;
    webUiSectionTitle: string;
    webUiDetectedEnabled: string;
    webUiNotEnabledHint: string;
    webUiLoopbackWarning: string;
    webUiGuide1: string;
    webUiGuide2: string;
    webUiGuide3: string;
    webUiGuide4: string;
    webUiGuide5: string;
    generatePasswordBtn: string;
    saveAndVerifyBtn: string;
    verifyingBtn: string;
    webUiConnectedMsg: string;
    openSettingsBtn: string;
    webPreviewNotice: string;
  };
  presentMonSetup: {
    sectionTitle: string;
    sectionSubtitle: string;
    modalTitleInstall: string;
    modalTitleUpdate: string;
    modalTitleRepair: string;
    modalTitleManage: string;
    modalSubtitle: string;
    benefitsHeading: string;
    benefit1: string;
    benefit2: string;
    benefit3: string;
    stepChecking: string;
    stepDownloading: string;
    stepVerifying: string;
    stepInstalling: string;
    stepCompleted: string;
    stepCancelled: string;
    statusReady: string;
    statusNotInstalled: string;
    statusUpdateAvailable: string;
    statusRepairRequired: string;
    statusNewerInstalled: string;
    statusDeclined: string;
    statusChecking: string;
    statusWebPreview: string;
    installedVersionLabel: string;
    latestVersionLabel: string;
    downloadSizeLabel: string;
    installPathLabel: string;
    sourceLabel: string;
    notInstalledValue: string;
    allowInstallBtn: string;
    notNowBtn: string;
    updateNowBtn: string;
    laterBtn: string;
    repairBtn: string;
    reinstallBtn: string;
    checkUpdatesBtn: string;
    checkingBtn: string;
    cancelDownloadBtn: string;
    retryBtn: string;
    doneBtn: string;
    officialReleasesBtn: string;
    enablePresentMonBtn: string;
    managePresentMonBtn: string;
    shaVerifiedLabel: string;
    sigVerifiedLabel: string;
    consentNote: string;
    runningConflictMsg: string;
    corruptedIssuePrefix: string;
    declinedBannerTitle: string;
    declinedBannerDesc: string;
    lookupErrorMsg: string;
  };
  onboarding: {
    stepWelcome: string;
    stepAppearance: string;
    stepQbitCheck: string;
    stepQbitIntegration: string;
    stepReady: string;
    firstTimeNotice: string;
    welcomeEyebrow: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    welcomeFeature1Title: string;
    welcomeFeature1Desc: string;
    welcomeFeature2Title: string;
    welcomeFeature2Desc: string;
    welcomeFeature3Title: string;
    welcomeFeature3Desc: string;
    getStartedBtn: string;
    skipAllBtn: string;
    appearanceTitle: string;
    appearanceSubtitle: string;
    themePickerLabel: string;
    languagePickerLabel: string;
    themeDarkName: string;
    themeDarkDesc: string;
    themeLightName: string;
    themeLightDesc: string;
    themePs5Name: string;
    themePs5Desc: string;
    themeXboxName: string;
    themeXboxDesc: string;
    settingsEditableNote: string;
    backBtn: string;
    continueBtn: string;
    qbitCheckTitle: string;
    qbitCheckSubtitle: string;
    scanningText: string;
    alreadyInstalledTitle: string;
    alreadyInstalledDesc: string;
    goIntegrationBtn: string;
    updateFirstBtn: string;
    notInstalledTitle: string;
    notInstalledDesc: string;
    installAndNextBtn: string;
    installCompleteAdvanceMsg: string;
    skipTorrentBtn: string;
    integrationTitle: string;
    integrationSubtitle: string;
    hostLoopbackHint: string;
    finishSetupBtn: string;
    skipIntegrationBtn: string;
    finalizingPhase1: string;
    finalizingPhase2: string;
    finalizingPhase3: string;
    congratsEyebrow: string;
    congratsTitle: string;
    congratsSubtitle: string;
    summaryThemeLabel: string;
    summaryLanguageLabel: string;
    summaryTorrentLabel: string;
    summaryTorrentConnected: string;
    summaryTorrentInstalled: string;
    summaryTorrentSkipped: string;
    changeLaterHint: string;
    enterAppBtn: string;
    openSettingsPageBtn: string;
    whatIsSecretAreaTitle: string;
    whatIsSecretAreaBody: string;
    whatIsSecretAreaPoint1: string;
    whatIsSecretAreaPoint2: string;
    whatIsSecretAreaPoint3: string;
    whatIsSecretAreaPoint4: string;
    presentMonNotice: string;
    readySummaryHeading: string;
    readyClickToEdit: string;
    readyLaunchHeading: string;
    readyDestinationHint: string;
    readyStartStoreTitle: string;
    readyStartStoreDesc: string;
    readyStartSettingsTitle: string;
    readyStartSettingsDesc: string;
    presentMonShortLabel: string;
    presentMonShortDesc: string;
    readyEditableShortLabel: string;
    readyEditableShortDesc: string;
    readyStatusDone: string;
    readyStatusSyncing: string;
    stepGuideLabel: string;
    step1Guide: string;
    step2Guide: string;
    step3Guide: string;
    step4Guide: string;
    step5Guide: string;
    platformHint: string;
  };
  updater: {
    title: string;
    subtitle: string;
    currentVersionLabel: string;
    checkBtn: string;
    checkingBtn: string;
    upToDateMsg: string;
    checkingMsg: string;
    newVersionAvailable: string;
    whatsNewTitle: string;
    whatsNewCountSuffix: string;
    categoryFeature: string;
    categoryImprovement: string;
    categoryFix: string;
    downloadUpdateBtn: string;
    downloadingPrefix: string;
    readyToInstall: string;
    readyToInstallDesc: string;
    installRestartBtn: string;
    postponeBtn: string;
    laterBtn: string;
    detailsBtn: string;
    toastUpdateAvailable: string;
    toastUpdateReady: string;
    toastDownloading: string;
    installedVersionLabel: string;
    restartHint: string;
    lastCheckedLabel: string;
    errorFallback: string;
    preparingDownload: string;
  };
  hardware: {
    pageTitle: string;
    pageSubtitle: string;
    startMonitoring: string;
    stopMonitoring: string;
    refreshNow: string;
    statusActive: string;
    statusStopped: string;
    statusWebPreview: string;
    intervalLabel: string;
    interval1s: string;
    interval1500ms: string;
    interval2s: string;
    interval3s: string;
    interval5s: string;
    naValue: string;
    unsupportedHint: string;
    webPreviewTitle: string;
    webPreviewBody: string;
    sectionOverview: string;
    sectionPerformance: string;
    sectionDetails: string;
    cpuTitle: string;
    gpuTitle: string;
    ramTitle: string;
    storageTitle: string;
    networkTitle: string;
    modelLabel: string;
    manufacturerLabel: string;
    usageLabel: string;
    temperatureLabel: string;
    clockSpeedLabel: string;
    coresThreadsLabel: string;
    coresUnit: string;
    threadsUnit: string;
    powerLabel: string;
    perCoreUsageLabel: string;
    vramLabel: string;
    fanSpeedLabel: string;
    noGpuDetected: string;
    totalRamLabel: string;
    usedRamLabel: string;
    availableRamLabel: string;
    memoryTypeLabel: string;
    memorySpeedLabel: string;
    driveTypeLabel: string;
    capacityLabel: string;
    usedSpaceLabel: string;
    freeSpaceLabel: string;
    readSpeedLabel: string;
    writeSpeedLabel: string;
    noStorageDetected: string;
    activeInterfaceLabel: string;
    linkStateLabel: string;
    linkSpeedLabel: string;
    downloadSpeedLabel: string;
    uploadSpeedLabel: string;
    totalRxLabel: string;
    totalTxLabel: string;
    noNetworkDetected: string;
    uptimeLabel: string;
    hostLabel: string;
    chartCpuRamTitle: string;
    chartGpuTempTitle: string;
    chartNetworkTitle: string;
    chartCpuLoad: string;
    chartRamLoad: string;
    chartGpuLoad: string;
    chartCpuTemp: string;
    chartGpuTemp: string;
    chartNetDownload: string;
    chartNetUpload: string;
    peakLabel: string;
    avgLabel: string;
    lastUpdatedLabel: string;
    tabOverview: string;
    tabGaming: string;
    tabTechnologies: string;
    tabCleaner: string;
    cpuSeriesLabel: string;
    cpuGenerationLabel: string;
    ramChannelsLabel: string;
    ramSlotsLabel: string;
    gamingTitle: string;
    gamingSubtitle: string;
    gamingSelectProcess: string;
    gamingAllProcesses: string;
    gamingRefreshProcesses: string;
    gamingPingHost: string;
    gamingStartSession: string;
    gamingStopSession: string;
    gamingSessionActive: string;
    gamingSessionDuration: string;
    gamingPresentMonMissingTitle: string;
    gamingPresentMonMissingDesc: string;
    gamingPresentMonReady: string;
    gamingFpsCurrent: string;
    gamingFpsAvg: string;
    gamingFps1Low: string;
    gamingFps01Low: string;
    gamingFpsMax: string;
    gamingFrameTimeAvg: string;
    gamingFrameTimeP95: string;
    gamingFramePacing: string;
    gamingSpikes: string;
    gamingStutters: string;
    gamingDroppedFrames: string;
    gamingFrameTimeChartTitle: string;
    gamingNetworkLatencyTitle: string;
    gamingPingLabel: string;
    gamingPacketLossLabel: string;
    gamingInputLatencyLabel: string;
    gamingThrottlingLabel: string;
    gamingThrottlingDetected: string;
    gamingThrottlingNormal: string;
    gamingBottleneckTitle: string;
    gamingBottleneckWarming: string;
    gamingHistoryTitle: string;
    gamingHistoryEmpty: string;
    gamingClearHistory: string;
    gamingCompareTitle: string;
    gamingCompareSelectA: string;
    gamingCompareSelectB: string;
    techTitle: string;
    techSubtitle: string;
    techStatusSupported: string;
    techStatusDetected: string;
    techStatusActive: string;
    techStatusUnsupported: string;
    techStatusUnavailable: string;
    techStatusRequiresGame: string;
    techStatusRequiresDriver: string;
    techArchitectureLabel: string;
    techDriverLabel: string;
    techRebarLabel: string;
    displayTitle: string;
    displayPrimaryLabel: string;
    displayResolutionLabel: string;
    displayRefreshRateLabel: string;
    displayConnectionLabel: string;
    displayActiveGpuLabel: string;
    displayDirectXLabel: string;
    displayHagsLabel: string;
    displayGameModeLabel: string;
    displayHdrLabel: string;
    displayVrrLabel: string;
    laptopTitle: string;
    laptopBatteryLabel: string;
    laptopPowerStateLabel: string;
    laptopPluggedIn: string;
    laptopOnBattery: string;
    laptopCharging: string;
    laptopHealthLabel: string;
    laptopPowerPlanLabel: string;
    laptopHybridGpuLabel: string;
    laptopDesktopNotice: string;
    cleanerTitle: string;
    cleanerSubtitle: string;
    cleanerSafetyBannerTitle: string;
    cleanerSafetyBannerDesc: string;
    cleanerScanBtn: string;
    cleanerScanningBtn: string;
    cleanerCleanBtn: string;
    cleanerCleaningBtn: string;
    cleanerSelectSafeDefaults: string;
    cleanerEstimatedTotal: string;
    cleanerOptInBadge: string;
    cleanerOptInWarningDesc: string;
    cleanerPathsLabel: string;
    cleanerConfirmTitle: string;
    cleanerConfirmDesc: string;
    cleanerConfirmAction: string;
    cleanerCancelAction: string;
    cleanerProgressCleaning: string;
    cleanerReportTitle: string;
    cleanerReportFreed: string;
    cleanerReportRemoved: string;
    cleanerReportSkipped: string;
    cleanerCatOldTempTitle: string;
    cleanerCatOldTempDesc: string;
    cleanerCatUserTempTitle: string;
    cleanerCatUserTempDesc: string;
    cleanerCatAppCacheTitle: string;
    cleanerCatAppCacheDesc: string;
    cleanerCatSecretAreaCacheTitle: string;
    cleanerCatSecretAreaCacheDesc: string;
    cleanerCatThumbnailTitle: string;
    cleanerCatThumbnailDesc: string;
    cleanerCatShaderTitle: string;
    cleanerCatShaderDesc: string;
    cleanerCatRecycleTitle: string;
    cleanerCatRecycleDesc: string;
    cleanerCatBrowserTitle: string;
    cleanerCatBrowserDesc: string;
    tabHealth: string;
    tabInventoryPorts: string;
    tabAdvisors2030: string;
    tabBenchmarksDb: string;
    provDetected: string;
    provMeasured: string;
    provSpec: string;
    provEstimated: string;
    provNotSupported: string;
    provNotDetected: string;
    provSensorUnavailable: string;
    provRequiresAdmin: string;
    provUnknown: string;
    workloadProfileLabel: string;
    workloadGaming: string;
    workloadOffice: string;
    workloadProgramming: string;
    workload3d: string;
    workloadVideo: string;
    workloadDesign: string;
    workloadAi: string;
    workloadPro: string;
    workloadMixed: string;
    intelRefreshDeepScan: string;
    loadingDeepScan: string;
    intelPrivacyOn: string;
    intelPrivacyOff: string;
    intelExportJson: string;
    intelExportPdf: string;
    intelExportHtml: string;
    intelExportSuccess: string;
    intelExportHtmlWebNote: string;
    intelUnknown: string;
    intelUnavailable: string;
    intelNotDetected: string;
    intelSensorUnavailable: string;
    intelSourceLabel: string;
    desktopOnlyHint: string;
    healthPhysicalTitle: string;
    healthMeasuredCoverage: string;
    healthPerformanceTitle: string;
    healthAgeTitle: string;
    healthAgeNote: string;
    healthLifespanTitle: string;
    healthLifespanDisclaimer: string;
    healthBreakdownTitle: string;
    thermalCoolingTitle: string;
    fanNoSourceHint: string;
    fansDetectedHeader: string;
    fansUnavailableBody: string;
    fanStatusRunning: string;
    fanStatusStopped: string;
    fanStatusAbnormal: string;
    fanStatusNotDetected: string;
    fanStatusUnavailable: string;
    thermalSensorsHeader: string;
    thermalPhysicalNoticeTitle: string;
    errorsDriversTitle: string;
    errorsDriversSubtitle: string;
    pnpErrorsHeader: string;
    pnpNoErrors: string;
    eventLogsHeader: string;
    eventLogsEmpty: string;
    signedDriversHeader: string;
    searchDriversPlaceholder: string;
    driverDeviceCol: string;
    driverClassCol: string;
    driverVersionCol: string;
    driverDateCol: string;
    driverSignedCol: string;
    driverSigned: string;
    driverUnsigned: string;
    sysIdTitle: string;
    sysFormFactor: string;
    sysSku: string;
    sysSerialMasked: string;
    sysOsBuild: string;
    sysArch: string;
    sysBootMode: string;
    sysSecureBoot: string;
    sysTpm: string;
    sysSensorBackends: string;
    moboTitle: string;
    moboChipset: string;
    moboSocket: string;
    moboBios: string;
    moboBiosDate: string;
    moboRamSupport: string;
    moboPcieSlots: string;
    portsTitle: string;
    portsSubtitle: string;
    portsHonestyBanner: string;
    portsTabConfirmed: string;
    portsTabControllers: string;
    portsTabConnected: string;
    portsTabUnconfirmed: string;
    portsBucketEmpty: string;
    storageSmartTitle: string;
    storageSmartSubtitle: string;
    smartUnavailable: string;
    smartWearLabel: string;
    smartPohLabel: string;
    smartCyclesLabel: string;
    smartErrorsLabel: string;
    cpuGpuDeepTitle: string;
    cpuCacheLabel: string;
    cpuVirtLabel: string;
    cpuVoltageLabel: string;
    multiGpuRolesHeader: string;
    ramDimmsTitle: string;
    ramEccLabel: string;
    ramPagefileLabel: string;
    ramDimmsUnavailable: string;
    displaysDeepTitle: string;
    powerPsuBatteryTitle: string;
    psuTelemetryHeader: string;
    batteryDesignVsFull: string;
    batteryCyclesLabel: string;
    batteryRateLabel: string;
    peripheralsNetTitle: string;
    adaptersLabel: string;
    peripheralsLabel: string;
    systemComponentsLabel: string;
    future2030Title: string;
    future2030Subtitle: string;
    futureProjectedVerdict: string;
    futureVerifiedFactsTitle: string;
    futureForwardEstimatesTitle: string;
    upgradeAdvisorTitle: string;
    upgradeAdvisorSubtitle: string;
    psuWattageInputLabel: string;
    psuApplyBtn: string;
    psuOptionalHint: string;
    upgradeNoneNeeded: string;
    compatVerified: string;
    compatCheckNeeded: string;
    gamingCompatTitle: string;
    gamingCompatSubtitle: string;
    catalogGamesCheckTitle: string;
    catalogSearchPlaceholder: string;
    proCompatTitle: string;
    maintenanceTitle: string;
    maintenanceSafetyNote: string;
    benchTitle: string;
    benchSubtitle: string;
    benchSafetyNotice: string;
    benchCpuSingle: string;
    benchCpuMulti: string;
    benchRamThroughput: string;
    benchStorageSeq: string;
    benchStorage4k: string;
    benchNetLatency: string;
    benchStartBtn: string;
    benchStartWebBtn: string;
    benchCancelBtn: string;
    benchStarting: string;
    benchRunningWeb: string;
    benchCompleted: string;
    benchAbortedThermal: string;
    benchCancelled: string;
    dbTitle: string;
    dbVersionLabel: string;
    dbEntriesLabel: string;
    dbSourceLabel: string;
    dbCheckUpdateBtn: string;
    dbCustomFeedConsentLabel: string;
    dbImportJsonBtn: string;
    dbRollbackBtn: string;
    dbSearchPlaceholder: string;
    dbWebOfflineNote: string;
    dbUpdateApplied: string;
    dbUpToDate: string;
    dbImportSuccess: string;
    dbRollbackSuccess: string;
    tabOpenSourceTools: string;
    ossTitle: string;
    ossSubtitle: string;
    ossPolicyBadge: string;
    ossPolicyDesc: string;
    ossCheckUpdatesBtn: string;
    ossCheckingBtn: string;
    ossInstallBtn: string;
    ossUpdateBtn: string;
    ossReinstallBtn: string;
    ossRollbackBtn: string;
    ossCancelBtn: string;
    ossConfirmDownloadTitle: string;
    ossConfirmDownloadDesc: string;
    ossConfirmRollbackDesc: string;
    ossConfirmProceedBtn: string;
    ossInstalledVersionLabel: string;
    ossLatestVersionLabel: string;
    ossStatusLabel: string;
    ossLastCheckedLabel: string;
    ossReleaseDateLabel: string;
    ossReleaseNotesLabel: string;
    ossNoReleaseNotes: string;
    ossStatusNotInstalled: string;
    ossStatusUpToDate: string;
    ossStatusUpdateAvailable: string;
    ossStatusNewerInstalled: string;
    ossStatusRepairRequired: string;
    ossStageDownloading: string;
    ossStageVerifying: string;
    ossStageInstalling: string;
    ossLinkRepo: string;
    ossLinkReleases: string;
    ossLinkNuget: string;
    ossLinkLicense: string;
    ossLinkSource: string;
    ossDirectLibBadge: string;
    ossShaVerifiedBadge: string;
    ossAdminTitle: string;
    ossAdminDescStandard: string;
    ossAdminDescElevated: string;
    ossThirdPartyTitle: string;
    ossThirdPartyDesc: string;
    ossWebPreviewNote: string;
    ossPlatformUnsupportedNote: string;
  };
  updateHistory: {
    title: string;
    subtitle: string;
    settingsCardTitle: string;
    settingsCardDesc: string;
    openHistoryBtn: string;
    searchPlaceholder: string;
    filterAll: string;
    filterFeature: string;
    filterImprovement: string;
    filterFix: string;
    currentBadge: string;
    latestBadge: string;
    refreshBtn: string;
    refreshingBtn: string;
    checkUpdatesBtn: string;
    emptyState: string;
    changesSuffix: string;
    closeBtn: string;
    devBadge: string;
    updateAvailableBadge: string;
    installedDevBadge: string;
    devModeEnvLabel: string;
    prodEnvLabel: string;
    unpublishedNote: string;
    syncingAutoLabel: string;
    newCountLabel: string;
    changedCountLabel: string;
    fixedCountLabel: string;
    justUpdatedTitle: string;
    justUpdatedFromPrefix: string;
    newlyInstalledBadge: string;
  };
  notificationCenter: {
    buttonLabel: string;
    title: string;
    subtitle: string;
    syncNowBtn: string;
    syncingBtn: string;
    markAllReadBtn: string;
    updateHistoryBtn: string;
    lastSyncedPrefix: string;
    neverSynced: string;
    searchPlaceholder: string;
    filterAll: string;
    filterImportant: string;
    filterNews: string;
    importantHint: string;
    newsHint: string;
    liveBadge: string;
    newBadge: string;
    updatedBadge: string;
    upcomingBadge: string;
    popularBadge: string;
    openItemHint: string;
    openExtrasHint: string;
    emptyTitle: string;
    emptyDesc: string;
    syncedToast: string;
    newUpdatesToastPrefix: string;
    tabLabels: {
      all: string;
      game: string;
      hypervisor: string;
      steamtools: string;
      ps5: string;
      architect: string;
      extra: string;
      upcoming: string;
      upcominglist: string;
      popularrepacks: string;
    };
  };
  spinWheel: {
    title: string;
    subtitle: string;
    spinBtn: string;
    spinningLabel: string;
    spinAgainBtn: string;
    viewGameBtn: string;
    poolCountSuffix: string;
    filterAll: string;
    filterGames: string;
    filterHv: string;
    filterCanRun: string;
    readyTitle: string;
    readyDesc: string;
    winnerLabel: string;
    recentTitle: string;
    emptyPool: string;
    repackSizeLabel: string;
    originalSizeLabel: string;
    canRunPass: string;
    canRunFail: string;
    addFavorite: string;
    removeFavorite: string;
    congratsTitle: string;
    congratsSubtitle: string;
  };
  deals: {
    pageTitle: string;
    pageSubtitle: string;
    refreshBtn: string;
    refreshingBtn: string;
    lastUpdatedPrefix: string;
    regionLabel: string;
    currencyLabel: string;
    allCurrenciesLabel: string;
    liveFxRateLabel: string;
    fxLoadingLabel: string;
    fxUnavailableLabel: string;
    sourcePriceHint: string;
    currencyNames: Record<'USD' | 'MAD' | 'EUR' | 'GBP' | 'CAD' | 'SAR' | 'AED' | 'TRY' | 'BRL' | 'JPY', string>;
    tabOverview: string;
    tabAllDeals: string;
    tabFreeGames: string;
    tabStores: string;
    featuredDealsTitle: string;
    bestDiscountsTitle: string;
    trendingDealsTitle: string;
    recentlyUpdatedTitle: string;
    freeGamesSpotlightTitle: string;
    popularGamesTitle: string;
    viewAllBtn: string;
    searchPlaceholder: string;
    storeFilterAll: string;
    minPriceLabel: string;
    maxPriceLabel: string;
    minDiscountLabel: string;
    discountAny: string;
    sortLabel: string;
    sortDealRating: string;
    sortSavings: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortRecent: string;
    sortMetacritic: string;
    sortTitle: string;
    resetFiltersBtn: string;
    resultsCountSuffix: string;
    pageLabel: string;
    ofLabel: string;
    prevPageBtn: string;
    nextPageBtn: string;
    freeCatLimited: string;
    freeCatGiveaways: string;
    freeCatFreeToPlay: string;
    freeCatLimitedDesc: string;
    freeCatGiveawaysDesc: string;
    freeCatFreeToPlayDesc: string;
    expiresPrefix: string;
    noExpiryLabel: string;
    originalWorthPrefix: string;
    claimFreeBtn: string;
    playFreeBtn: string;
    viewDealBtn: string;
    compareOffersBtn: string;
    dealRatingLabel: string;
    freeBadge: string;
    storesTitle: string;
    storesSubtitle: string;
    storeActiveDealsSuffix: string;
    storeTopDiscountPrefix: string;
    browseStoreBtn: string;
    detailOffersTitle: string;
    detailHistoricalLowLabel: string;
    detailHistoricalDatePrefix: string;
    detailBestPriceLabel: string;
    detailLoadingOffers: string;
    detailCurrencyNotice: string;
    detailStoreCol: string;
    detailOriginalCol: string;
    detailCurrentCol: string;
    detailDiscountCol: string;
    detailActionCol: string;
    detailCloseBtn: string;
    emptyDealsTitle: string;
    emptyDealsDesc: string;
    emptyFreeTitle: string;
    emptyFreeDesc: string;
    errorTitle: string;
    offlineDesc: string;
    retryBtn: string;
    tabLivePlayers: string;
    tabCompare: string;
    tabAlerts: string;
    whatsHotTodayTitle: string;
    whatsHotSubtitle: string;
    hotMostPlayed: string;
    hotBiggestGains: string;
    hotNewReleases: string;
    hotBestDiscounts: string;
    kpiTopPlayers: string;
    kpiActiveDeals: string;
    kpiFreeNow: string;
    kpiFollowedAlerts: string;
    livePlayersTitle: string;
    livePlayersSubtitle: string;
    liveTabTop100: string;
    liveTabGainers: string;
    liveTabDecliners: string;
    liveTabReviewMovers: string;
    liveSearchPlaceholder: string;
    liveColRank: string;
    liveColGame: string;
    liveColPlayers: string;
    liveColPeak24h: string;
    liveColChange24h: string;
    liveColTrend7d: string;
    liveColPrice: string;
    liveColActions: string;
    healthLegendTitle: string;
    healthLegendDesc: string;
    healthTiers: Record<'thriving' | 'healthy' | 'cooling' | 'quiet' | 'dormant' | 'unknown', string>;
    freeFilterAll: string;
    freeFilterEpic: string;
    freeFilterSteam: string;
    freeFilterGog: string;
    freeFilterPcDlc: string;
    compareTitle: string;
    compareSubtitle: string;
    compareSearchPlaceholder: string;
    compareAddBtn: string;
    compareAddedBadge: string;
    compareRemoveBtn: string;
    compareClearBtn: string;
    compareEmptyTitle: string;
    compareEmptyDesc: string;
    compareMaxNotice: string;
    compareMetricCol: string;
    alertsTitle: string;
    alertsSubtitle: string;
    alertsCheckNowBtn: string;
    alertsCheckingBtn: string;
    alertsFollowBtn: string;
    alertsFollowingBadge: string;
    alertsTargetPriceLabel: string;
    alertsAnyDropOption: string;
    alertsLastCheckedLabel: string;
    alertsTriggeredTitle: string;
    alertsFollowedTitle: string;
    alertsMarkAllReadBtn: string;
    alertsClearEventsBtn: string;
    alertsEmptyFollowed: string;
    alertsEmptyTriggered: string;
    alertsDropDetectedToast: string;
    modalTabOverview: string;
    modalTabCharts: string;
    modalTabReviewsCritics: string;
    modalTabStatsNews: string;
    playerChartTitle: string;
    priceChartTitle: string;
    noChartData: string;
    discountShameWarning: string;
    criticsSectionTitle: string;
    criticsSeparateNote: string;
    steamRatingCardTitle: string;
    metacriticScoreCardTitle: string;
    metacriticUserCardTitle: string;
    openCriticCardTitle: string;
    keyRequiredBadge: string;
    configureKeyAction: string;
    reviewsPositiveLabel: string;
    reviewsNegativeLabel: string;
    reviewsDailyTrendTitle: string;
    reviewsRecentTitle: string;
    reviewsSnapshotNote: string;
    achievementsTitle: string;
    newsUpdatesTitle: string;
    updateImpactLabel: string;
    developerLabel: string;
    publisherLabel: string;
    releaseDateLabel: string;
    platformsLabel: string;
    healthStatusLabel: string;
    sourcesLabel: string;
    apiKeysBtn: string;
    apiKeysTitle: string;
    apiKeysSubtitle: string;
    apiKeysFreeLabel: string;
    apiKeysOptionalLabel: string;
    apiKeysSaveBtn: string;
    apiKeysClearBtn: string;
    apiKeysConfiguredBadge: string;
    apiKeysNotSetBadge: string;
    apiKeysSafeStorageNote: string;
  };
  settingsHub: {
    searchPlaceholder: string;
    searchResultsCount: string;
    searchEmptyTitle: string;
    searchEmptyDesc: string;
    clearSearchBtn: string;
    catAll: string;
    catTools: string;
    catLanguage: string;
    catStartup: string;
    catAppearance: string;
    catAudio: string;
    catPerformance: string;
    catStorage: string;
    catUpdates: string;
    summaryThemeLabel: string;
    summaryPerfLabel: string;
    summaryToolsLabel: string;
    summarySystemLabel: string;
    toolsReadySuffix: string;
    themeStudioTitle: string;
    themeStudioDesc: string;
    themeDefaultDark: string;
    themeCrispLight: string;
    themePs5: string;
    themeXbox: string;
    themeCustom: string;
    traySmartTip: string;
    traySmartBtn: string;
    audioStatusConsoleActive: string;
    audioStatusStandby: string;
    audioPreviewBtn: string;
    volumeMute: string;
    volumeLow: string;
    volumeBalanced: string;
    volumeMax: string;
    effectiveParamsTitle: string;
    effectiveHwPoll: string;
    effectiveUiCoalesce: string;
    effectiveTorrentPoll: string;
    effectiveCacheCap: string;
    diskFreeLabel: string;
    cacheSectionTitle: string;
    cacheSectionDesc: string;
    clearDealsCacheBtn: string;
    dealsCacheCleared: string;
    clearImageCacheBtn: string;
    imageCacheCleared: string;
    exportSettingsBtn: string;
    importSettingsBtn: string;
    importSettingsSuccess: string;
    importSettingsError: string;
    hubTitle: string;
    hubSubtitle: string;
    hubFilterAll: string;
    hubFilterHardware: string;
    hubFilterDownloads: string;
    hubFilterDeals: string;
    hubFilterUtilities: string;
    hubConfigureBtn: string;
    hubHideConfigBtn: string;
    hubPurposeLabel: string;
    hubStatusReady: string;
    hubStatusAttention: string;
    hubStatusStandby: string;
    hubStatusBuiltin: string;
    hubStatusWebPreview: string;
    toolQbitName: string;
    toolQbitPurpose: string;
    toolPresentMonName: string;
    toolPresentMonPurpose: string;
    toolLhmName: string;
    toolLhmPurpose: string;
    toolCleanerName: string;
    toolCleanerPurpose: string;
    toolDealsApiName: string;
    toolDealsApiPurpose: string;
    toolCanRunItName: string;
    toolCanRunItPurpose: string;
    toolBenchDbName: string;
    toolBenchDbPurpose: string;
    toolHypervisorName: string;
    toolHypervisorPurpose: string;
    toolSpinWheelName: string;
    toolSpinWheelPurpose: string;
    toolUpdaterName: string;
    toolUpdaterPurpose: string;
    specsAutoDetected: string;
    specsCustomOverride: string;
    specsBrowserMode: string;
    specsRescanBtn: string;
    specsCustomizeBtn: string;
    specsSaveBtn: string;
    specsResetAutoBtn: string;
    specsCpuLabel: string;
    specsGpuLabel: string;
    specsVramLabel: string;
    specsRamLabel: string;
    specsDiskFreeLabel: string;
    cleanerQuickScanBtn: string;
    cleanerQuickCleanBtn: string;
    cleanerWebNote: string;
    dbEntriesLabel: string;
    dbVersionLabel: string;
    dbCheckUpdateBtn: string;
    openHardwareMonitorBtn: string;
    openPcCleanerBtn: string;
    openBenchmarksBtn: string;
    openDealsBtn: string;
    openHypervisorBtn: string;
    openSpinWheelBtn: string;
    openUpdaterBtn: string;
  };
}

const EN: LauncherTranslations = {
  locale: 'en-US',
  nav: {
    home: 'Home',
    library: 'Library',
    gameDeals: 'Game Deals',
    downloads: 'Downloads',
    extras: 'Extras',
    requests: 'Requests',
    hardwareMonitor: 'Hardware Monitor',
    settings: 'Settings',
    switchLight: 'Switch to Light mode',
    switchDark: 'Switch to Dark mode',
    lightLabel: 'Light',
    darkLabel: 'Dark',
    selectLanguage: 'Select language',
    openMenu: 'Open navigation menu',
    closeMenu: 'Close navigation menu',
    languageLabel: 'Language',
    themeLabel: 'Appearance',
    spin: 'Spin',
  },
  topbar: {
    webVersion: 'SecretArea web version',
    updatesTitle: 'About SecretArea & Check for Updates',
    enterFullscreen: 'Enter Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    muteSounds: 'Now Playing: PS5 Cosmic Horizon — Click to Mute',
    enableSounds: 'Enable PS5 Music & UI Sounds',
    muteXboxSounds: 'Now Playing: Xbox Nexus — Click to Mute',
    enableXboxSounds: 'Enable Xbox Music & UI Sounds',
    offlineMode: 'Offline Mode',
    onlineMode: 'Online Mode',
  },
  settings: {
    pageTitle: 'Settings',
    pageSubtitle: 'Customize launcher language, startup behavior, window theme, and soundscape.',
    resetDefaults: 'Reset Defaults',
    resetToast: 'Settings restored to defaults',
    languageSectionTitle: 'Language',
    languageSectionDesc: 'Choose the display language and text direction used across SecretArea.',
    rtlBadge: 'RTL',
    ltrBadge: 'LTR',
    startingSectionTitle: 'Starting and closing',
    startWithComputerTitle: 'Start with your computer',
    startWithComputerDesc: 'Opens SecretArea in the tray when you sign in to this computer.',
    desktopSupportedBadge: 'Windows Tray Sync',
    webNotice: 'Tray auto-start activates automatically in the SecretArea.exe desktop app.',
    trayActiveHint: 'Closing the window minimizes SecretArea to the system tray while auto-start is active.',
    canRunItTitle: 'Can Run It hardware check',
    canRunItDesc: 'Compare games and tools against your PC hardware requirements across Home, Library, and Game pages.',
    windowSectionTitle: 'Window',
    compactNavbarTitle: 'Compact Navbar',
    compactNavbarDesc: 'Show the navbar as icons, even in a wide window.',
    customCursorTitle: 'Custom Animated Cursor',
    customCursorDesc: 'Use the custom desktop vector cursor with ripple click bursts, hover rings, and animated states.',
    lightModeTitle: 'Light / Dark mode',
    lightModeDesc: 'Switch between crisp Light mode and Steam-inspired Dark mode. Enabling PS5 or Xbox theme switches back to Dark mode.',
    darkModeBadge: 'Dark Mode',
    lightModeBadge: 'Light Mode',
    alwaysPs5Title: 'Always run app with PS5 theme',
    alwaysPs5Desc: 'Keep the PlayStation 5 sapphire theme and ambient soundscape active across the launcher.',
    alwaysXboxTitle: 'Always run app with Xbox theme',
    alwaysXboxDesc: 'Apply the emerald Xbox dashboard theme, wireframe orb backdrop, and Xbox UI sound effects.',
    audioSectionTitle: 'Audio & Soundscape',
    audioSectionDesc: 'Toggle PS5 and Xbox ambient music vs. UI click sounds separately and control playback volume.',
    ambientMusicTitle: 'Ambient background music (PS5 / Xbox)',
    ambientMusicDesc: 'Play evolving cosmic PS5 or emerald Xbox Nexus ambient music while a console theme is active.',
    uiSoundsTitle: 'UI click & hover sounds',
    uiSoundsDesc: 'Play crisp cursor click effects, focus ticks, and back tones across all themes and custom cursor interactions.',
    volumeTitle: 'Master volume',
    volumeDesc: 'Adjust output volume for custom cursor click sounds, ambient music, and UI sound effects.',
    consoleThemeAudioHint: 'Cursor click sounds are active in every theme. Select PS5 or Xbox theme in Window above to also hear ambient console music.',
    activeLabel: 'On',
    inactiveLabel: 'Off',
    downloadSectionTitle: 'Downloads & Storage',
    downloadFolderTitle: 'Default Download Folder',
    downloadFolderDesc: 'Choose where direct links, MediaFire files, Mega archives, and browser downloads are saved.',
    chooseFolderBtn: 'Choose Folder',
    openFolderBtn: 'Open Folder',
    torrentSectionTitle: 'qBittorrent Integration (Web UI API v2)',
    torrentSectionDesc: 'Optional: Connect SecretArea to local qBittorrent Web UI (API v2 / 5.0+) to send magnets & .torrent files and track live download/upload speeds, ETA, and pause/resume/delete.',
    torrentEnableTitle: 'Enable qBittorrent Web UI Sync',
    torrentEnableDesc: 'Syncs magnet & .torrent downloads with local qBittorrent via encrypted safeStorage credentials. Direct, MediaFire, and Mega downloads always work without qBittorrent.',
    torrentAutoDetectBtn: 'Auto Detect',
    torrentDetectingBtn: 'Scanning...',
    torrentTestBtn: 'Test Connection',
    torrentTestingBtn: 'Testing...',
    torrentSaveBtn: 'Save Configuration',
    torrentSavingBtn: 'Saving...',
    torrentStatusConnected: 'Connected',
    torrentStatusDisconnected: 'Disconnected',
    torrentStatusTesting: 'Testing...',
    torrentNotInstalledTitle: 'qBittorrent was not detected on this PC (Optional)',
    torrentNotInstalledDesc: 'SecretArea direct downloads, MediaFire, Mega, and the in-app browser work independently without qBittorrent. Install qBittorrent only if you want built-in magnet & .torrent tracking.',
    torrentDownloadBtn: 'Get qBittorrent (Official)',
    torrentHostLabel: 'Host (Loopback Only)',
    torrentPortLabel: 'Port',
    torrentUsernameLabel: 'Username',
    torrentPasswordLabel: 'Password',
    torrentPasswordSavedPlaceholder: 'Encrypted via safeStorage (leave blank to keep)',
    torrentApiKeyLabel: 'API Key (Optional · qBittorrent 5.2+)',
    torrentApiKeyPlaceholder: 'qbt_... (optional)',
    torrentApiKeySavedPlaceholder: 'API Key saved securely (leave blank to keep)',
    torrentLoopbackNotice: 'Local-only security: Web UI connections are restricted to loopback hosts (127.0.0.1 / localhost / ::1) and never exposed to external networks.',
    torrentLoopbackError: 'Host must be a local loopback address (127.0.0.1, localhost, or ::1).',
    torrentGuideTitle: 'How to enable qBittorrent Web UI (Manual Setup)',
    torrentGuideStep1: '1. Open qBittorrent on Windows and go to Tools → Options → Web UI.',
    torrentGuideStep2: '2. Check "Web User Interface (Remote control)", keep IP address set to 127.0.0.1 (or *), and set Port to 8080.',
    torrentGuideStep3: '3. Under Authentication, set a Username & Password (or generate a qbt_ API key in qBittorrent 5.2.0+).',
    torrentGuideStep4: '4. Click Apply & OK in qBittorrent, then enter the same credentials above and click Save Configuration.',
    torrentGuideStep5: '5. Click Auto Detect & Test Connection above to verify live qBittorrent Web UI API v2 communication.',
    torrentWebNotice: 'Web Preview Mode: Browsers cannot connect to local 127.0.0.1 qBittorrent Web UI or access Electron safeStorage. Use the SecretArea.exe Desktop App for live connection testing and torrent sync.',
    torrentTestingWebPreviewMsg: 'Disconnected — Web Preview cannot connect to local qBittorrent Web UI.',
    torrentTestingWebPreviewHint: 'Browser security blocks localhost Web UI requests and encrypted safeStorage. Open SecretArea.exe Desktop App to test and sync your local qBittorrent instance.',
    modeDesktopBadge: 'Desktop App',
    modeWebPreviewBadge: 'Web Preview',
    torrentSavedToast: 'qBittorrent settings saved',
    torrentManageSetupBtn: 'Auto Install / Update qBittorrent',
    replaySetupBtn: 'Welcome Setup',
    closeBehaviorTitle: 'Application Closing Behavior',
    closeBehaviorDesc: 'Choose whether clicking the window close button minimizes SecretArea to the system tray or exits completely.',
    closeBehaviorMinimizeTray: 'Minimize to System Tray',
    closeBehaviorExit: 'Exit Application Completely',
    exitAppTitle: 'Full Shutdown',
    exitAppDesc: 'Immediately stop background hardware/gaming monitors, tray icon, and close SecretArea completely.',
    exitAppBtn: 'Exit Application Completely',
    exitAppConfirmBtn: 'Confirm Full Exit',
    exitAppCancelBtn: 'Cancel',
    exitAppWebHint: 'Full application shutdown is only available in the SecretArea.exe Desktop App.',
  },
  performance: {
    sectionTitle: 'Performance & Resource Mode',
    sectionSubtitle: 'Tune CPU, RAM, GPU, and background polling behavior in real time with no restart required.',
    liveApplyBadge: 'Applies Live',
    modeEcoTitle: 'Eco Mode',
    modeEcoDesc: 'Minimum CPU, RAM, and GPU draw. Pauses nonessential effects, extends polling intervals, and suspends background work when minimized.',
    modeBalancedTitle: 'Balanced Mode',
    modeBalancedDesc: 'Default profile. Keeps smooth animations and full responsiveness while aggressively throttling idle background tasks.',
    modePerformanceTitle: 'Performance Mode',
    modePerformanceDesc: 'Prioritizes maximum UI responsiveness, faster hardware/download updates, and full visual effects without wasted idle work.',
    recommendedBadge: 'Default',
    activeBadge: 'Active',
    advancedTitle: 'Advanced Resource Controls',
    advancedDesc: 'Fine-tune polling intervals, visual effects, and background behavior independently.',
    pauseOnMinimizeTitle: 'Pause background telemetry when minimized or hidden',
    pauseOnMinimizeDesc: 'Immediately suspends sensor loops, ambient animations, and ping checks while window is minimized or in tray.',
    reduceEffectsTitle: 'Reduce blur & continuous ambient animations',
    reduceEffectsDesc: 'Disables continuous GPU ambient glows and heavy backdrop blur to minimize GPU compositing overhead.',
    hwIntervalTitle: 'Hardware Monitor poll rate',
    hwIntervalDesc: 'Controls sensor update cadence while viewing Hardware Monitor.',
    hwIntervalAuto: 'Auto (Follow Profile)',
    dlThrottleTitle: 'Download UI & state coalesce interval',
    dlThrottleDesc: 'Controls how often active download speed/progress updates trigger UI & disk sync.',
    dlThrottleAuto: 'Auto (Follow Profile)',
    adaptiveTorrentTitle: 'Adaptive qBittorrent polling',
    adaptiveTorrentDesc: 'Slows down Web UI requests automatically when zero torrents are active.',
    deferSyncTitle: 'Defer background catalog & update checks',
    deferSyncDesc: 'Extends intervals for nonessential catalog syncs, image precaching, and startup update probes.',
    auditTitle: 'Runtime Resource Footprint',
    auditDesc: 'Real-time on-demand snapshot of Electron main/helper processes and active background pollers.',
    auditRefreshBtn: 'Sample Now',
    auditMainCpuLabel: 'Main Process CPU',
    auditMainHeapLabel: 'Main JS Heap',
    auditMainRssLabel: 'Main Working Set (RSS)',
    auditTotalProcessesLabel: 'Desktop Processes',
    auditHwMonitorLabel: 'Hardware Poller',
    auditDownloadsLabel: 'Active Transfers',
    auditTorrentPollerLabel: 'qBittorrent Poller',
    auditStateActive: 'Active',
    auditStatePausedHidden: 'Paused (Hidden)',
    auditStateIdle: 'Idle / Stopped',
    auditStateOff: 'Disabled',
    auditWebNote: 'Running in browser preview. Detailed Electron multi-process telemetry is available in SecretArea.exe.',
    auditGpuProcessNote: 'Hardware acceleration stays intelligently enabled for responsive rendering while GPU workload drops via reduced compositing.',
  },
  customTheme: {
    sectionTitle: 'Custom Theme Builder',
    sectionSubtitle: 'Design your default SecretArea palette, accent color, button geometry, and card surface.',
    enableLabel: 'Enable Custom Default Theme',
    surfaceLabel: 'Base Surface',
    surfaceMidnight: 'Midnight Slate',
    surfaceObsidian: 'Pure Obsidian',
    surfaceAbyss: 'Deep Abyss',
    surfaceDaylight: 'Clean Daylight',
    accentColorLabel: 'Accent Color',
    customHexLabel: 'Custom Hex',
    buttonStyleLabel: 'Button Style',
    btnRounded: 'Rounded',
    btnPill: 'Pill',
    btnSharp: 'Sharp',
    cardRadiusLabel: 'Card Corners',
    cardSharp: 'Sharp',
    cardMedium: 'Balanced',
    cardSoft: 'Soft',
    glassBlurLabel: 'Frosted Glass Blur',
    glassBlurDesc: 'Subtle translucent blur on panels and cards',
    previewLabel: 'Live Preview',
    previewTitle: 'SecretArea Custom Look',
    previewPrimaryBtn: 'Primary Action',
    previewSecondaryBtn: 'Secondary',
    resetBtn: 'Reset Custom Theme',
    consoleOverrideNote: 'Note: Turning Custom Theme on automatically switches out of PS5/Xbox console theme.',
    summaryCustomPrefix: 'Custom',
  },
  downloads: {
    pageTitle: 'Download Manager',
    pageSubtitle: 'Track direct links, MediaFire, Mega, in-app browser captures, and qBittorrent transfers.',
    quickAddPlaceholder: 'Paste a Direct URL, MediaFire, Mega, or Magnet link...',
    quickAddBtn: 'Add Download',
    addTorrentFileBtn: 'Add .torrent',
    quickAddInvalid: 'Enter a valid http://, https://, or magnet:? link.',
    folderLabel: 'Save to',
    chooseFolder: 'Choose Folder',
    openFolder: 'Open Folder',
    clearFinished: 'Clear Finished',
    tabAll: 'All',
    tabActive: 'Active',
    tabPaused: 'Paused',
    tabCompleted: 'Completed',
    tabFailed: 'Failed',
    searchPlaceholder: 'Filter downloads...',
    metricActive: 'Active',
    metricSpeed: 'Total Speed',
    metricCompleted: 'Completed',
    metricFreeDisk: 'Free Disk Space',
    statusQueued: 'Queued',
    statusResolving: 'Resolving link...',
    statusDownloading: 'Downloading',
    statusPaused: 'Paused',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusCancelled: 'Cancelled',
    sourceDirect: 'Direct Link',
    sourceMediafire: 'MediaFire',
    sourceMega: 'Mega',
    sourceQbittorrent: 'qBittorrent',
    sourceBrowser: 'In-App Browser',
    actionPause: 'Pause',
    actionResume: 'Resume',
    actionCancel: 'Cancel',
    actionDelete: 'Delete',
    actionRetry: 'Retry',
    actionOpenFile: 'Open File',
    actionOpenFolder: 'Open Folder',
    actionRemove: 'Remove',
    actionOpenExternal: 'Open Externally',
    peersLabel: 'Peers',
    seedsLabel: 'Seeds',
    unknownSize: 'Unknown size',
    etaCalculating: 'Calculating...',
    torrentConnected: 'qBittorrent Connected',
    torrentDisconnected: 'qBittorrent Disconnected',
    torrentWebPreviewStatus: 'Web Preview — Live qBittorrent sync runs in SecretArea.exe Desktop App',
    configureTorrentBtn: 'Configure qBittorrent',
    speedGraphTitle: 'Speed Activity',
    periodLabel: 'Period:',
    period1m: '1 Minute',
    period5m: '5 Minutes',
    period30m: '30 Minutes',
    period1h: '1 Hour',
    totalUploadLabel: 'Total Upload',
    totalDownloadLabel: 'Total Download',
    sizeLabel: 'Size',
    progressLabel: 'Progress',
    statusLabel: 'Status',
    downSpeedLabel: 'Down Speed',
    upSpeedLabel: 'Up Speed',
    etaLabel: 'ETA',
    ratioLabel: 'Ratio',
    showGraphBtn: 'Show Speed Graph',
    hideGraphBtn: 'Hide Speed Graph',
    emptyTitle: 'No downloads in this view',
    emptySubtitle: 'Paste any direct, MediaFire, Mega, or magnet link above, upload a .torrent file, or click a channel inside any Game or Tool page.',
    webNoticeTitle: 'Web Preview Mode',
    webNoticeBody: 'Live pause/resume, speed/ETA tracking, in-app browser capture, and qBittorrent Web UI sync run inside the SecretArea.exe desktop app.',
    startedToast: 'Download added to queue',
    failedToast: 'Could not start download',
    detailActiveTitle: 'Downloads for This Release',
    detailManageBtn: 'Open Download Manager',
    detailOpenExternal: 'Open in External Browser',
    detailStartInApp: 'Download in SecretArea',
  },
  store: {
    featuredSpotlight: 'Featured Spotlight',
    latestRelease: 'Latest Release',
    download: 'Download',
    watchTrailer: 'Watch Trailer',
    viewDetails: 'Details',
    exploreCatalog: 'Explore Catalog',
    repackVsOriginal: 'Repack Size vs Original',
    upcomingGames: 'Upcoming Games',
    recentGames: 'Recent Games',
    canRunTitle: 'Can Run It — Recommended For Your PC',
    canRunSubtitle: "Automatically compares Games, Hypervisor, SteamTools, PS5 & Tools against your PC's Requirements",
    scopeAll: 'All',
    scopeGames: 'Games',
    scopeHypervisor: 'Hypervisor',
    scopeSteamTools: 'SteamTools',
    scopePs5: 'PS5',
    scopeTools: 'Tools',
    canRunBtn: 'Can Run',
    cannotRunBtn: "Can't Run",
    scanPc: 'Scan PC',
    gpuLabel: 'GPU',
    cpuLabel: 'CPU',
    ramLabel: 'RAM',
    freeDriveLabel: 'Free',
    canRunEmptyFail: 'Great news — your PC meets the requirements for all scanned items in this category!',
    canRunEmptyPass: 'No matching items found for the selected filter.',
    canRunCardPass: 'Can Run',
    mostPopularGames: 'Most Popular Games',
    showAll: 'Show All',
    hideHv: 'Hide HV',
    hideGames: 'Hide Games',
    newestFirst: 'Newest First',
    nameAz: 'A – Z',
    pageOf: 'Page',
    previous: 'Previous',
    next: 'Next',
    seeMoreNext: 'See More · Next',
    gameSingular: 'Game',
    gamePlural: 'Games',
    backToPage1: 'Back to Page 1',
    topStudios: 'Top Studios',
    viewAllStudios: 'View All Studios',
    bestTwoPlayers: 'Best games For Two Players',
    noCatalogLoaded: 'No catalog items loaded.',
  },
  library: {
    sectionLabel: 'Section',
    genresIn: 'Genres in',
    allGenres: 'All Genres',
    reset: 'Reset',
    allCountLabel: 'ALL',
    hide: 'Hide',
    show: 'Show',
    noMatchingTitles: 'No matching titles found.',
    sortBy: 'Sort By',
    sortSmart: 'Smart Sort (Best & New)',
    sortLatest: 'Newest First',
    sortAz: 'Name: A → Z',
    sortZa: 'Name: Z → A',
    sortFavorites: 'Favorites First',
    sortSizeAsc: 'Size: Smallest First',
    sortSizeDesc: 'Size: Largest First',
    sortMirrors: 'Most Download Channels',
    canRunAll: 'Can Run It: All',
    canRunPass: '✓ Can Run on This PC',
    canRunFail: "✕ Can't Run (Weak PC)",
    clear: 'Clear',
    searchPlaceholder: 'Smart search',
    emptyTitle: 'No items match your current filters',
    emptySubtitle: 'Try clearing the search query, genre filter, or switching sections.',
    previous: 'Previous',
    next: 'Next',
    next50: 'Next 50 Items',
    backToPage1: 'Back to Page 1',
    pageOf: 'Page',
    newToLibrary: 'NEW TO LIBRARY',
    pinned: 'Pinned',
    free: 'Free',
    canRunCard: '✓ Can Run on This PC',
  },
  extras: {
    upcomingList: 'Upcoming List',
    trailers: 'Trailers',
    bestSeries: 'Best Series',
    topOpenWorld: 'Top Open World Games',
    videosLabel: 'Videos',
    titleSingular: 'Title',
    titlePlural: 'Titles',
    platforms: 'Platforms',
    watchTrailer: 'Watch Trailer',
    noTrailer: 'No trailer video URL available.',
    back: 'Back',
    seriesPosters: 'Series Posters',
    gamesInSeries: 'Games in Series',
    bestBadge: 'Best',
  },
  requests: {
    pageTitle: 'Game & Tool Requests',
    formTitle: 'Submit a Catalog Request',
    formSubtitle: 'Request missing repacks, latest patches, DLC bundles, or report dead mirrors.',
    titleLabel: 'Title',
    titlePlaceholder: 'e.g., Ghost of Yotei or Forza Horizon 6 v461.691',
    categoryLabel: 'Category',
    coverUrlLabel: 'Cover URL (Optional)',
    detailsLabel: 'Details / Notes',
    detailsPlaceholder: 'Include preferred repacker, specific version or DLCs needed...',
    sending: 'Sending...',
    submitRequest: 'Submit Request',
    recentRequests: 'Recent Requests',
    noRequestsYet: 'No requests submitted yet.',
    syncedNotice: 'Request submitted successfully and saved to the catalog queue!',
    localNotice: 'Request saved to your queue. It appears in Recent Requests.',
    communitySupportTitle: 'Community & Support Us',
    joinCommunityTitle: 'Join Our Community',
    joinCommunityDesc: 'Get instant release alerts, request updates, troubleshooting support, and direct contact with SecretArea on Telegram and Discord.',
    telegramLabel: 'Telegram Community',
    telegramSub: 'Updates, new drops & quick chat',
    discordLabel: 'Discord Community',
    discordSub: 'Live support, requests & community',
    joinBtn: 'Join',
    supportBadge: 'Support SecretArea',
    supportHeadline: 'Support our mission & help us grow',
    supportDesc: 'Every contribution keeps the SecretArea launcher, catalog updates, and community requests running smoothly and completely free for everyone.',
    anonMonero: 'Anonymous · Crypto & Monero (XMR)',
    openInBrowser: 'Open in browser',
  },
  studios: {
    backToHome: 'Back to Home',
    topStudios: 'Top Studios',
    searchPlaceholder: 'Search studios...',
    noMatch: 'No studios match your search.',
    gameSingular: 'Game',
    gamePlural: 'Games',
    aboutStudio: 'About This Studio',
    noOverview: 'No studio overview available in catalog.',
    all: 'All',
    back: 'Back',
    totalTitleSingular: 'Total Title',
    totalTitlePlural: 'Total Titles',
    noItemsInCategory: 'No titles listed under this category.',
    previous: 'Previous',
    next: 'Next',
    next20Games: 'Next 20 Games',
    pageOf: 'Page',
  },
  detail: {
    back: 'Back',
    home: 'Home',
    releaseDetails: 'Release Details',
    gameId: 'Game ID',
    version: 'Version',
    originalSize: 'Original Size',
    downloadSize: 'Download Size',
    repackSize: 'Repack Size',
    downloadChannels: 'Download Channels',
    channelSingular: 'Channel',
    channelPlural: 'Channels',
    license: 'License',
    pinned: 'Pinned',
    standard: 'Standard',
    free: 'Free',
    dateAdded: 'Date Added',
    developerStudio: 'Developer Studio',
    repacker: 'Repacker',
    languages: 'Languages',
    genres: 'Genres',
    watchTrailer: 'Watch Trailer',
    trailerGallery: 'Trailer & Gallery',
    switchToTrailer: 'Switch to Trailer',
    openTrailer: 'Open Trailer',
    description: 'Description',
    noDescription: 'No description provided in catalog.',
    requirementsAndCanRun: 'Requirements & Can Run It',
    requirementsOnly: 'System Requirements',
    tools: 'Tools',
    steps: 'Steps',
    completed: 'completed',
    linkedEntries: 'Linked Catalog Entries',
    hvWarningTitle: 'What is a Hypervisor Bypass?',
    hvWarningBody: 'Please read this article before proceeding with downloading and installation:',
    noChannels: 'No download channels attached to this entry.',
    recommendedTag: 'Recommended',
    recommendedForYou: 'Recommended For You',
    canRunItTitle: 'Can Run It?',
    thisPcAuto: 'This PC (Auto)',
    customPc: 'Custom PC',
    detectedPc: 'Detected PC',
    thisPcVsMinimum: 'This PC vs minimum',
    scan: 'Scan',
    myPc: 'My PC',
    close: 'Close',
    yourPcCanRun: 'Your PC · Can Run It',
    runsWell: 'Runs well',
    cantRun: "Can't run",
    checkSpecs: 'Check specs',
    weakPrefix: 'Weak',
    estimated: 'estimated',
    needsPrefix: 'needs',
    pcSpecsHeading: 'Your PC Specifications',
    resetAuto: 'Reset to Auto-Detected',
    gpuInput: 'Graphics (GPU)',
    cpuInput: 'Processor (CPU)',
    ramInput: 'RAM (GB)',
    spaceInput: 'Free Disk Space (GB, optional)',
    cancel: 'Cancel',
    compareSpecs: 'Compare Specs',
    osLabel: 'OS',
    ramLabel: 'Memory / RAM',
    cpuLabel: 'Processor / CPU',
    gpuLabel: 'Graphics / GPU',
    noReqsListed: 'No specific hardware requirements listed.',
    positive: 'Positive',
    negative: 'Negative',
  },
  qbitSetup: {
    modalTitle: 'qBittorrent Dependency Setup',
    modalSubtitle: 'Manage automatic Windows installation, official updates, and local Web UI verification.',
    stepChecking: 'Checking dependencies...',
    stepDetecting: 'Detecting qBittorrent...',
    stepDownloading: 'Downloading qBittorrent...',
    stepVerifying: 'Verifying installer...',
    stepInstalling: 'Installing qBittorrent...',
    stepConfiguring: 'Configuring integration...',
    stepCompleted: 'Setup completed.',
    installedLabel: 'Installed',
    notInstalledValue: 'Not installed',
    latestLabel: 'Latest Official',
    processLabel: 'Process',
    processRunning: 'Running',
    processStopped: 'Not running',
    statusUpToDate: 'Your qBittorrent installation is already up to date. No reinstall required.',
    statusNewerInstalled: 'A newer version of qBittorrent is already installed. SecretArea will never downgrade it.',
    statusUpdateAvailable: 'A newer official stable qBittorrent update is ready to install.',
    statusNotInstalled: 'qBittorrent was not detected on this PC. SecretArea can download the official x64 installer, verify its checksum & signature, and install it silently.',
    statusRunningBlocked: 'qBittorrent is currently running. Please close qBittorrent cleanly so active torrents are not interrupted, then click Check Again.',
    statusLookupFailed: 'Unable to retrieve the latest official release right now.',
    consentNote: 'By clicking Install/Update, SecretArea downloads the official 64-bit qBittorrent installer directly from GitHub/qbittorrent.org and verifies SHA-256 integrity before launching setup (Windows may ask for UAC confirmation).',
    installBtn: 'Download & Install qBittorrent',
    updateBtn: 'Update qBittorrent Now',
    recheckBtn: 'Check Again',
    retryBtn: 'Retry',
    skipBtn: 'Not Now',
    closeBtn: 'Done',
    officialDownloadBtn: 'Official Download Page',
    launchQbitBtn: 'Open qBittorrent',
    shaVerifiedLabel: 'SHA-256 Checksum Verified',
    sigVerifiedLabel: 'Publisher Signature Verified',
    unsignedVerifiedNote: 'FOSS Installer (Unsigned) · Official SHA-256 Match Verified',
    webUiSectionTitle: 'qBittorrent Web UI Setup (127.0.0.1 Only)',
    webUiDetectedEnabled: 'Web UI is enabled in qBittorrent config.',
    webUiNotEnabledHint: 'Web UI is not enabled yet. Follow these steps inside qBittorrent, then click Save & Verify Connection:',
    webUiLoopbackWarning: 'Web UI IP is not restricted to 127.0.0.1. Set IP address to 127.0.0.1 in qBittorrent for local-only security.',
    webUiGuide1: '1. Open qBittorrent → Tools → Options → Web UI.',
    webUiGuide2: '2. Check "Web User Interface (Remote control)".',
    webUiGuide3: '3. Set IP address to 127.0.0.1 and Port to 8080.',
    webUiGuide4: '4. Set a Username and Password (use Generate Password below or enter your own), then click Apply / OK.',
    webUiGuide5: '5. Enter those exact credentials below and click Save & Verify Connection.',
    generatePasswordBtn: 'Generate Strong Password',
    saveAndVerifyBtn: 'Save & Verify Connection',
    verifyingBtn: 'Verifying...',
    webUiConnectedMsg: 'Connected & verified! SecretArea is ready for magnet links and .torrent downloads.',
    openSettingsBtn: 'Open Settings',
    webPreviewNotice: 'Automatic installation runs inside SecretArea.exe Desktop App on Windows. In Web Preview, use the official link below.',
  },
  presentMonSetup: {
    sectionTitle: 'Intel PresentMon (FPS & Frame Time Engine)',
    sectionSubtitle: 'Automatic detection, official GitHub release updates, and integrity verification for real ETW gaming telemetry.',
    modalTitleInstall: 'Enable Gaming Performance Monitoring',
    modalTitleUpdate: 'Update Intel PresentMon',
    modalTitleRepair: 'Repair PresentMon Installation',
    modalTitleManage: 'Intel PresentMon Dependency Manager',
    modalSubtitle: 'Official Intel PresentMon ETW telemetry engine managed automatically by SecretArea Desktop.',
    benefitsHeading: 'What PresentMon enables in SecretArea',
    benefit1: 'Accurate real-time FPS, 1% Low & 0.1% Low FPS via zero-injection ETW',
    benefit2: 'Frame time pacing, spike & stutter detection, and display latency capture',
    benefit3: 'Hardware correlation & multi-sample CPU/GPU bottleneck diagnosis',
    stepChecking: 'Checking PresentMon installation & latest GitHub release...',
    stepDownloading: 'Downloading official PresentMon x64 binary...',
    stepVerifying: 'Verifying SHA-256 checksum & Intel Authenticode signature...',
    stepInstalling: 'Installing & verifying CLI compatibility...',
    stepCompleted: 'PresentMon is installed, verified, and ready for FPS monitoring.',
    stepCancelled: 'Download cancelled cleanly. No files were changed.',
    statusReady: 'Installed & Ready',
    statusNotInstalled: 'Not Installed',
    statusUpdateAvailable: 'Update Available',
    statusRepairRequired: 'Repair Needed',
    statusNewerInstalled: 'Up to Date (Newer Local Build)',
    statusDeclined: 'Disabled by User (Optional)',
    statusChecking: 'Checking...',
    statusWebPreview: 'Windows Desktop Only',
    installedVersionLabel: 'Installed Version',
    latestVersionLabel: 'Latest Official',
    downloadSizeLabel: 'Download Size',
    installPathLabel: 'Install Location',
    sourceLabel: 'Official Source',
    notInstalledValue: 'Not installed',
    allowInstallBtn: 'Allow & Install',
    notNowBtn: 'Not Now',
    updateNowBtn: 'Update Now',
    laterBtn: 'Later',
    repairBtn: 'Repair Installation',
    reinstallBtn: 'Reinstall PresentMon',
    checkUpdatesBtn: 'Check for Updates',
    checkingBtn: 'Checking...',
    cancelDownloadBtn: 'Cancel',
    retryBtn: 'Retry',
    doneBtn: 'Done',
    officialReleasesBtn: 'GitHub Releases',
    enablePresentMonBtn: 'Install / Enable PresentMon',
    managePresentMonBtn: 'Manage PresentMon',
    shaVerifiedLabel: 'SHA-256 Digest Verified',
    sigVerifiedLabel: 'Intel Corporation Signature Verified',
    consentNote: 'SecretArea never downloads or installs PresentMon without your explicit approval. Assets are fetched exclusively over HTTPS from GitHub Releases and verified via SHA-256 and Intel Authenticode signature.',
    runningConflictMsg: 'Another PresentMon process is running on your PC. Close it cleanly, then click Retry or Check for Updates.',
    corruptedIssuePrefix: 'Detected installation issue',
    declinedBannerTitle: 'PresentMon FPS monitoring was skipped',
    declinedBannerDesc: 'SecretArea continues working normally with CPU, GPU, RAM, storage, and ping telemetry. You can install PresentMon anytime to unlock live FPS & frame time graphs.',
    lookupErrorMsg: 'Unable to check GitHub Releases for the latest PresentMon version right now.',
  },
  onboarding: {
    stepWelcome: 'Welcome',
    stepAppearance: 'Theme & Language',
    stepQbitCheck: 'qBittorrent Check',
    stepQbitIntegration: 'Integration',
    stepReady: 'Ready',
    firstTimeNotice: 'One-time first-launch setup',
    welcomeEyebrow: 'SecretArea Desktop',
    welcomeTitle: 'Welcome to SecretArea',
    welcomeSubtitle: 'Personalize your launcher style, language, and download tools in under a minute before entering the workspace.',
    welcomeFeature1Title: '01. Theme & Language',
    welcomeFeature1Desc: 'Pick Dark, Light, PlayStation 5, Xbox Nexus, or build your own Custom Theme in 4 languages.',
    welcomeFeature2Title: '02. Smart qBittorrent',
    welcomeFeature2Desc: 'Automatically detects existing qBittorrent setups or installs the verified official 64-bit release.',
    welcomeFeature3Title: '03. Sync & PresentMon',
    welcomeFeature3Desc: 'Connect local Web UI securely, get live catalog alerts, and enable Intel PresentMon for real FPS.',
    getStartedBtn: 'Get Started',
    skipAllBtn: 'Skip to App',
    appearanceTitle: 'Personalize Theme & Language',
    appearanceSubtitle: 'Every choice updates live right here. You can switch themes or languages anytime in Settings.',
    themePickerLabel: 'Launcher Theme',
    languagePickerLabel: 'Interface Language',
    themeDarkName: 'Dark Slate',
    themeDarkDesc: 'High-contrast obsidian desktop launcher',
    themeLightName: 'Light Mode',
    themeLightDesc: 'Clean daylight workspace with crisp borders',
    themePs5Name: 'PlayStation 5',
    themePs5Desc: 'Sapphire aurora & console ambient sound',
    themeXboxName: 'Xbox Nexus',
    themeXboxDesc: 'Emerald wireframe & classic console glow',
    settingsEditableNote: 'You can adjust sound, navbar layout, and themes later from Settings.',
    backBtn: 'Back',
    continueBtn: 'Continue',
    qbitCheckTitle: 'qBittorrent Engine Check',
    qbitCheckSubtitle: 'SecretArea checks your PC first so existing qBittorrent setups are preserved cleanly.',
    scanningText: 'Checking your computer for an existing qBittorrent installation...',
    alreadyInstalledTitle: 'qBittorrent is already installed on this PC',
    alreadyInstalledDesc: 'Great! Since qBittorrent was already installed before SecretArea, continue to the next step to add your qBittorrent Integration settings.',
    goIntegrationBtn: 'Configure qBittorrent Integration',
    updateFirstBtn: 'Update qBittorrent First',
    notInstalledTitle: 'qBittorrent is not installed yet',
    notInstalledDesc: 'Install the official verified 64-bit qBittorrent client automatically, then continue straight to Integration settings.',
    installAndNextBtn: 'Install qBittorrent & Continue',
    installCompleteAdvanceMsg: 'qBittorrent installed and verified! Moving to Integration settings...',
    skipTorrentBtn: 'Skip Torrent Setup (Direct Downloads Only)',
    integrationTitle: 'qBittorrent Integration Settings',
    integrationSubtitle: 'Add your local qBittorrent Web UI credentials so SecretArea tracks speed, seeds, peers, ETA, and progress.',
    hostLoopbackHint: 'Locked to 127.0.0.1 (local loopback only) and stored securely with Electron safeStorage.',
    finishSetupBtn: 'Finish Setup',
    skipIntegrationBtn: 'Skip & Configure Later in Settings',
    finalizingPhase1: 'Saving theme & language...',
    finalizingPhase2: 'Syncing download workspace...',
    finalizingPhase3: 'Launch checks verified!',
    congratsEyebrow: 'Setup Complete',
    congratsTitle: 'Congratulations! SecretArea Desktop is ready.',
    congratsSubtitle: 'Configured for fast downloads and live FPS telemetry.',
    summaryThemeLabel: 'Active Theme',
    summaryLanguageLabel: 'Language',
    summaryTorrentLabel: 'qBittorrent',
    summaryTorrentConnected: 'Connected & Verified',
    summaryTorrentInstalled: 'Installed (Link in Settings)',
    summaryTorrentSkipped: 'Skipped (Optional)',
    changeLaterHint: 'All theme, language, folder, and qBittorrent settings stay editable anytime in Settings.',
    enterAppBtn: 'Enter SecretArea Desktop',
    openSettingsPageBtn: 'Review in Settings',
    whatIsSecretAreaTitle: 'What is SecretArea?',
    whatIsSecretAreaBody: 'Our goal is simple : bring the best games together in one place, so you can spend less time searching and more time playing.',
    whatIsSecretAreaPoint1: 'Explore Games, Hypervisor, SteamTools, PS5, Tools, and Savegames catalogs with instant "Can Run It" PC checks and live Hardware Monitor FPS telemetry.',
    whatIsSecretAreaPoint2: 'Download smoothly with pause and resume support for Direct links, MediaFire, Mega, and in-app captures, plus optional local qBittorrent Web UI sync.',
    whatIsSecretAreaPoint3: 'Switch anytime between Dark, Light, PlayStation 5, Xbox Nexus, or your Custom Theme in English, French, Spanish, or RTL Arabic with Notification Center & Update History.',
    whatIsSecretAreaPoint4: 'Intel PresentMon (Optional): Uses official signed Intel PresentMon ETW telemetry for real FPS, 1% Low, and frame-time graphs without game injection — you will be asked before installing it.',
    presentMonNotice: 'About PresentMon: After setup, SecretArea may ask permission to install Intel PresentMon (optional) so Hardware Monitor can measure real FPS & frame times.',
    readySummaryHeading: 'Workspace Summary',
    readyClickToEdit: 'Click any row to edit',
    readyLaunchHeading: 'Smart Launchpad',
    readyDestinationHint: 'Select opening view',
    readyStartStoreTitle: 'Store & Catalog',
    readyStartStoreDesc: 'Browse games, tools & downloads',
    readyStartSettingsTitle: 'Settings & Integrations',
    readyStartSettingsDesc: 'Tune folders, audio & Web UI',
    presentMonShortLabel: 'Intel PresentMon',
    presentMonShortDesc: 'Optional FPS prompt after launch',
    readyEditableShortLabel: 'Always Editable',
    readyEditableShortDesc: 'Themes, language & paths stay open',
    readyStatusDone: 'Ready',
    readyStatusSyncing: 'Syncing',
    stepGuideLabel: 'What this step does',
    step1Guide: 'This quick 5-step walkthrough introduces SecretArea, helps you configure visual style, language, and optional torrent tools, and explains Intel PresentMon FPS telemetry before opening the app.',
    step2Guide: 'Pick a preset theme (Dark, Light, PS5, Xbox) or open the Custom Theme Builder to tune colors, buttons, and corners. Select your interface language below — everything previews immediately.',
    step3Guide: 'SecretArea scans your computer to check if qBittorrent is already installed so your current setup stays untouched. If it is missing, you can auto-install the official release or skip this step.',
    step4Guide: 'Connect SecretArea to qBittorrent local Web UI (127.0.0.1 only) so magnet links and .torrent files show live speed, seeds, peers, ETA, and ratio right inside SecretArea.',
    step5Guide: 'Review the summary of choices you just configured. All of these options stay unlocked anytime inside the Settings page.',
    platformHint: 'Adaptive desktop & compact viewport UI',
  },
  updater: {
    title: 'About & Updates',
    subtitle: 'SecretArea Desktop App',
    currentVersionLabel: 'Current Installed Version',
    checkBtn: 'Check for Updates',
    checkingBtn: 'Checking...',
    upToDateMsg: "You're using the latest version.",
    checkingMsg: 'Checking GitHub Releases for a newer version...',
    newVersionAvailable: 'New Version Available',
    whatsNewTitle: "What's New in This Update",
    whatsNewCountSuffix: 'changes',
    categoryFeature: 'New',
    categoryImprovement: 'Improved',
    categoryFix: 'Fixed',
    downloadUpdateBtn: 'Download Update',
    downloadingPrefix: 'Downloading',
    readyToInstall: 'is ready to install',
    readyToInstallDesc: 'Click Install and Restart to update from your previous version now, or postpone to keep using SecretArea and finish updating when you close the app.',
    installRestartBtn: 'Install and Restart',
    postponeBtn: 'Postpone',
    laterBtn: 'Later',
    detailsBtn: "What's New",
    toastUpdateAvailable: 'Update Available',
    toastUpdateReady: 'Update Ready',
    toastDownloading: 'Downloading',
    installedVersionLabel: 'Installed version',
    restartHint: 'Restart SecretArea to finish installing.',
    lastCheckedLabel: 'Last checked',
    errorFallback: 'Unable to check for updates right now.',
    preparingDownload: 'Preparing download...',
  },
  hardware: {
    pageTitle: 'Hardware Monitor',
    pageSubtitle: 'Real-time system telemetry, temperatures, storage throughput, and network performance.',
    startMonitoring: 'Start Monitoring',
    stopMonitoring: 'Stop Monitoring',
    refreshNow: 'Refresh Snapshot',
    statusActive: 'Monitoring Active',
    statusStopped: 'Monitoring Paused',
    statusWebPreview: 'Web Preview',
    intervalLabel: 'Refresh Interval',
    interval1s: '1s',
    interval1500ms: '1.5s',
    interval2s: '2s',
    interval3s: '3s',
    interval5s: '5s',
    naValue: 'N/A',
    unsupportedHint: 'Sensor unsupported or unavailable on this system',
    webPreviewTitle: 'Desktop Telemetry Required',
    webPreviewBody: 'Web Preview cannot access low-level OS hardware sensors directly. Launch the SecretArea Desktop app to read live CPU, GPU, RAM, storage, and network telemetry.',
    sectionOverview: 'System Overview',
    sectionPerformance: 'Live Performance',
    sectionDetails: 'Hardware Details',
    cpuTitle: 'Processor (CPU)',
    gpuTitle: 'Graphics (GPU)',
    ramTitle: 'Memory (RAM)',
    storageTitle: 'Storage Drives',
    networkTitle: 'Network Activity',
    modelLabel: 'Model',
    manufacturerLabel: 'Manufacturer',
    usageLabel: 'Usage',
    temperatureLabel: 'Temperature',
    clockSpeedLabel: 'Clock Speed',
    coresThreadsLabel: 'Cores / Threads',
    coresUnit: 'Cores',
    threadsUnit: 'Threads',
    powerLabel: 'Power Draw',
    perCoreUsageLabel: 'Logical Thread Load',
    vramLabel: 'VRAM Usage',
    fanSpeedLabel: 'Fan Speed',
    noGpuDetected: 'No GPU telemetry reported by this host.',
    totalRamLabel: 'Total RAM',
    usedRamLabel: 'Used RAM',
    availableRamLabel: 'Available RAM',
    memoryTypeLabel: 'Memory Type',
    memorySpeedLabel: 'Memory Speed',
    driveTypeLabel: 'Drive Type',
    capacityLabel: 'Total Capacity',
    usedSpaceLabel: 'Used Space',
    freeSpaceLabel: 'Free Space',
    readSpeedLabel: 'Read Speed',
    writeSpeedLabel: 'Write Speed',
    noStorageDetected: 'No storage drives reported by this host.',
    activeInterfaceLabel: 'Active Interface',
    linkStateLabel: 'Link State',
    linkSpeedLabel: 'Link Speed',
    downloadSpeedLabel: 'Download Speed',
    uploadSpeedLabel: 'Upload Speed',
    totalRxLabel: 'Total Received',
    totalTxLabel: 'Total Sent',
    noNetworkDetected: 'No active network interface detected.',
    uptimeLabel: 'System Uptime',
    hostLabel: 'Host',
    chartCpuRamTitle: 'CPU & RAM Utilization (%)',
    chartGpuTempTitle: 'GPU Load (%) & Temperatures (°C)',
    chartNetworkTitle: 'Network Throughput',
    chartCpuLoad: 'CPU Load',
    chartRamLoad: 'RAM Load',
    chartGpuLoad: 'GPU Load',
    chartCpuTemp: 'CPU Temp',
    chartGpuTemp: 'GPU Temp',
    chartNetDownload: 'Download',
    chartNetUpload: 'Upload',
    peakLabel: 'Peak',
    avgLabel: 'Avg',
    lastUpdatedLabel: 'Last sample',
    tabOverview: 'System Telemetry',
    tabGaming: 'Gaming & Bottlenecks',
    tabTechnologies: 'GPU Tech, Display & Laptop',
    tabCleaner: 'PC Cleaner',
    cpuSeriesLabel: 'Series',
    cpuGenerationLabel: 'Generation',
    ramChannelsLabel: 'Channel Mode',
    ramSlotsLabel: 'Populated Slots',
    gamingTitle: 'Gaming Performance Monitor',
    gamingSubtitle: 'Session-based FPS & frame-time capture (via PresentMon ETW), ping monitoring, hardware correlation, and multi-sample bottleneck analysis.',
    gamingSelectProcess: 'Target Game / Process',
    gamingAllProcesses: 'Foreground Active Window',
    gamingRefreshProcesses: 'Refresh Processes',
    gamingPingHost: 'Latency Probe Host',
    gamingStartSession: 'Start Gaming Session',
    gamingStopSession: 'Stop Gaming Session',
    gamingSessionActive: 'Session Active',
    gamingSessionDuration: 'Duration',
    gamingPresentMonMissingTitle: 'PresentMon ETW Not Installed — FPS Metrics Show N/A',
    gamingPresentMonMissingDesc: 'SecretArea never fakes or injects overlays into games. Place Intel PresentMon CLI (PresentMon.exe) in resources/bin/PresentMon.exe or install it under %LOCALAPPDATA%\\Intel\\PresentMon to enable real DX11/DX12/Vulkan/OpenGL FPS, 1% Low, and Frame Time capture.',
    gamingPresentMonReady: 'PresentMon ETW Ready',
    gamingFpsCurrent: 'Current FPS',
    gamingFpsAvg: 'Average FPS',
    gamingFps1Low: '1% Low FPS',
    gamingFps01Low: '0.1% Low FPS',
    gamingFpsMax: 'Max FPS',
    gamingFrameTimeAvg: 'Avg Frame Time',
    gamingFrameTimeP95: 'P95 Frame Time',
    gamingFramePacing: 'Frame Pacing Stability',
    gamingSpikes: 'Frame Spikes',
    gamingStutters: 'Stutters (>2.2x)',
    gamingDroppedFrames: 'Dropped Frames',
    gamingFrameTimeChartTitle: 'Real-Time Frame Time History (ms)',
    gamingNetworkLatencyTitle: 'Network & Thermal Telemetry',
    gamingPingLabel: 'ICMP Ping',
    gamingPacketLossLabel: 'Packet Loss',
    gamingInputLatencyLabel: 'Input Latency',
    gamingThrottlingLabel: 'Thermal Throttling',
    gamingThrottlingDetected: 'Throttling Detected',
    gamingThrottlingNormal: 'Nominal Temps',
    gamingBottleneckTitle: 'Multi-Sample Bottleneck Analysis',
    gamingBottleneckWarming: 'Collecting multi-sample rolling baseline (requires at least 5 consecutive samples to prevent false alerts)...',
    gamingHistoryTitle: 'Local Gaming Session History',
    gamingHistoryEmpty: 'No saved gaming sessions yet. Start and stop a session to record FPS, thermal, and bottleneck metrics.',
    gamingClearHistory: 'Clear History',
    gamingCompareTitle: 'Compare Two Sessions',
    gamingCompareSelectA: 'Session A',
    gamingCompareSelectB: 'Session B',
    techTitle: 'Graphics Technologies & Hardware Capabilities',
    techSubtitle: 'Verified GPU architecture support matrix across NVIDIA, AMD, and Intel. Game-level features are marked honestly without fake global activation.',
    techStatusSupported: 'Supported',
    techStatusDetected: 'Detected',
    techStatusActive: 'Active',
    techStatusUnsupported: 'Unsupported',
    techStatusUnavailable: 'Unavailable',
    techStatusRequiresGame: 'Requires Game Integration',
    techStatusRequiresDriver: 'Requires Driver / SDK',
    techArchitectureLabel: 'Architecture',
    techDriverLabel: 'Driver Version',
    techRebarLabel: 'Resizable BAR / SAM',
    displayTitle: 'Display & Windows Gaming Settings',
    displayPrimaryLabel: 'Primary Display',
    displayResolutionLabel: 'Resolution',
    displayRefreshRateLabel: 'Refresh Rate',
    displayConnectionLabel: 'Connection Type',
    displayActiveGpuLabel: 'Active Rendering GPU',
    displayDirectXLabel: 'DirectX Capability',
    displayHagsLabel: 'Hardware-Accelerated GPU Scheduling',
    displayGameModeLabel: 'Windows Game Mode',
    displayHdrLabel: 'HDR Support',
    displayVrrLabel: 'VRR / Adaptive Sync',
    laptopTitle: 'Laptop & Power Telemetry',
    laptopBatteryLabel: 'Battery Charge',
    laptopPowerStateLabel: 'Power Source',
    laptopPluggedIn: 'AC Plugged In',
    laptopOnBattery: 'On Battery',
    laptopCharging: 'Charging',
    laptopHealthLabel: 'Battery Health',
    laptopPowerPlanLabel: 'Active Power Plan',
    laptopHybridGpuLabel: 'Hybrid GPU Mode',
    laptopDesktopNotice: 'No system battery detected — running in Desktop AC configuration.',
    cleanerTitle: 'Safe PC Cleaner & Cache Optimizer',
    cleanerSubtitle: 'Scan temporary folders first, inspect exact paths and byte counts, then confirm cleanup.',
    cleanerSafetyBannerTitle: 'Strict Personal Data & Game File Protection',
    cleanerSafetyBannerDesc: 'SecretArea NEVER scans or deletes Desktop, Documents, Downloads, Pictures, Videos, Game installs, Saves, Mods, Windows/System32, or browser passwords, bookmarks, cookies, and history. Locked files are safely skipped.',
    cleanerScanBtn: 'Scan Safe Locations',
    cleanerScanningBtn: 'Scanning...',
    cleanerCleanBtn: 'Review & Clean Selected',
    cleanerCleaningBtn: 'Cleaning...',
    cleanerSelectSafeDefaults: 'Select Recommended Safe Defaults',
    cleanerEstimatedTotal: 'Selected to Free',
    cleanerOptInBadge: 'Opt-In Caution',
    cleanerOptInWarningDesc: 'Opt-in category (unchecked by default). Clearing shader cache may cause temporary stutter while games recompile shaders; Recycle Bin permanently removes trashed files.',
    cleanerPathsLabel: 'Target Paths',
    cleanerConfirmTitle: 'Confirm PC Cleanup',
    cleanerConfirmDesc: 'Review the selected temporary and cache categories below before permanently removing files.',
    cleanerConfirmAction: 'Confirm & Clean Files',
    cleanerCancelAction: 'Cancel',
    cleanerProgressCleaning: 'Cleaning selected caches...',
    cleanerReportTitle: 'Cleanup Completed',
    cleanerReportFreed: 'Space Freed',
    cleanerReportRemoved: 'Files Removed',
    cleanerReportSkipped: 'Locked Files Skipped',
    cleanerCatOldTempTitle: 'Old System Temporary Files (>48h)',
    cleanerCatOldTempDesc: 'Expired system temp files under Windows\\Temp or /tmp older than 48 hours.',
    cleanerCatUserTempTitle: 'User Temp Folder',
    cleanerCatUserTempDesc: 'User application temporary files inside %TEMP%.',
    cleanerCatAppCacheTitle: 'App Temporary Caches',
    cleanerCatAppCacheDesc: 'Safe crash dumps, temp logs, and non-user updater caches.',
    cleanerCatSecretAreaCacheTitle: 'SecretArea Launcher Cache',
    cleanerCatSecretAreaCacheDesc: 'Internal Chromium HTTP cache, GPU cache, and temp downloads inside SecretArea.',
    cleanerCatThumbnailTitle: 'Windows Explorer Thumbnail Cache',
    cleanerCatThumbnailDesc: 'Explorer thumbcache_*.db files (Windows rebuilds automatically).',
    cleanerCatShaderTitle: 'DirectX / GPU Shader Cache',
    cleanerCatShaderDesc: 'Compiled D3DSCache & GPU vendor shader caches. Games will rebuild shaders on next launch.',
    cleanerCatRecycleTitle: 'Windows Recycle Bin',
    cleanerCatRecycleDesc: 'Permanently empties items currently sitting in the Recycle Bin.',
    cleanerCatBrowserTitle: 'Browser HTTP Cache Only (No History/Cookies)',
    cleanerCatBrowserDesc: 'Clears ONLY Cache / Code Cache folders in Edge, Chrome, or Firefox. Preserves logins, cookies, bookmarks, and history.',
    tabHealth: 'Health & Diagnostics',
    tabInventoryPorts: 'System & Ports',
    tabAdvisors2030: 'Advisors & 2030+',
    tabBenchmarksDb: 'Benchmarks & DB',
    provDetected: 'Detected',
    provMeasured: 'Measured',
    provSpec: 'Spec',
    provEstimated: 'Estimated',
    provNotSupported: 'Not Supported',
    provNotDetected: 'Not Detected',
    provSensorUnavailable: 'Sensor Unavailable',
    provRequiresAdmin: 'Requires Admin',
    provUnknown: 'Unknown',
    workloadProfileLabel: 'Primary Workload',
    workloadGaming: 'Gaming',
    workloadOffice: 'Office & Everyday',
    workloadProgramming: 'Programming & VMs',
    workload3d: '3D Modeling & Rendering',
    workloadVideo: 'Video Editing',
    workloadDesign: 'Graphic Design',
    workloadAi: 'AI / Machine Learning',
    workloadPro: 'General Professional',
    workloadMixed: 'Mixed Usage',
    intelRefreshDeepScan: 'Rescan Hardware',
    loadingDeepScan: 'Collecting deep hardware inventory...',
    intelPrivacyOn: 'Privacy Shield: ON',
    intelPrivacyOff: 'Privacy Shield: OFF',
    intelExportJson: 'Export JSON',
    intelExportPdf: 'Export PDF',
    intelExportHtml: 'Export Report',
    intelExportSuccess: 'Hardware report exported successfully',
    intelExportHtmlWebNote: 'Printable HTML report downloaded (open and Print to PDF).',
    intelUnknown: 'Unknown',
    intelUnavailable: 'Unavailable',
    intelNotDetected: 'Not Detected',
    intelSensorUnavailable: 'Sensor Unavailable',
    intelSourceLabel: 'Sensor Source',
    desktopOnlyHint: 'Available in SecretArea Desktop (Windows / Linux).',
    healthPhysicalTitle: 'Physical Health',
    healthMeasuredCoverage: 'components measured',
    healthPerformanceTitle: 'Performance Capability',
    healthAgeTitle: 'Hardware Generation Age',
    healthAgeNote: 'Derived from matched CPU/GPU/RAM release years',
    healthLifespanTitle: 'Estimated Useful Life',
    healthLifespanDisclaimer: 'Depends on workloads, thermal care & component wear',
    healthBreakdownTitle: 'Component Health & Bottleneck Analysis',
    thermalCoolingTitle: 'Fans, Cooling & Thermal Diagnostics',
    fanNoSourceHint: 'No fan RPM bridge detected (install LibreHardwareMonitor on Windows for motherboard fan RPM)',
    fansDetectedHeader: 'Detected Fans & Cooling',
    fansUnavailableBody: 'No fan RPM sensors were exposed by OS APIs. Running LibreHardwareMonitor on Windows or lm-sensors/hwmon on Linux exposes motherboard and case fan RPMs without guessing.',
    fanStatusRunning: 'Running',
    fanStatusStopped: 'Stopped — Confirmed',
    fanStatusAbnormal: 'Abnormal RPM',
    fanStatusNotDetected: 'Not Detected',
    fanStatusUnavailable: 'Sensor Unavailable',
    thermalSensorsHeader: 'Temperature Sensors',
    thermalPhysicalNoticeTitle: 'Physical Inspection Required',
    errorsDriversTitle: 'Hardware Errors, Event Logs & Drivers',
    errorsDriversSubtitle: 'Read-only Device Manager codes, WHEA/Disk/Display Event Viewer logs & signed drivers',
    pnpErrorsHeader: 'Device Manager Errors',
    pnpNoErrors: 'No Device Manager hardware error codes detected.',
    eventLogsHeader: 'System Event Logs (14 Days)',
    eventLogsEmpty: 'No critical WHEA, disk, display, or thermal events recorded.',
    signedDriversHeader: 'Signed Hardware Drivers',
    searchDriversPlaceholder: 'Search drivers or class...',
    driverDeviceCol: 'Device',
    driverClassCol: 'Class',
    driverVersionCol: 'Version',
    driverDateCol: 'Date',
    driverSignedCol: 'Signature',
    driverSigned: 'Signed',
    driverUnsigned: 'Unsigned',
    sysIdTitle: 'System Identification',
    sysFormFactor: 'Form Factor',
    sysSku: 'Product / SKU',
    sysSerialMasked: 'Serial (Masked)',
    sysOsBuild: 'OS & Build',
    sysArch: 'Architecture',
    sysBootMode: 'Boot Mode',
    sysSecureBoot: 'Secure Boot',
    sysTpm: 'TPM Security',
    sysSensorBackends: 'Active Telemetry Backends',
    moboTitle: 'Motherboard Diagnostics',
    moboChipset: 'Chipset',
    moboSocket: 'CPU Socket',
    moboBios: 'BIOS / UEFI',
    moboBiosDate: 'BIOS Date',
    moboRamSupport: 'Memory Support',
    moboPcieSlots: 'PCIe / Expansion Slots (SMBIOS)',
    portsTitle: 'Ports, Connectors & Hardware Controllers',
    portsSubtitle: 'Strictly separates physical SMBIOS ports from OS host controllers and plugged devices',
    portsHonestyBanner: 'Accuracy rule: A USB host controller is NOT counted as 1 physical USB port. Unconfirmed chassis ports are separated rather than guessed.',
    portsTabConfirmed: 'Confirmed Physical Ports',
    portsTabControllers: 'Hardware Controllers',
    portsTabConnected: 'Connected Devices',
    portsTabUnconfirmed: 'Unconfirmed / Internal Headers',
    portsBucketEmpty: 'No items reported in this category by the OS/SMBIOS tables.',
    storageSmartTitle: 'Storage Health & SMART Diagnostics',
    storageSmartSubtitle: 'Drives without SMART reliability counters are marked Unavailable — never assumed healthy',
    smartUnavailable: 'SMART Unavailable',
    smartWearLabel: 'SSD Wear / Life',
    smartPohLabel: 'Power-On Hours',
    smartCyclesLabel: 'Power Cycles',
    smartErrorsLabel: 'Uncorrected Errors',
    cpuGpuDeepTitle: 'Expanded CPU & Multi-GPU Roles',
    cpuCacheLabel: 'CPU Cache',
    cpuVirtLabel: 'Hardware Virtualization',
    cpuVoltageLabel: 'Core Voltage',
    multiGpuRolesHeader: 'GPU Role Assignment (iGPU vs dGPU)',
    ramDimmsTitle: 'RAM & Per-DIMM Breakdown',
    ramEccLabel: 'ECC Status',
    ramPagefileLabel: 'Pagefile / Virtual Memory',
    ramDimmsUnavailable: 'Per-slot DIMM SMBIOS details are unavailable in this environment.',
    displaysDeepTitle: 'Displays & EDID Physical Dimensions',
    powerPsuBatteryTitle: 'Power Supply & Battery Diagnostics',
    psuTelemetryHeader: 'Desktop PSU Telemetry Disclosure',
    batteryDesignVsFull: 'Full vs Design Capacity',
    batteryCyclesLabel: 'Charge Cycles',
    batteryRateLabel: 'Charge / Discharge Rate',
    peripheralsNetTitle: 'Network Links, Peripherals & System Components',
    adaptersLabel: 'Adapters',
    peripheralsLabel: 'Peripherals',
    systemComponentsLabel: 'Controllers & Components',
    future2030Title: 'Future Compatibility & 2030+ Advisor',
    future2030Subtitle: 'Separates verified detected hardware facts from forward projections (2027–2030+)',
    futureProjectedVerdict: 'Projected Readiness',
    futureVerifiedFactsTitle: 'Verified Hardware Facts',
    futureForwardEstimatesTitle: 'Forward Estimates & Assumptions',
    upgradeAdvisorTitle: 'Smart Upgrade Advisor',
    upgradeAdvisorSubtitle: 'Checks socket, RAM generation/slots, soldered laptop constraints & PSU headroom',
    psuWattageInputLabel: 'Your Desktop PSU Wattage (W)',
    psuApplyBtn: 'Verify PSU',
    psuOptionalHint: 'Optional — software cannot read standard ATX PSU wattage.',
    upgradeNoneNeeded: 'No urgent compatibility-verified hardware upgrades required for your selected workload.',
    compatVerified: 'Compatibility Verified',
    compatCheckNeeded: 'Verify Clearance / PSU',
    gamingCompatTitle: 'Gaming Compatibility & Catalog Checker',
    gamingCompatSubtitle: 'Realistic resolution/preset guidance plus SecretArea Game Catalog checks (no fake FPS)',
    catalogGamesCheckTitle: 'Test Against SecretArea Catalog Games',
    catalogSearchPlaceholder: 'Search catalog game...',
    proCompatTitle: 'Professional Application Compatibility',
    maintenanceTitle: 'Maintenance & Preventive Care Advisor',
    maintenanceSafetyNote: 'Read-only guidance — never auto-flashes BIOS, edits voltages, or deletes personal data',
    benchTitle: 'Safe Optional Micro-Benchmarks',
    benchSubtitle: 'Short, non-destructive, cancellable tests with live temperature safety auto-abort',
    benchSafetyNotice: 'Benchmarks are optional and user-triggered. Desktop mode aborts automatically if CPU >= 92°C or GPU >= 88°C. Storage tests run only on a temporary file in OS temp space and delete it immediately.',
    benchCpuSingle: 'CPU Single-Thread',
    benchCpuMulti: 'CPU Multi-Thread',
    benchRamThroughput: 'RAM Bandwidth',
    benchStorageSeq: 'Storage Sequential (Temp)',
    benchStorage4k: 'Storage 4K Read (Temp)',
    benchNetLatency: 'Network Latency',
    benchStartBtn: 'Run Selected Safe Tests',
    benchStartWebBtn: 'Run Browser-Safe Micro-Tests',
    benchCancelBtn: 'Stop Benchmark',
    benchStarting: 'Preparing safe benchmark...',
    benchRunningWeb: 'Running browser-safe micro-benchmarks...',
    benchCompleted: 'Benchmark completed.',
    benchAbortedThermal: 'Stopped safely due to thermal safety limit.',
    benchCancelled: 'Benchmark cancelled by user.',
    dbTitle: 'Hardware Generation Database & Auto-Updater',
    dbVersionLabel: 'Database Version',
    dbEntriesLabel: 'entries',
    dbSourceLabel: 'Active Source',
    dbCheckUpdateBtn: 'Check Feed Update',
    dbCustomFeedConsentLabel: 'I trust this custom HTTPS feed URL and understand it overrides the official database.',
    dbImportJsonBtn: 'Import JSON',
    dbRollbackBtn: 'Rollback Backup',
    dbSearchPlaceholder: 'Filter CPUs, GPUs, RAM, Chipsets...',
    dbWebOfflineNote: 'Using bundled offline hardware database in Web Preview mode.',
    dbUpdateApplied: 'Hardware database updated and schema-verified.',
    dbUpToDate: 'Verified local hardware database is active.',
    dbImportSuccess: 'Local JSON hardware database imported and verified.',
    dbRollbackSuccess: 'Rolled back to last-known-good hardware database backup.',
    tabOpenSourceTools: 'Open-Source Tools',
    ossTitle: 'Open-Source Hardware Tools & Release Manager',
    ossSubtitle: 'Verified open-source telemetry engines fetched directly from official GitHub Releases and NuGet with SHA-256 verification.',
    ossPolicyBadge: 'OSI Open-Source Only',
    ossPolicyDesc: 'Only genuinely open-source and free software (such as LibreHardwareMonitorLib under MPL-2.0) is eligible. Closed-source proprietary utilities are strictly excluded.',
    ossCheckUpdatesBtn: 'Check Latest Release',
    ossCheckingBtn: 'Checking Official Releases...',
    ossInstallBtn: 'Install Approved Build',
    ossUpdateBtn: 'Update to Latest',
    ossReinstallBtn: 'Reinstall & Verify',
    ossRollbackBtn: 'Rollback Previous',
    ossCancelBtn: 'Cancel',
    ossConfirmDownloadTitle: 'Confirm Official Open-Source Download',
    ossConfirmDownloadDesc: 'SecretArea will download the official build directly from GitHub Releases or NuGet, verify its SHA-256 checksum and binary integrity, and install LibreHardwareMonitorLib locally without standalone GUI clutter.',
    ossConfirmRollbackDesc: 'Restore the backed-up previous version of LibreHardwareMonitorLib into the active local tools directory.',
    ossConfirmProceedBtn: 'Approve & Continue',
    ossInstalledVersionLabel: 'Installed Version',
    ossLatestVersionLabel: 'Latest Stable Release',
    ossStatusLabel: 'Status',
    ossLastCheckedLabel: 'Last Update Check',
    ossReleaseDateLabel: 'Release Date',
    ossReleaseNotesLabel: 'Official Release Notes',
    ossNoReleaseNotes: 'Click "Check Latest Release" to fetch current version, release date, and release notes dynamically from GitHub.',
    ossStatusNotInstalled: 'Not Installed',
    ossStatusUpToDate: 'Up to Date',
    ossStatusUpdateAvailable: 'Update Available',
    ossStatusNewerInstalled: 'Newer Local Build',
    ossStatusRepairRequired: 'Repair Required',
    ossStageDownloading: 'Downloading official archive',
    ossStageVerifying: 'Verifying SHA-256 & PE integrity',
    ossStageInstalling: 'Extracting & activating library',
    ossLinkRepo: 'GitHub Repository',
    ossLinkReleases: 'Official Releases',
    ossLinkNuget: 'NuGet Package',
    ossLinkLicense: 'MPL-2.0 License',
    ossLinkSource: 'Source Code',
    ossDirectLibBadge: 'Direct DLL Engine · No GUI Required',
    ossShaVerifiedBadge: 'SHA-256 Verified',
    ossAdminTitle: 'Standard User Safety & Elevation Scope',
    ossAdminDescStandard: 'SecretArea never runs permanently as Administrator. GPU, NVMe/SMART, and memory sensors run safely as a standard user; low-level Ring0 motherboard VRM, voltage, and SuperIO fan RPM headers require elevated Windows sensor access when unavailable in standard mode.',
    ossAdminDescElevated: 'Current session has Administrator sensor access enabled; full Ring0 motherboard, VRM, voltage, and SuperIO fan sensors can be queried directly via LibreHardwareMonitorLib.',
    ossThirdPartyTitle: 'Third-Party Open-Source License Compliance (MPL-2.0)',
    ossThirdPartyDesc: 'LibreHardwareMonitorLib is licensed under the Mozilla Public License 2.0 (MPL-2.0) by the LibreHardwareMonitor Contributors. Official license notices are preserved alongside the local library installation and in THIRD_PARTY_LICENSES.md.',
    ossWebPreviewNote: 'Desktop Downloads Disabled in Web Preview: Open SecretArea Desktop on Windows 10/11 to download, verify SHA-256 checksums, and run LibreHardwareMonitorLib telemetry.',
    ossPlatformUnsupportedNote: 'Direct LibreHardwareMonitorLib (.NET DLL) integration targets Windows 10/11 hosts. On Linux, SecretArea uses native sysfs hwmon/DRM kernel telemetry automatically.',
  },
  updateHistory: {
    title: 'Update History',
    subtitle: 'Full release timeline and changelogs across SecretArea versions',
    settingsCardTitle: 'App Version & Update History',
    settingsCardDesc: 'Review every previous SecretArea Desktop release and inspect what changed in each build.',
    openHistoryBtn: 'Update History',
    searchPlaceholder: 'Search versions, features, or fixes...',
    filterAll: 'All',
    filterFeature: 'Features',
    filterImprovement: 'Improvements',
    filterFix: 'Fixes',
    currentBadge: 'Installed',
    latestBadge: 'Latest',
    refreshBtn: 'Refresh',
    refreshingBtn: 'Syncing...',
    checkUpdatesBtn: 'Check for Updates',
    emptyState: 'No releases or changelog entries match your filter.',
    changesSuffix: 'changes',
    closeBtn: 'Close',
    devBadge: 'In Development',
    updateAvailableBadge: 'Update Available',
    installedDevBadge: 'Running (Dev Mode)',
    devModeEnvLabel: 'Development Mode',
    prodEnvLabel: 'Installed Build',
    unpublishedNote: 'Not yet pushed to GitHub',
    syncingAutoLabel: 'Auto-syncing releases...',
    newCountLabel: 'New',
    changedCountLabel: 'Changed',
    fixedCountLabel: 'Fixed',
    justUpdatedTitle: "What's New in This Version",
    justUpdatedFromPrefix: 'Updated automatically from',
    newlyInstalledBadge: 'Just Installed',
  },
  notificationCenter: {
    buttonLabel: 'Notifications',
    title: 'Notification Center',
    subtitle: 'Latest 3 new games & catalog updates',
    syncNowBtn: 'Sync Now',
    syncingBtn: 'Syncing...',
    markAllReadBtn: 'Mark all read',
    updateHistoryBtn: 'Update History',
    lastSyncedPrefix: 'Last sync',
    neverSynced: 'Synced locally',
    searchPlaceholder: 'Filter titles, versions, or tabs...',
    filterAll: 'All',
    filterImportant: 'Important Tabs',
    filterNews: 'Just News',
    importantHint: 'Core releases from Games, Hypervisor, SteamTools, PS5, Tools & Savegames',
    newsHint: 'Announcements & trending feeds from Upcoming, Upcoming List & Popular Repacks',
    liveBadge: 'Live',
    newBadge: 'New',
    updatedBadge: 'Updated',
    upcomingBadge: 'Upcoming',
    popularBadge: 'Popular',
    openItemHint: 'Open',
    openExtrasHint: 'Open in Extras',
    emptyTitle: 'You are all caught up',
    emptyDesc: 'No recent catalog updates or new games yet.',
    syncedToast: 'Catalog synchronized',
    newUpdatesToastPrefix: 'new catalog updates',
    tabLabels: {
      all: 'All Tabs',
      game: 'Games',
      hypervisor: 'Hypervisor',
      steamtools: 'SteamTools',
      ps5: 'PS5',
      architect: 'Tools',
      extra: 'Savegames',
      upcoming: 'Upcoming',
      upcominglist: 'Upcoming List',
      popularrepacks: 'Popular Repacks',
    },
  },
  spinWheel: {
    title: 'Popular Repacks Spin Wheel',
    subtitle: 'Spin the wheel to discover a random pick from Most Popular Games',
    spinBtn: 'Spin the Wheel',
    spinningLabel: 'Spinning...',
    spinAgainBtn: 'Spin Again',
    viewGameBtn: 'View game detail',
    poolCountSuffix: 'games in pool',
    filterAll: 'All Popular',
    filterGames: 'Games',
    filterHv: 'Hypervisor',
    filterCanRun: 'Can Run It',
    readyTitle: 'Ready to Discover Something Great?',
    readyDesc: 'Click SPIN in the center of the wheel to pick a random title from our Most Popular Games catalog.',
    winnerLabel: 'Lucky Pick',
    recentTitle: 'Recent Spins',
    emptyPool: 'No games match this filter in Popular Repacks.',
    repackSizeLabel: 'Repack',
    originalSizeLabel: 'Original',
    canRunPass: 'Runs well on your PC',
    canRunFail: 'Below PC specs',
    addFavorite: 'Favorite',
    removeFavorite: 'Favorited',
    congratsTitle: 'Congratulations!',
    congratsSubtitle: 'Your lucky Popular Games pick is ready.',
  },
  deals: {
    pageTitle: 'Game Discovery & Deals Hub',
    pageSubtitle: 'Live PC discounts, multi-store price comparisons, and verified free games.',
    refreshBtn: 'Refresh',
    refreshingBtn: 'Refreshing',
    lastUpdatedPrefix: 'Updated',
    regionLabel: 'Store Region',
    currencyLabel: 'Currency',
    allCurrenciesLabel: 'All Currencies',
    liveFxRateLabel: 'Live FX',
    fxLoadingLabel: 'Updating rates...',
    fxUnavailableLabel: 'FX unavailable · Native USD',
    sourcePriceHint: 'Store price',
    currencyNames: {
      USD: 'US Dollar',
      MAD: 'Moroccan Dirham',
      EUR: 'Euro',
      GBP: 'British Pound',
      CAD: 'Canadian Dollar',
      SAR: 'Saudi Riyal',
      AED: 'UAE Dirham',
      TRY: 'Turkish Lira',
      BRL: 'Brazilian Real',
      JPY: 'Japanese Yen',
    },
    tabOverview: 'Overview',
    tabAllDeals: 'All Deals',
    tabFreeGames: 'Free Games',
    tabStores: 'Store Explorer',
    featuredDealsTitle: 'Featured Deals',
    bestDiscountsTitle: 'Best Discounts',
    trendingDealsTitle: 'Trending Deals',
    recentlyUpdatedTitle: 'Recently Updated Deals',
    freeGamesSpotlightTitle: 'Free Games & Giveaways',
    popularGamesTitle: 'Popular Games',
    viewAllBtn: 'Browse All',
    searchPlaceholder: 'Search PC games by title...',
    storeFilterAll: 'All Verified Stores',
    minPriceLabel: 'Min',
    maxPriceLabel: 'Max',
    minDiscountLabel: 'Discount',
    discountAny: 'Any %',
    sortLabel: 'Sort',
    sortDealRating: 'Best Deal Rating',
    sortSavings: 'Highest Discount',
    sortPriceAsc: 'Lowest Price',
    sortPriceDesc: 'Highest Price',
    sortRecent: 'Recently Updated',
    sortMetacritic: 'Metacritic Score',
    sortTitle: 'Title A–Z',
    resetFiltersBtn: 'Reset',
    resultsCountSuffix: 'deals',
    pageLabel: 'Page',
    ofLabel: 'of',
    prevPageBtn: 'Previous',
    nextPageBtn: 'Next',
    freeCatLimited: 'Limited-Time Free',
    freeCatGiveaways: 'Free Giveaways',
    freeCatFreeToPlay: 'Free-to-Play Games',
    freeCatLimitedDesc: 'Paid games temporarily 100% off — prioritized by earliest expiration.',
    freeCatGiveawaysDesc: 'Verified DLCs, loot packs, and promotional key giveaways.',
    freeCatFreeToPlayDesc: 'Permanently free-to-play PC titles from verified publishers.',
    expiresPrefix: 'Ends in',
    noExpiryLabel: 'Permanent Free-to-Play',
    originalWorthPrefix: 'Orig.',
    claimFreeBtn: 'Claim Free',
    playFreeBtn: 'Open Store',
    viewDealBtn: 'View Deal',
    compareOffersBtn: 'Compare Stores',
    dealRatingLabel: 'Rating',
    freeBadge: 'FREE',
    storesTitle: 'Verified Digital Stores',
    storesSubtitle: 'Live storefronts dynamically retrieved from integrated deal providers.',
    storeActiveDealsSuffix: 'featured deals',
    storeTopDiscountPrefix: 'Up to',
    browseStoreBtn: 'Browse Store Deals',
    detailOffersTitle: 'Multi-Store Price Comparison',
    detailHistoricalLowLabel: 'Historical Lowest',
    detailHistoricalDatePrefix: 'Recorded',
    detailBestPriceLabel: 'Current Best Price',
    detailLoadingOffers: 'Loading store offers and historical low...',
    detailCurrencyNotice: 'Converted estimates use live FX rates; native store prices are shown alongside.',
    detailStoreCol: 'Store',
    detailOriginalCol: 'Original',
    detailCurrentCol: 'Current',
    detailDiscountCol: 'Discount',
    detailActionCol: 'Link',
    detailCloseBtn: 'Close',
    emptyDealsTitle: 'No deals match your filters',
    emptyDealsDesc: 'Try lowering the minimum discount, widening your price range, or clearing search.',
    emptyFreeTitle: 'No active offers in this category right now',
    emptyFreeDesc: 'Verified offers appear automatically when stores publish eligible promotions.',
    errorTitle: 'Could not load live deals',
    offlineDesc: 'You appear to be offline. Reconnect to fetch fresh prices and free games.',
    retryBtn: 'Try Again',
    tabLivePlayers: 'Live Players',
    tabCompare: 'Compare',
    tabAlerts: 'Price Alerts',
    whatsHotTodayTitle: "What's Hot Today",
    whatsHotSubtitle: 'Live concurrent player surges, top discounts, and trending releases',
    hotMostPlayed: 'Most Played Live',
    hotBiggestGains: 'Biggest 24h Gains',
    hotNewReleases: 'Popular New Releases',
    hotBestDiscounts: 'Top Discounts',
    kpiTopPlayers: 'Top 100 Steam Concurrent',
    kpiActiveDeals: 'Tracked Store Deals',
    kpiFreeNow: 'Free Games & Giveaways',
    kpiFollowedAlerts: 'Followed Price Alerts',
    livePlayersTitle: 'Live Steam Players & Trends',
    livePlayersSubtitle: 'Top concurrent counts, 24h momentum, and review velocity movements',
    liveTabTop100: 'Top 100 Live',
    liveTabGainers: 'Biggest Gains',
    liveTabDecliners: 'Declining',
    liveTabReviewMovers: 'Review Movers',
    liveSearchPlaceholder: 'Filter by game title or Steam App ID...',
    liveColRank: 'Rank',
    liveColGame: 'Game',
    liveColPlayers: 'Players Now',
    liveColPeak24h: '24h Peak',
    liveColChange24h: '24h Change',
    liveColTrend7d: '7d Trend',
    liveColPrice: 'Steam Price',
    liveColActions: 'Actions',
    healthLegendTitle: 'Game Health & Popularity Tiers',
    healthLegendDesc: 'Health tiers reflect recent 30-day peak retention and census snapshot activity (never fabricated real-time estimates).',
    healthTiers: {
      thriving: 'Thriving',
      healthy: 'Healthy',
      cooling: 'Cooling',
      quiet: 'Quiet',
      dormant: 'Dormant',
      unknown: 'Unrated',
    },
    freeFilterAll: 'All Stores',
    freeFilterEpic: 'Epic Games',
    freeFilterSteam: 'Steam',
    freeFilterGog: 'GOG',
    freeFilterPcDlc: 'DLC & Rewards',
    compareTitle: 'Side-by-Side Game Comparison',
    compareSubtitle: 'Compare live players, Steam reviews, separate critic scores, and store pricing (2–4 games)',
    compareSearchPlaceholder: 'Search any PC game to add to comparison...',
    compareAddBtn: 'Compare',
    compareAddedBadge: 'Added',
    compareRemoveBtn: 'Remove',
    compareClearBtn: 'Clear All',
    compareEmptyTitle: 'Select games to compare',
    compareEmptyDesc: 'Search above or click the Compare icon on any deal or live player row.',
    compareMaxNotice: 'Comparison supports up to 4 games side-by-side.',
    compareMetricCol: 'Metric',
    alertsTitle: 'Price Drop Alerts',
    alertsSubtitle: 'Follow games and receive local alerts when store prices drop below your target',
    alertsCheckNowBtn: 'Check Prices Now',
    alertsCheckingBtn: 'Checking...',
    alertsFollowBtn: 'Follow Price',
    alertsFollowingBadge: 'Alert Active',
    alertsTargetPriceLabel: 'Target Price',
    alertsAnyDropOption: 'Any drop',
    alertsLastCheckedLabel: 'Last checked',
    alertsTriggeredTitle: 'Triggered Price Drops',
    alertsFollowedTitle: 'Followed Games',
    alertsMarkAllReadBtn: 'Mark All Read',
    alertsClearEventsBtn: 'Clear History',
    alertsEmptyFollowed: 'No games followed yet. Click the bell icon on any game deal or player row.',
    alertsEmptyTriggered: 'No price drops detected yet. Checks run automatically when you refresh.',
    alertsDropDetectedToast: 'Price drop detected for',
    modalTabOverview: 'Overview & Stores',
    modalTabCharts: 'Player & Price Charts',
    modalTabReviewsCritics: 'Reviews & Critics',
    modalTabStatsNews: 'Stats, Achievements & News',
    playerChartTitle: 'Historical Steam Concurrent Players',
    priceChartTitle: 'Historical Steam & Store Price Timeline',
    noChartData: 'No historical data available from connected providers for this title yet.',
    discountShameWarning: 'Price-raise alert: Base price increased before this sale started.',
    criticsSectionTitle: 'Independent Ratings & Critic Scores',
    criticsSeparateNote: 'Each platform score uses its own native scale and review base and is never merged.',
    steamRatingCardTitle: 'Steam User Rating',
    metacriticScoreCardTitle: 'Metacritic Metascore',
    metacriticUserCardTitle: 'Metacritic User Score',
    openCriticCardTitle: 'OpenCritic Score',
    keyRequiredBadge: 'Optional Key Needed',
    configureKeyAction: 'Configure API Key',
    reviewsPositiveLabel: 'Positive',
    reviewsNegativeLabel: 'Negative',
    reviewsDailyTrendTitle: 'Review Velocity Trend',
    reviewsRecentTitle: 'Player Reviews',
    reviewsSnapshotNote: 'Snapshot aggregate & trend courtesy of The Game Census (thegamecensus.com, CC BY 4.0).',
    achievementsTitle: 'Global Achievement Unlock Rates',
    newsUpdatesTitle: 'News & Recent Patch Impact',
    updateImpactLabel: 'Post-update players',
    developerLabel: 'Developer',
    publisherLabel: 'Publisher',
    releaseDateLabel: 'Release Date',
    platformsLabel: 'Platforms',
    healthStatusLabel: 'Game Health',
    sourcesLabel: 'Data Sources',
    apiKeysBtn: 'API Keys',
    apiKeysTitle: 'Gaming Intelligence Providers & Optional Keys',
    apiKeysSubtitle: 'Free public APIs work automatically. Optional keys unlock extended Steam Index, Metacritic User Scores, and OpenCritic ratings inside Electron safeStorage.',
    apiKeysFreeLabel: 'Active Public APIs (No Key Required)',
    apiKeysOptionalLabel: 'Optional Authenticated APIs (Encrypted Locally)',
    apiKeysSaveBtn: 'Save Encrypted Key',
    apiKeysClearBtn: 'Remove Key',
    apiKeysConfiguredBadge: 'Configured',
    apiKeysNotSetBadge: 'Not Configured',
    apiKeysSafeStorageNote: 'Stored strictly in Electron Main Process safeStorage (OS Keychain). Never exposed to renderer JavaScript.',
  },
  settingsHub: {
    searchPlaceholder: 'Search settings, themes, or tools (e.g. qBittorrent, FPS, API, cache)...',
    searchResultsCount: 'matching sections',
    searchEmptyTitle: 'No matching settings or tools',
    searchEmptyDesc: 'Try searching for language, theme, cursor, performance, qBittorrent, PresentMon, cleaner, or API keys.',
    clearSearchBtn: 'Clear search',
    catAll: 'All Settings',
    catTools: 'Tools & Integrations',
    catLanguage: 'Language & Region',
    catStartup: 'Startup & System',
    catAppearance: 'Appearance & Themes',
    catAudio: 'Audio & Soundscape',
    catPerformance: 'Performance & Power',
    catStorage: 'Storage, Cache & Backup',
    catUpdates: 'Updates & History',
    summaryThemeLabel: 'Active Theme',
    summaryPerfLabel: 'Performance Profile',
    summaryToolsLabel: 'Tools & Engines',
    summarySystemLabel: 'Hardware & Storage',
    toolsReadySuffix: 'ready',
    themeStudioTitle: 'Quick Theme Studio',
    themeStudioDesc: 'Switch effortlessly between desktop dark/light modes, console atmospheres, or your custom palette.',
    themeDefaultDark: 'Default Dark',
    themeCrispLight: 'Crisp Light',
    themePs5: 'PlayStation 5',
    themeXbox: 'Xbox Nexus',
    themeCustom: 'Custom Studio',
    traySmartTip: 'Tip: You enabled Start with Computer. Switch close behavior to Minimize to System Tray so SecretArea stays ready in the background.',
    traySmartBtn: 'Use Tray Minimize',
    audioStatusConsoleActive: 'Console ambient music and UI sound effects are active.',
    audioStatusStandby: 'UI click sounds are active. Ambient background music automatically activates when PS5 or Xbox theme is selected.',
    audioPreviewBtn: 'Test Sound',
    volumeMute: 'Mute',
    volumeLow: 'Low',
    volumeBalanced: 'Balanced',
    volumeMax: 'Max',
    effectiveParamsTitle: 'Live Effective Parameters',
    effectiveHwPoll: 'HW Poll',
    effectiveUiCoalesce: 'UI Sync',
    effectiveTorrentPoll: 'Torrent Idle',
    effectiveCacheCap: 'Image Cap',
    diskFreeLabel: 'Free disk space',
    cacheSectionTitle: 'Cache, Data & Portable Backup',
    cacheSectionDesc: 'Clear cached network responses or artwork, or export/import your launcher preferences as a portable JSON file.',
    clearDealsCacheBtn: 'Clear Deals Cache',
    dealsCacheCleared: 'Deals & intelligence memory cache cleared.',
    clearImageCacheBtn: 'Clear Artwork Cache',
    imageCacheCleared: 'Cached cover artwork cleared.',
    exportSettingsBtn: 'Export Settings',
    importSettingsBtn: 'Import Settings',
    importSettingsSuccess: 'Settings imported and applied.',
    importSettingsError: 'Invalid settings JSON file.',
    hubTitle: 'Extra Tools & Integrations Hub',
    hubSubtitle: 'Every built-in utility, hardware engine, downloader integration, and API provider collected in one place—see what each tool does and configure it directly.',
    hubFilterAll: 'All Tools',
    hubFilterHardware: 'Hardware & Diagnostics',
    hubFilterDownloads: 'Downloads & Network',
    hubFilterDeals: 'Deals & APIs',
    hubFilterUtilities: 'Utilities & Guides',
    hubConfigureBtn: 'Configure Tool',
    hubHideConfigBtn: 'Hide Configuration',
    hubPurposeLabel: 'What this tool is for',
    hubStatusReady: 'Ready',
    hubStatusAttention: 'Needs Attention',
    hubStatusStandby: 'Standby',
    hubStatusBuiltin: 'Built-in Tool',
    hubStatusWebPreview: 'Desktop App Required',
    toolQbitName: 'qBittorrent Web UI (API v2 / 5.0+)',
    toolQbitPurpose: 'Sends magnet and .torrent links directly from SecretArea to your local qBittorrent client, tracking live DL/UL speeds, ETA, and queue controls.',
    toolPresentMonName: 'Intel PresentMon (FPS & Frame Time)',
    toolPresentMonPurpose: 'Captures low-overhead DX11/DX12/Vulkan/OpenGL frame times, 1% & 0.1% low FPS, and GPU Busy telemetry during gaming sessions.',
    toolLhmName: 'LibreHardwareMonitorLib (Sensor Engine)',
    toolLhmPurpose: 'Open-source MPL-2.0 sensor engine reading real-time CPU/GPU temperatures, clocks, power draw, VRM voltages, NVMe SMART, and fan RPM.',
    toolCleanerName: 'Safe PC Cleaner & Cache Optimizer',
    toolCleanerPurpose: 'Safely scans and clears Windows temp folders, app caches, SecretArea cache, thumbnails, and DirectX shader caches to reclaim disk space.',
    toolDealsApiName: 'Game Deals & Critic API Providers',
    toolDealsApiPurpose: 'Powers Game Deals, Live Players, and Critic Scores via 6 zero-key public APIs plus optional encrypted keys for Steam Index, Metacritic, and OpenCritic.',
    toolCanRunItName: 'Can Run It & PC Hardware Profiler',
    toolCanRunItPurpose: 'Compares every game’s CPU, GPU, VRAM, RAM, and disk requirements against your detected (or customized) PC specifications.',
    toolBenchDbName: 'Hardware Benchmarks & Spec Database',
    toolBenchDbPurpose: 'Runs safe CPU/RAM/Storage/Latency micro-benchmarks and maintains the local GPU/CPU/Console reference database (hardware-db.json).',
    toolHypervisorName: 'Hypervisor & Virtualization Guide',
    toolHypervisorPurpose: 'Step-by-step BIOS VT-x / AMD-V, Hyper-V, and driver preparation reference for titles requiring virtualization support.',
    toolSpinWheelName: 'Spin Wheel (What Should I Play?)',
    toolSpinWheelPurpose: 'Randomized library picker that helps you break decision fatigue and launch straight into a surprise game from your catalog.',
    toolUpdaterName: 'App Updater, Changelog & Notifications',
    toolUpdaterPurpose: 'Checks GitHub Releases for new SecretArea versions, opens full release history, and manages catalog update alerts.',
    specsAutoDetected: 'Auto-Detected (Native)',
    specsCustomOverride: 'Custom Override',
    specsBrowserMode: 'Browser Estimated',
    specsRescanBtn: 'Re-scan Hardware',
    specsCustomizeBtn: 'Customize Specs',
    specsSaveBtn: 'Save Specs',
    specsResetAutoBtn: 'Reset to Auto',
    specsCpuLabel: 'Processor (CPU)',
    specsGpuLabel: 'Graphics (GPU)',
    specsVramLabel: 'VRAM (GB)',
    specsRamLabel: 'System RAM (GB)',
    specsDiskFreeLabel: 'Free Space (GB)',
    cleanerQuickScanBtn: 'Quick Scan Now',
    cleanerQuickCleanBtn: 'Clean Selected',
    cleanerWebNote: 'File-system cleanup requires the SecretArea.exe Desktop App.',
    dbEntriesLabel: 'Database Entries',
    dbVersionLabel: 'DB Version',
    dbCheckUpdateBtn: 'Check DB Update',
    openHardwareMonitorBtn: 'Open Hardware Monitor',
    openPcCleanerBtn: 'Open Full PC Cleaner',
    openBenchmarksBtn: 'Open Benchmarks & DB',
    openDealsBtn: 'Open Game Deals',
    openHypervisorBtn: 'Open Hypervisor Guide',
    openSpinWheelBtn: 'Launch Spin Wheel',
    openUpdaterBtn: 'Check App Updates',
  },
};

const FR: LauncherTranslations = {
  locale: 'fr-FR',
  nav: {
    home: 'Accueil',
    library: 'Bibliothèque',
    gameDeals: 'Bons plans',
    downloads: 'Téléchargements',
    extras: 'Extras',
    requests: 'Demandes',
    hardwareMonitor: 'Moniteur matériel',
    settings: 'Paramètres',
    switchLight: 'Passer en mode clair',
    switchDark: 'Passer en mode sombre',
    lightLabel: 'Clair',
    darkLabel: 'Sombre',
    selectLanguage: 'Choisir la langue',
    openMenu: 'Ouvrir le menu de navigation',
    closeMenu: 'Fermer le menu de navigation',
    languageLabel: 'Langue',
    themeLabel: 'Apparence',
    spin: 'Roue',
  },
  topbar: {
    webVersion: 'SecretArea version web',
    updatesTitle: 'À propos de SecretArea & Mises à jour',
    enterFullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    muteSounds: 'Lecture : PS5 Cosmic Horizon — Cliquer pour couper le son',
    enableSounds: 'Activer la musique et les sons PS5',
    muteXboxSounds: 'Lecture : Xbox Nexus — Cliquer pour couper le son',
    enableXboxSounds: 'Activer la musique et les sons Xbox',
    offlineMode: 'Mode hors ligne',
    onlineMode: 'Mode en ligne',
  },
  settings: {
    pageTitle: 'Paramètres',
    pageSubtitle: 'Personnalisez la langue, le démarrage, l’apparence de la fenêtre et l’ambiance sonore.',
    resetDefaults: 'Réinitialiser',
    resetToast: 'Paramètres réinitialisés par défaut',
    languageSectionTitle: 'Langue',
    languageSectionDesc: 'Choisissez la langue d’affichage et le sens du texte dans SecretArea.',
    rtlBadge: 'Droite → Gauche',
    ltrBadge: 'Gauche → Droite',
    startingSectionTitle: 'Démarrage et fermeture',
    startWithComputerTitle: 'Démarrer avec votre ordinateur',
    startWithComputerDesc: 'Ouvre SecretArea dans la zone de notification lors de votre connexion à cet ordinateur.',
    desktopSupportedBadge: 'Zone de notification Windows',
    webNotice: 'Le démarrage automatique dans la barre d’état s’active automatiquement dans SecretArea.exe.',
    trayActiveHint: 'Fermer la fenêtre réduit SecretArea dans la zone de notification tant que cette option est active.',
    canRunItTitle: 'Vérification matérielle « Can Run It »',
    canRunItDesc: 'Compare automatiquement les jeux et outils avec la configuration de votre PC sur l’accueil, la bibliothèque et les fiches.',
    windowSectionTitle: 'Fenêtre',
    compactNavbarTitle: 'Barre de navigation compacte',
    compactNavbarDesc: 'Afficher la barre de navigation sous forme d’icônes, même dans une large fenêtre.',
    customCursorTitle: 'Curseur animé personnalisé',
    customCursorDesc: 'Utiliser le curseur vectoriel personnalisé avec ondes de clic, anneau de survol et états animés.',
    lightModeTitle: 'Mode Clair / Sombre',
    lightModeDesc: 'Basculez entre le mode Clair lumineux et le mode Sombre. Activer un thème PS5 ou Xbox repasse en mode Sombre.',
    darkModeBadge: 'Mode Sombre',
    lightModeBadge: 'Mode Clair',
    alwaysPs5Title: 'Toujours lancer l’application avec le thème PS5',
    alwaysPs5Desc: 'Garder le thème saphir PlayStation 5 et la musique d’ambiance actifs dans tout le lanceur.',
    alwaysXboxTitle: 'Toujours lancer l’application avec le thème Xbox',
    alwaysXboxDesc: 'Appliquer le thème émeraude Xbox, l’orbe filaire et les effets sonores Xbox.',
    audioSectionTitle: 'Audio et ambiance sonore',
    audioSectionDesc: 'Activez ou coupez séparément la musique d’ambiance PS5/Xbox et les sons d’interface, et réglez le volume.',
    ambientMusicTitle: 'Musique d’ambiance (PS5 / Xbox)',
    ambientMusicDesc: 'Joue la musique spatiale PS5 ou l’ambiance émeraude Xbox Nexus lorsqu’un thème console est actif.',
    uiSoundsTitle: 'Sons de clic et survol de l’interface',
    uiSoundsDesc: 'Joue des clics de curseur précis, retours de survol et tonalités sur tous les thèmes.',
    volumeTitle: 'Volume principal',
    volumeDesc: 'Ajuste le niveau sonore des clics du curseur, de la musique d’ambiance et des effets sonores.',
    consoleThemeAudioHint: 'Les sons de clic fonctionnent sur tous les thèmes. Activez PS5 ou Xbox ci-dessus pour écouter la musique d’ambiance.',
    activeLabel: 'Activé',
    inactiveLabel: 'Désactivé',
    downloadSectionTitle: 'Téléchargements et stockage',
    downloadFolderTitle: 'Dossier de téléchargement par défaut',
    downloadFolderDesc: 'Choisissez où enregistrer les liens directs, fichiers MediaFire, archives Mega et captures du navigateur intégré.',
    chooseFolderBtn: 'Choisir un dossier',
    openFolderBtn: 'Ouvrir le dossier',
    torrentSectionTitle: 'Intégration qBittorrent (Web UI API v2)',
    torrentSectionDesc: 'Optionnel : connectez SecretArea à qBittorrent Web UI locale (API v2 / 5.0+) pour envoyer des magnets et fichiers .torrent et suivre vitesse DL/UL, ETA et pause/reprise.',
    torrentEnableTitle: 'Activer la synchronisation qBittorrent Web UI',
    torrentEnableDesc: 'Synchronise les téléchargements magnet et .torrent avec qBittorrent local via safeStorage. Les liens directs, MediaFire et Mega fonctionnent sans qBittorrent.',
    torrentAutoDetectBtn: 'Détection auto',
    torrentDetectingBtn: 'Analyse...',
    torrentTestBtn: 'Tester la connexion',
    torrentTestingBtn: 'Test...',
    torrentSaveBtn: 'Enregistrer',
    torrentSavingBtn: 'Enregistrement...',
    torrentStatusConnected: 'Connecté',
    torrentStatusDisconnected: 'Déconnecté',
    torrentStatusTesting: 'Test en cours...',
    torrentNotInstalledTitle: 'qBittorrent non détecté sur ce PC (Optionnel)',
    torrentNotInstalledDesc: 'Les téléchargements directs, MediaFire, Mega et le navigateur intégré fonctionnent sans qBittorrent. Installez-le uniquement pour le suivi magnet/.torrent.',
    torrentDownloadBtn: 'Télécharger qBittorrent',
    torrentHostLabel: 'Hôte (Boucle locale)',
    torrentPortLabel: 'Port',
    torrentUsernameLabel: 'Nom d’utilisateur',
    torrentPasswordLabel: 'Mot de passe',
    torrentPasswordSavedPlaceholder: 'Chiffré via safeStorage (laisser vide pour conserver)',
    torrentApiKeyLabel: 'Clé API (Optionnel · qBittorrent 5.2+)',
    torrentApiKeyPlaceholder: 'qbt_... (optionnel)',
    torrentApiKeySavedPlaceholder: 'Clé API enregistrée (laisser vide pour conserver)',
    torrentLoopbackNotice: 'Sécurité locale : l’accès Web UI est limité aux adresses locales (127.0.0.1 / localhost / ::1) et jamais exposé sur le réseau externe.',
    torrentLoopbackError: 'L’hôte doit être une adresse locale (127.0.0.1, localhost ou ::1).',
    torrentGuideTitle: 'Comment activer qBittorrent Web UI (Configuration manuelle)',
    torrentGuideStep1: '1. Ouvrez qBittorrent sur Windows puis allez dans Outils → Options → Interface Web (Web UI).',
    torrentGuideStep2: '2. Cochez « Interface utilisateur Web (Contrôle à distance) », laissez l’IP sur 127.0.0.1 et le port sur 8080.',
    torrentGuideStep3: '3. Dans Authentification, définissez un nom d’utilisateur et un mot de passe (ou une clé API qbt_ sur v5.2.0+).',
    torrentGuideStep4: '4. Cliquez sur Appliquer et OK dans qBittorrent, puis saisissez vos identifiants ci-dessus et enregistrez.',
    torrentGuideStep5: '5. Cliquez sur « Détection auto » et « Tester la connexion » pour vérifier l’API Web UI v2.',
    torrentWebNotice: 'Mode Aperçu Web : les navigateurs ne peuvent pas contacter qBittorrent Web UI (127.0.0.1) ni utiliser safeStorage. Utilisez SecretArea.exe pour tester et synchroniser.',
    torrentTestingWebPreviewMsg: 'Déconnecté — L’aperçu Web ne peut pas contacter qBittorrent local.',
    torrentTestingWebPreviewHint: 'Le navigateur bloque l’accès local Web UI et safeStorage. Lancez l’application SecretArea.exe pour tester et synchroniser qBittorrent.',
    modeDesktopBadge: 'App Bureau',
    modeWebPreviewBadge: 'Aperçu Web',
    torrentSavedToast: 'Paramètres qBittorrent enregistrés',
    torrentManageSetupBtn: 'Installer / Mettre à jour qBittorrent',
    replaySetupBtn: 'Assistant de bienvenue',
    closeBehaviorTitle: 'Comportement à la fermeture',
    closeBehaviorDesc: 'Choisissez si le bouton de fermeture réduit SecretArea dans la zone de notification ou ferme complètement l’application.',
    closeBehaviorMinimizeTray: 'Réduire dans la zone de notification',
    closeBehaviorExit: 'Quitter complètement l’application',
    exitAppTitle: 'Fermeture complète',
    exitAppDesc: 'Arrête immédiatement les moniteurs matériels/gaming, retire l’icône de la barre d’état et ferme SecretArea.',
    exitAppBtn: 'Quitter complètement',
    exitAppConfirmBtn: 'Confirmer la fermeture',
    exitAppCancelBtn: 'Annuler',
    exitAppWebHint: 'La fermeture complète s’applique uniquement dans SecretArea.exe.',
  },
  performance: {
    sectionTitle: 'Performances et consommation système',
    sectionSubtitle: 'Ajustez en direct la charge CPU, RAM, GPU et les tâches en arrière-plan sans redémarrage.',
    liveApplyBadge: 'Application directe',
    modeEcoTitle: 'Mode Éco',
    modeEcoDesc: 'Consommation minimale CPU, RAM et GPU. Réduit les effets continus, ralentit les sondes et met en pause l’arrière-plan une fois réduit.',
    modeBalancedTitle: 'Mode Équilibré',
    modeBalancedDesc: 'Profil par défaut. Conserve une interface fluide tout en freinant fortement les tâches inactives.',
    modePerformanceTitle: 'Mode Performance',
    modePerformanceDesc: 'Priorise la réactivité maximale, le rafraîchissement rapide des capteurs/téléchargements et les effets visuels complets.',
    recommendedBadge: 'Par défaut',
    activeBadge: 'Actif',
    advancedTitle: 'Contrôles avancés des ressources',
    advancedDesc: 'Personnalisez finement les intervalles, effets visuels et tâches d’arrière-plan.',
    pauseOnMinimizeTitle: 'Mettre en pause la télémétrie lorsque la fenêtre est réduite ou masquée',
    pauseOnMinimizeDesc: 'Suspend immédiatement les capteurs, animations ambiantes et pings réseau en arrière-plan.',
    reduceEffectsTitle: 'Réduire le flou et les animations ambiantes continues',
    reduceEffectsDesc: 'Désactive les lueurs GPU continues et le flou vitré lourd pour alléger le compositeur graphique.',
    hwIntervalTitle: 'Fréquence du Moniteur Matériel',
    hwIntervalDesc: 'Détermine la cadence d’échantillonnage des capteurs lorsque l’onglet est ouvert.',
    hwIntervalAuto: 'Auto (Selon profil)',
    dlThrottleTitle: 'Regroupement des mises à jour de téléchargement',
    dlThrottleDesc: 'Contrôle la fréquence de mise à jour UI et de sauvegarde disque lors des transferts actifs.',
    dlThrottleAuto: 'Auto (Selon profil)',
    adaptiveTorrentTitle: 'Interrogation adaptative de qBittorrent',
    adaptiveTorrentDesc: 'Ralentit automatiquement les requêtes Web UI lorsqu’aucun torrent n’est actif.',
    deferSyncTitle: 'Espacer les vérifications en arrière-plan',
    deferSyncDesc: 'Allonge les intervalles de synchronisation du catalogue, pré-cache d’images et recherche de mises à jour.',
    auditTitle: 'Empreinte système en direct',
    auditDesc: 'Mesure instantanée à la demande des processus Electron et de l’état des tâches actives.',
    auditRefreshBtn: 'Mesurer maintenant',
    auditMainCpuLabel: 'CPU processus principal',
    auditMainHeapLabel: 'Mémoire JS (Heap)',
    auditMainRssLabel: 'Mémoire totale (RSS)',
    auditTotalProcessesLabel: 'Processus Desktop',
    auditHwMonitorLabel: 'Sonde matérielle',
    auditDownloadsLabel: 'Transferts actifs',
    auditTorrentPollerLabel: 'Sonde qBittorrent',
    auditStateActive: 'Actif',
    auditStatePausedHidden: 'En pause (Masqué)',
    auditStateIdle: 'Inactif / Arrêté',
    auditStateOff: 'Désactivé',
    auditWebNote: 'Exécution en aperçu navigateur. Les métriques détaillées Electron sont disponibles dans SecretArea.exe.',
    auditGpuProcessNote: 'L’accélération matérielle reste activée intelligemment tout en réduisant le travail GPU superflu.',
  },
  customTheme: {
    sectionTitle: 'Créateur de thème personnalisé',
    sectionSubtitle: 'Personnalisez votre palette par défaut, la couleur d’accentuation, les boutons et le style des cartes.',
    enableLabel: 'Activer le thème personnalisé',
    surfaceLabel: 'Surface de base',
    surfaceMidnight: 'Ardoise Nuit',
    surfaceObsidian: 'Obsidienne Pure',
    surfaceAbyss: 'Abysse Profond',
    surfaceDaylight: 'Clair Lumineux',
    accentColorLabel: 'Couleur d’accentuation',
    customHexLabel: 'Hex personnalisé',
    buttonStyleLabel: 'Forme des boutons',
    btnRounded: 'Arrondi',
    btnPill: 'Pilule',
    btnSharp: 'Net',
    cardRadiusLabel: 'Coins des cartes',
    cardSharp: 'Anguleux',
    cardMedium: 'Équilibré',
    cardSoft: 'Doux',
    glassBlurLabel: 'Flou vitré',
    glassBlurDesc: 'Effet de flou translucide sur les panneaux',
    previewLabel: 'Aperçu en direct',
    previewTitle: 'Style personnalisé SecretArea',
    previewPrimaryBtn: 'Action principale',
    previewSecondaryBtn: 'Secondaire',
    resetBtn: 'Réinitialiser le thème',
    consoleOverrideNote: 'Note : activer le thème personnalisé désactive les thèmes console PS5 / Xbox.',
    summaryCustomPrefix: 'Personnalisé',
  },
  downloads: {
    pageTitle: 'Gestionnaire de téléchargements',
    pageSubtitle: 'Suivez les liens directs, MediaFire, Mega, captures navigateur et transferts qBittorrent.',
    quickAddPlaceholder: 'Collez un lien direct, MediaFire, Mega ou Magnet...',
    quickAddBtn: 'Ajouter',
    addTorrentFileBtn: 'Ajouter .torrent',
    quickAddInvalid: 'Entrez un lien http://, https:// ou magnet:? valide.',
    folderLabel: 'Enregistrer dans',
    chooseFolder: 'Choisir le dossier',
    openFolder: 'Ouvrir le dossier',
    clearFinished: 'Effacer terminés',
    tabAll: 'Tous',
    tabActive: 'Actifs',
    tabPaused: 'En pause',
    tabCompleted: 'Terminés',
    tabFailed: 'Échoués',
    searchPlaceholder: 'Filtrer les téléchargements...',
    metricActive: 'Actifs',
    metricSpeed: 'Vitesse totale',
    metricCompleted: 'Terminés',
    metricFreeDisk: 'Espace libre',
    statusQueued: 'En file d’attente',
    statusResolving: 'Résolution du lien...',
    statusDownloading: 'Téléchargement',
    statusPaused: 'En pause',
    statusCompleted: 'Terminé',
    statusFailed: 'Échec',
    statusCancelled: 'Annulé',
    sourceDirect: 'Lien direct',
    sourceMediafire: 'MediaFire',
    sourceMega: 'Mega',
    sourceQbittorrent: 'qBittorrent',
    sourceBrowser: 'Navigateur intégré',
    actionPause: 'Pause',
    actionResume: 'Reprendre',
    actionCancel: 'Annuler',
    actionDelete: 'Supprimer',
    actionRetry: 'Réessayer',
    actionOpenFile: 'Ouvrir le fichier',
    actionOpenFolder: 'Ouvrir le dossier',
    actionRemove: 'Retirer',
    actionOpenExternal: 'Ouvrir en externe',
    peersLabel: 'Pairs',
    seedsLabel: 'Sources',
    unknownSize: 'Taille inconnue',
    etaCalculating: 'Calcul...',
    torrentConnected: 'qBittorrent connecté',
    torrentDisconnected: 'qBittorrent déconnecté',
    torrentWebPreviewStatus: 'Aperçu Web — La synchronisation qBittorrent nécessite SecretArea.exe',
    configureTorrentBtn: 'Configurer qBittorrent',
    speedGraphTitle: 'Courbe de vitesse',
    periodLabel: 'Période :',
    period1m: '1 minute',
    period5m: '5 minutes',
    period30m: '30 minutes',
    period1h: '1 heure',
    totalUploadLabel: 'Envoi total',
    totalDownloadLabel: 'Réception totale',
    sizeLabel: 'Taille',
    progressLabel: 'Progression',
    statusLabel: 'Statut',
    downSpeedLabel: 'Vitesse DL',
    upSpeedLabel: 'Vitesse UL',
    etaLabel: 'ETA',
    ratioLabel: 'Ratio',
    showGraphBtn: 'Afficher le graphique',
    hideGraphBtn: 'Masquer le graphique',
    emptyTitle: 'Aucun téléchargement dans cette vue',
    emptySubtitle: 'Collez un lien direct, MediaFire, Mega ou magnet ci-dessus, importez un fichier .torrent, ou cliquez sur une source dans la fiche d’un jeu.',
    webNoticeTitle: 'Mode Aperçu Web',
    webNoticeBody: 'La gestion pause/reprise, vitesse/ETA, capture navigateur et synchronisation qBittorrent Web UI fonctionnent dans SecretArea.exe.',
    startedToast: 'Téléchargement ajouté à la file',
    failedToast: 'Impossible de démarrer le téléchargement',
    detailActiveTitle: 'Téléchargements de cette sortie',
    detailManageBtn: 'Ouvrir le gestionnaire',
    detailOpenExternal: 'Ouvrir dans le navigateur externe',
    detailStartInApp: 'Télécharger dans SecretArea',
  },
  store: {
    featuredSpotlight: 'À la une',
    latestRelease: 'Dernière sortie',
    download: 'Télécharger',
    watchTrailer: 'Voir la bande-annonce',
    viewDetails: 'Détails',
    exploreCatalog: 'Explorer le catalogue',
    repackVsOriginal: 'Taille Repack vs Original',
    upcomingGames: 'Jeux à venir',
    recentGames: 'Jeux récents',
    canRunTitle: 'Peut-il tourner ? — Recommandé pour votre PC',
    canRunSubtitle: 'Compare automatiquement Jeux, Hypervisor, SteamTools, PS5 et Outils avec la configuration requise',
    scopeAll: 'Tout',
    scopeGames: 'Jeux',
    scopeHypervisor: 'Hypervisor',
    scopeSteamTools: 'SteamTools',
    scopePs5: 'PS5',
    scopeTools: 'Outils',
    canRunBtn: 'Compatible',
    cannotRunBtn: 'Incompatible',
    scanPc: 'Analyser le PC',
    gpuLabel: 'GPU',
    cpuLabel: 'CPU',
    ramLabel: 'RAM',
    freeDriveLabel: 'Libre',
    canRunEmptyFail: 'Bonne nouvelle — votre PC répond aux exigences de tous les titres de cette catégorie !',
    canRunEmptyPass: 'Aucun élément correspondant pour le filtre sélectionné.',
    canRunCardPass: 'Compatible',
    mostPopularGames: 'Jeux les plus populaires',
    showAll: 'Tout afficher',
    hideHv: 'Masquer HV',
    hideGames: 'Masquer Jeux',
    newestFirst: 'Plus récents',
    nameAz: 'A – Z',
    pageOf: 'Page',
    previous: 'Précédent',
    next: 'Suivant',
    seeMoreNext: 'Voir plus ·',
    gameSingular: 'Jeu',
    gamePlural: 'Jeux',
    backToPage1: 'Retour page 1',
    topStudios: 'Meilleurs studios',
    viewAllStudios: 'Voir tous les studios',
    bestTwoPlayers: 'Meilleurs jeux à deux joueurs',
    noCatalogLoaded: 'Aucun élément de catalogue chargé.',
  },
  library: {
    sectionLabel: 'Section',
    genresIn: 'Genres dans',
    allGenres: 'Tous les genres',
    reset: 'Réinitialiser',
    allCountLabel: 'TOUT',
    hide: 'Masquer',
    show: 'Afficher',
    noMatchingTitles: 'Aucun titre correspondant.',
    sortBy: 'Trier par',
    sortSmart: 'Tri intelligent (Top & Récents)',
    sortLatest: 'Plus récents',
    sortAz: 'Nom : A → Z',
    sortZa: 'Nom : Z → A',
    sortFavorites: 'Favoris d’abord',
    sortSizeAsc: 'Taille : croissante',
    sortSizeDesc: 'Taille : décroissante',
    sortMirrors: 'Plus de liens de téléchargement',
    canRunAll: 'Compatibilité PC : Tout',
    canRunPass: '✓ Compatible avec ce PC',
    canRunFail: '✕ Incompatible (PC faible)',
    clear: 'Effacer',
    searchPlaceholder: 'Recherche intelligente',
    emptyTitle: 'Aucun élément ne correspond à vos filtres',
    emptySubtitle: 'Essayez d’effacer la recherche, le filtre de genre ou de changer de section.',
    previous: 'Précédent',
    next: 'Suivant',
    next50: '50 suivants',
    backToPage1: 'Retour page 1',
    pageOf: 'Page',
    newToLibrary: 'NOUVEAU',
    pinned: 'Épinglé',
    free: 'Gratuit',
    canRunCard: '✓ Compatible PC',
  },
  extras: {
    upcomingList: 'Liste à venir',
    trailers: 'Bandes-annonces',
    bestSeries: 'Meilleures séries',
    topOpenWorld: 'Top jeux Open World',
    videosLabel: 'Vidéos',
    titleSingular: 'Titre',
    titlePlural: 'Titres',
    platforms: 'Plateformes',
    watchTrailer: 'Voir la bande-annonce',
    noTrailer: 'Aucune URL de bande-annonce disponible.',
    back: 'Retour',
    seriesPosters: 'Affiches de la série',
    gamesInSeries: 'Jeux de la série',
    bestBadge: 'Meilleur',
  },
  requests: {
    pageTitle: 'Demandes de jeux et d’outils',
    formTitle: 'Soumettre une demande',
    formSubtitle: 'Demandez des repacks manquants, des mises à jour, des DLC ou signalez un lien mort.',
    titleLabel: 'Titre',
    titlePlaceholder: 'ex. Ghost of Yotei ou Forza Horizon 6',
    categoryLabel: 'Catégorie',
    coverUrlLabel: 'URL de jaquette (Optionnel)',
    detailsLabel: 'Détails / Notes',
    detailsPlaceholder: 'Précisez le repacker, la version ou les DLC souhaités...',
    sending: 'Envoi...',
    submitRequest: 'Envoyer la demande',
    recentRequests: 'Demandes récentes',
    noRequestsYet: 'Aucune demande envoyée pour le moment.',
    syncedNotice: 'Demande envoyée et enregistrée dans la file du catalogue !',
    localNotice: 'Demande ajoutée à votre file locale.',
    communitySupportTitle: 'Communauté & Nous soutenir',
    joinCommunityTitle: 'Rejoindre la communauté',
    joinCommunityDesc: 'Recevez les alertes de sorties, les réponses aux demandes et le support sur Telegram et Discord.',
    telegramLabel: 'Communauté Telegram',
    telegramSub: 'Mises à jour, sorties et chat rapide',
    discordLabel: 'Communauté Discord',
    discordSub: 'Support en direct et communauté',
    joinBtn: 'Rejoindre',
    supportBadge: 'Soutenir SecretArea',
    supportHeadline: 'Soutenez notre mission et aidez-nous à grandir',
    supportDesc: 'Chaque contribution maintient le lanceur SecretArea, les mises à jour et les demandes 100 % gratuits pour tous.',
    anonMonero: 'Anonyme · Crypto & Monero (XMR)',
    openInBrowser: 'Ouvrir dans le navigateur',
  },
  studios: {
    backToHome: 'Retour à l’accueil',
    topStudios: 'Meilleurs studios',
    searchPlaceholder: 'Rechercher un studio...',
    noMatch: 'Aucun studio trouvé.',
    gameSingular: 'Jeu',
    gamePlural: 'Jeux',
    aboutStudio: 'À propos de ce studio',
    noOverview: 'Aucune description disponible.',
    all: 'Tout',
    back: 'Retour',
    totalTitleSingular: 'Titre au total',
    totalTitlePlural: 'Titres au total',
    noItemsInCategory: 'Aucun titre dans cette catégorie.',
    previous: 'Précédent',
    next: 'Suivant',
    next20Games: '20 jeux suivants',
    pageOf: 'Page',
  },
  detail: {
    back: 'Retour',
    home: 'Accueil',
    releaseDetails: 'Détails de la sortie',
    gameId: 'ID du jeu',
    version: 'Version',
    originalSize: 'Taille originale',
    downloadSize: 'Taille du téléchargement',
    repackSize: 'Taille du Repack',
    downloadChannels: 'Liens de téléchargement',
    channelSingular: 'Source',
    channelPlural: 'Sources',
    license: 'Licence',
    pinned: 'Épinglé',
    standard: 'Standard',
    free: 'Gratuit',
    dateAdded: 'Date d’ajout',
    developerStudio: 'Studio de développement',
    repacker: 'Repacker',
    languages: 'Langues',
    genres: 'Genres',
    watchTrailer: 'Bande-annonce',
    trailerGallery: 'Bande-annonce & Galerie',
    switchToTrailer: 'Passer à la bande-annonce',
    openTrailer: 'Ouvrir la bande-annonce',
    description: 'Description',
    noDescription: 'Aucune description disponible.',
    requirementsAndCanRun: 'Configuration requise & Compatibilité',
    requirementsOnly: 'Configuration requise',
    tools: 'Outils',
    steps: 'Étapes d’installation',
    completed: 'terminées',
    linkedEntries: 'Entrées liées',
    hvWarningTitle: 'Qu’est-ce qu’un contournement Hypervisor ?',
    hvWarningBody: 'Veuillez lire cet article avant de télécharger et d’installer :',
    noChannels: 'Aucun lien de téléchargement disponible.',
    recommendedTag: 'Recommandé',
    recommendedForYou: 'Recommandé pour vous',
    canRunItTitle: 'Peut-il tourner ?',
    thisPcAuto: 'Ce PC (Auto)',
    customPc: 'PC personnalisé',
    detectedPc: 'PC détecté',
    thisPcVsMinimum: 'Ce PC vs minimum',
    scan: 'Scanner',
    myPc: 'Mon PC',
    close: 'Fermer',
    yourPcCanRun: 'Votre PC · Compatibilité',
    runsWell: 'Tourne bien',
    cantRun: 'Incompatible',
    checkSpecs: 'Vérifier specs',
    weakPrefix: 'Faible',
    estimated: 'estimé',
    needsPrefix: 'requis',
    pcSpecsHeading: 'Spécifications de votre PC',
    resetAuto: 'Réinitialiser (Auto)',
    gpuInput: 'Carte graphique (GPU)',
    cpuInput: 'Processeur (CPU)',
    ramInput: 'Mémoire RAM (Go)',
    spaceInput: 'Espace disque libre (Go, optionnel)',
    cancel: 'Annuler',
    compareSpecs: 'Comparer',
    osLabel: 'Système (OS)',
    ramLabel: 'Mémoire / RAM',
    cpuLabel: 'Processeur / CPU',
    gpuLabel: 'Carte graphique / GPU',
    noReqsListed: 'Aucune configuration matérielle spécifiée.',
    positive: 'Positif',
    negative: 'Négatif',
  },
  qbitSetup: {
    modalTitle: 'Installation automatique de qBittorrent',
    modalSubtitle: 'Détection Windows, mise à jour officielle vérifiée et configuration locale de la Web UI.',
    stepChecking: 'Vérification des dépendances...',
    stepDetecting: 'Détection de qBittorrent...',
    stepDownloading: 'Téléchargement de qBittorrent...',
    stepVerifying: 'Vérification de l’installateur...',
    stepInstalling: 'Installation de qBittorrent...',
    stepConfiguring: 'Configuration de l’intégration...',
    stepCompleted: 'Installation terminée.',
    installedLabel: 'Installé',
    notInstalledValue: 'Non installé',
    latestLabel: 'Dernière version officielle',
    processLabel: 'Processus',
    processRunning: 'En cours d’exécution',
    processStopped: 'Arrêté',
    statusUpToDate: 'Votre version de qBittorrent est déjà à jour. Aucune réinstallation nécessaire.',
    statusNewerInstalled: 'Une version plus récente est déjà installée. SecretArea ne la rétrogradera pas.',
    statusUpdateAvailable: 'Une mise à jour officielle stable de qBittorrent est disponible.',
    statusNotInstalled: 'qBittorrent n’a pas été détecté sur ce PC. SecretArea peut télécharger l’installateur x64 officiel, vérifier son hachage et sa signature, et l’installer.',
    statusRunningBlocked: 'qBittorrent est en cours d’exécution. Fermez-le proprement pour ne pas interrompre vos torrents, puis cliquez sur Revérifier.',
    statusLookupFailed: 'Impossible de récupérer la dernière version officielle pour le moment.',
    consentNote: 'En cliquant sur Installer/Mettre à jour, SecretArea télécharge l’installateur officiel 64 bits depuis GitHub/qbittorrent.org et vérifie le SHA-256 avant exécution.',
    installBtn: 'Télécharger et installer qBittorrent',
    updateBtn: 'Mettre à jour qBittorrent',
    recheckBtn: 'Revérifier',
    retryBtn: 'Réessayer',
    skipBtn: 'Plus tard',
    closeBtn: 'Terminer',
    officialDownloadBtn: 'Page officielle',
    launchQbitBtn: 'Ouvrir qBittorrent',
    shaVerifiedLabel: 'Somme SHA-256 vérifiée',
    sigVerifiedLabel: 'Signature éditeur vérifiée',
    unsignedVerifiedNote: 'Installateur open-source (non signé) · SHA-256 officiel vérifié',
    webUiSectionTitle: 'Configuration Web UI qBittorrent (127.0.0.1 uniquement)',
    webUiDetectedEnabled: 'La Web UI est activée dans la configuration qBittorrent.',
    webUiNotEnabledHint: 'La Web UI n’est pas encore activée. Suivez ces étapes dans qBittorrent, puis vérifiez la connexion :',
    webUiLoopbackWarning: 'L’adresse IP Web UI n’est pas limitée à 127.0.0.1. Réglez l’IP sur 127.0.0.1 dans qBittorrent.',
    webUiGuide1: '1. Ouvrez qBittorrent → Outils → Options → Web UI.',
    webUiGuide2: '2. Cochez « Interface Web (Contrôle à distance) ».',
    webUiGuide3: '3. Réglez l’adresse IP sur 127.0.0.1 et le port sur 8080.',
    webUiGuide4: '4. Définissez un identifiant et un mot de passe, puis cliquez sur Appliquer / OK.',
    webUiGuide5: '5. Saisissez ces mêmes identifiants ci-dessous et cliquez sur Enregistrer et vérifier.',
    generatePasswordBtn: 'Générer un mot de passe fort',
    saveAndVerifyBtn: 'Enregistrer et vérifier',
    verifyingBtn: 'Vérification...',
    webUiConnectedMsg: 'Connecté et vérifié ! SecretArea est prêt pour vos liens magnet et .torrent.',
    openSettingsBtn: 'Ouvrir les paramètres',
    webPreviewNotice: 'L’installation automatique s’exécute dans SecretArea.exe sur Windows. Utilisez le lien officiel ci-dessous en aperçu Web.',
  },
  presentMonSetup: {
    sectionTitle: 'Intel PresentMon (Moteur FPS et Frame Time)',
    sectionSubtitle: 'Détection automatique, mises à jour officielles via GitHub Releases et vérification cryptographique.',
    modalTitleInstall: 'Activer la surveillance des performances en jeu',
    modalTitleUpdate: 'Mettre à jour Intel PresentMon',
    modalTitleRepair: 'Réparer l’installation PresentMon',
    modalTitleManage: 'Gestionnaire Intel PresentMon',
    modalSubtitle: 'Moteur officiel de télémétrie ETW géré automatiquement par SecretArea Desktop.',
    benefitsHeading: 'Fonctionnalités débloquées avec PresentMon',
    benefit1: 'Mesure précise des FPS, 1% Low et 0.1% Low sans aucune injection en jeu',
    benefit2: 'Analyse du temps d’image (frame time), saccades et latence d’affichage',
    benefit3: 'Corrélation matérielle CPU/GPU et diagnostic des goulots d’étranglement',
    stepChecking: 'Vérification locale et recherche de la dernière version GitHub...',
    stepDownloading: 'Téléchargement du binaire officiel PresentMon x64...',
    stepVerifying: 'Vérification SHA-256 et signature numérique Intel...',
    stepInstalling: 'Installation et test de compatibilité CLI...',
    stepCompleted: 'PresentMon est installé, vérifié et prêt pour le suivi FPS.',
    stepCancelled: 'Téléchargement annulé proprement.',
    statusReady: 'Installé et prêt',
    statusNotInstalled: 'Non installé',
    statusUpdateAvailable: 'Mise à jour disponible',
    statusRepairRequired: 'Réparation requise',
    statusNewerInstalled: 'À jour (version locale plus récente)',
    statusDeclined: 'Ignoré par l’utilisateur',
    statusChecking: 'Vérification...',
    statusWebPreview: 'Windows Desktop uniquement',
    installedVersionLabel: 'Version installée',
    latestVersionLabel: 'Dernière officielle',
    downloadSizeLabel: 'Taille du téléchargement',
    installPathLabel: 'Emplacement',
    sourceLabel: 'Source officielle',
    notInstalledValue: 'Non installé',
    allowInstallBtn: 'Autoriser et installer',
    notNowBtn: 'Pas maintenant',
    updateNowBtn: 'Mettre à jour',
    laterBtn: 'Plus tard',
    repairBtn: 'Réparer l’installation',
    reinstallBtn: 'Réinstaller PresentMon',
    checkUpdatesBtn: 'Vérifier les mises à jour',
    checkingBtn: 'Vérification...',
    cancelDownloadBtn: 'Annuler',
    retryBtn: 'Réessayer',
    doneBtn: 'Terminer',
    officialReleasesBtn: 'GitHub Releases',
    enablePresentMonBtn: 'Installer / Activer PresentMon',
    managePresentMonBtn: 'Gérer PresentMon',
    shaVerifiedLabel: 'Empreinte SHA-256 vérifiée',
    sigVerifiedLabel: 'Signature Intel Corporation vérifiée',
    consentNote: 'SecretArea ne télécharge ni n’installe jamais PresentMon sans votre accord. Les fichiers proviennent exclusivement de GitHub Releases en HTTPS avec vérification SHA-256 et signature Intel.',
    runningConflictMsg: 'Un processus PresentMon est actif. Fermez-le puis réessayez.',
    corruptedIssuePrefix: 'Problème détecté',
    declinedBannerTitle: 'Suivi FPS PresentMon désactivé',
    declinedBannerDesc: 'SecretArea reste 100% fonctionnel (CPU, GPU, RAM, stockage, ping). Vous pouvez installer PresentMon à tout moment.',
    lookupErrorMsg: 'Impossible de consulter GitHub Releases pour PresentMon actuellement.',
  },
  onboarding: {
    stepWelcome: 'Bienvenue',
    stepAppearance: 'Thème et langue',
    stepQbitCheck: 'Vérification qBittorrent',
    stepQbitIntegration: 'Intégration',
    stepReady: 'Prêt',
    firstTimeNotice: 'Configuration unique au premier lancement',
    welcomeEyebrow: 'SecretArea Desktop',
    welcomeTitle: 'Bienvenue dans SecretArea',
    welcomeSubtitle: 'Personnalisez votre thème, votre langue et vos outils de téléchargement en moins d’une minute avant d’ouvrir le lanceur.',
    welcomeFeature1Title: '01. Thème & Langue',
    welcomeFeature1Desc: 'Choisissez Sombre, Clair, PS5, Xbox Nexus ou créez votre Thème personnalisé en 4 langues.',
    welcomeFeature2Title: '02. Scan qBittorrent',
    welcomeFeature2Desc: 'Détecte votre installation existante ou installe proprement la version officielle 64 bits vérifiée.',
    welcomeFeature3Title: '03. Sync & PresentMon',
    welcomeFeature3Desc: 'Liez la Web UI locale en toute sécurité, suivez les alertes en direct et activez Intel PresentMon pour vos FPS.',
    getStartedBtn: 'Commencer',
    skipAllBtn: 'Accéder à l’application',
    appearanceTitle: 'Personnaliser le thème et la langue',
    appearanceSubtitle: 'Chaque choix s’applique en direct. Modifiable à tout moment dans les Paramètres.',
    themePickerLabel: 'Thème du lanceur',
    languagePickerLabel: 'Langue de l’interface',
    themeDarkName: 'Mode Sombre',
    themeDarkDesc: 'Interface ardoise sombre à fort contraste',
    themeLightName: 'Mode Clair',
    themeLightDesc: 'Espace clair et net de jour',
    themePs5Name: 'PlayStation 5',
    themePs5Desc: 'Aurore saphir et ambiance sonore console',
    themeXboxName: 'Xbox Nexus',
    themeXboxDesc: 'Maillage émeraude et ambiance Xbox',
    settingsEditableNote: 'Les sons, la barre de navigation et les thèmes restent réglables dans Paramètres.',
    backBtn: 'Retour',
    continueBtn: 'Continuer',
    qbitCheckTitle: 'Vérification de qBittorrent',
    qbitCheckSubtitle: 'SecretArea analyse votre PC afin de préserver toute installation existante.',
    scanningText: 'Recherche d’une installation qBittorrent existante...',
    alreadyInstalledTitle: 'qBittorrent est déjà installé sur ce PC',
    alreadyInstalledDesc: 'Parfait ! Comme qBittorrent était déjà installé, passez à l’étape suivante pour ajouter vos paramètres d’intégration qBittorrent.',
    goIntegrationBtn: 'Configurer l’intégration qBittorrent',
    updateFirstBtn: 'Mettre à jour qBittorrent d’abord',
    notInstalledTitle: 'qBittorrent n’est pas encore installé',
    notInstalledDesc: 'Installez automatiquement la version officielle 64 bits vérifiée, puis passez aux paramètres d’intégration.',
    installAndNextBtn: 'Installer qBittorrent et continuer',
    installCompleteAdvanceMsg: 'qBittorrent installé et vérifié ! Passage à l’intégration...',
    skipTorrentBtn: 'Ignorer (Téléchargements directs uniquement)',
    integrationTitle: 'Paramètres d’intégration qBittorrent',
    integrationSubtitle: 'Ajoutez vos identifiants Web UI locaux pour suivre vitesse, seeds, peers, ETA et progression.',
    hostLoopbackHint: 'Restreint à 127.0.0.1 (boucle locale) et chiffré avec Electron safeStorage.',
    finishSetupBtn: 'Terminer l’installation',
    skipIntegrationBtn: 'Configurer plus tard dans Paramètres',
    finalizingPhase1: 'Application du thème et langue...',
    finalizingPhase2: 'Préparation des téléchargements...',
    finalizingPhase3: 'Vérifications terminées !',
    congratsEyebrow: 'Configuration terminée',
    congratsTitle: 'Félicitations ! SecretArea Desktop est prêt.',
    congratsSubtitle: 'Configuré pour des téléchargements rapides et le suivi FPS.',
    summaryThemeLabel: 'Thème actif',
    summaryLanguageLabel: 'Langue',
    summaryTorrentLabel: 'qBittorrent',
    summaryTorrentConnected: 'Connecté et vérifié',
    summaryTorrentInstalled: 'Installé (à lier dans Paramètres)',
    summaryTorrentSkipped: 'Ignoré (Optionnel)',
    changeLaterHint: 'Thème, langue, dossier et qBittorrent restent modifiables à tout moment dans Paramètres.',
    enterAppBtn: 'Entrer dans SecretArea',
    openSettingsPageBtn: 'Ouvrir les Paramètres',
    whatIsSecretAreaTitle: 'Qu’est-ce que SecretArea ?',
    whatIsSecretAreaBody: 'Notre objectif est simple : rassembler les meilleurs jeux au même endroit pour passer moins de temps à chercher et plus de temps à jouer.',
    whatIsSecretAreaPoint1: 'Parcourez Jeux, Hypervisor, SteamTools, PS5, Outils et Sauvegardes avec vérification « Can Run It » et suivi FPS dans le Moniteur Matériel.',
    whatIsSecretAreaPoint2: 'Téléchargez avec pause et reprise via liens directs, MediaFire, Mega et navigateur intégré, ou synchronisez qBittorrent localement.',
    whatIsSecretAreaPoint3: 'Basculez entre Sombre, Clair, PS5, Xbox Nexus ou votre Thème personnalisé en 4 langues (avec arabe RTL), Notifications et Historique des versions.',
    whatIsSecretAreaPoint4: 'Intel PresentMon (Optionnel) : utilise la télémétrie officielle signée Intel PresentMon ETW pour mesurer les vrais FPS, 1% Low et frame-time sans injection — votre accord est demandé avant installation.',
    presentMonNotice: 'À propos de PresentMon : une fois dans l’application, SecretArea peut vous proposer d’installer Intel PresentMon (optionnel) pour mesurer les vrais FPS et temps d’image.',
    readySummaryHeading: 'Résumé de l’espace',
    readyClickToEdit: 'Cliquer pour modifier',
    readyLaunchHeading: 'Lancement rapide',
    readyDestinationHint: 'Vue de démarrage',
    readyStartStoreTitle: 'Boutique & Catalogue',
    readyStartStoreDesc: 'Jeux, outils et téléchargements',
    readyStartSettingsTitle: 'Paramètres & Intégrations',
    readyStartSettingsDesc: 'Dossiers, audio et Web UI',
    presentMonShortLabel: 'Intel PresentMon',
    presentMonShortDesc: 'Invitation FPS optionnelle après ouverture',
    readyEditableShortLabel: 'Toujours modifiable',
    readyEditableShortDesc: 'Thèmes, langue et dossiers débloqués',
    readyStatusDone: 'Prêt',
    readyStatusSyncing: 'Sync',
    stepGuideLabel: 'Explication de cette étape',
    step1Guide: 'Cet assistant rapide en 5 étapes présente SecretArea, vous aide à régler l’apparence, la langue et qBittorrent, et présente la télémétrie FPS Intel PresentMon.',
    step2Guide: 'Choisissez un thème prêt à l’emploi ou utilisez le Créateur de thème personnalisé (couleurs, boutons, arrondis) et votre langue : l’aperçu est immédiat.',
    step3Guide: 'SecretArea vérifie si qBittorrent est déjà installé afin de préserver votre configuration. S’il est absent, vous pouvez l’installer ou passer cette étape.',
    step4Guide: 'Connectez SecretArea à la Web UI locale (127.0.0.1 uniquement) pour afficher vitesse, sources, pairs, ETA et ratio des magnets et .torrent.',
    step5Guide: 'Vérifiez le récapitulatif de vos choix ci-dessous. Tous ces réglages restent modifiables à tout moment dans les Paramètres.',
    platformHint: 'Interface réactive petit et grand écran',
  },
  updater: {
    title: 'À propos & Mises à jour',
    subtitle: 'SecretArea Desktop',
    currentVersionLabel: 'Version installée actuelle',
    checkBtn: 'Rechercher des mises à jour',
    checkingBtn: 'Recherche...',
    upToDateMsg: 'Vous utilisez déjà la dernière version.',
    checkingMsg: 'Vérification des nouvelles versions sur GitHub Releases...',
    newVersionAvailable: 'Nouvelle version disponible',
    whatsNewTitle: 'Nouveautés de cette version',
    whatsNewCountSuffix: 'nouveautés',
    categoryFeature: 'Nouveau',
    categoryImprovement: 'Amélioré',
    categoryFix: 'Corrigé',
    downloadUpdateBtn: 'Télécharger la mise à jour',
    downloadingPrefix: 'Téléchargement',
    readyToInstall: 'est prête à être installée',
    readyToInstallDesc: 'Cliquez sur Installer et redémarrer pour appliquer la mise à jour maintenant, ou reportez pour continuer à utiliser SecretArea.',
    installRestartBtn: 'Installer et redémarrer',
    postponeBtn: 'Plus tard',
    laterBtn: 'Plus tard',
    detailsBtn: 'Nouveautés',
    toastUpdateAvailable: 'Mise à jour disponible',
    toastUpdateReady: 'Mise à jour prête',
    toastDownloading: 'Téléchargement',
    installedVersionLabel: 'Version installée',
    restartHint: 'Redémarrez SecretArea pour terminer l’installation.',
    lastCheckedLabel: 'Dernière vérification',
    errorFallback: 'Impossible de vérifier les mises à jour pour le moment.',
    preparingDownload: 'Préparation du téléchargement...',
  },
  hardware: {
    pageTitle: 'Moniteur matériel',
    pageSubtitle: 'Télémétrie système en temps réel : températures, disques, mémoire et réseau.',
    startMonitoring: 'Démarrer le suivi',
    stopMonitoring: 'Arrêter le suivi',
    refreshNow: 'Actualiser',
    statusActive: 'Suivi actif',
    statusStopped: 'Suivi en pause',
    statusWebPreview: 'Aperçu Web',
    intervalLabel: 'Intervalle',
    interval1s: '1s',
    interval1500ms: '1.5s',
    interval2s: '2s',
    interval3s: '3s',
    interval5s: '5s',
    naValue: 'N/D',
    unsupportedHint: 'Capteur non pris en charge sur ce système',
    webPreviewTitle: 'Application Bureau requise',
    webPreviewBody: 'L’aperçu Web ne peut pas lire les capteurs matériels du système. Lancez SecretArea Desktop pour afficher la télémétrie CPU, GPU, RAM, stockage et réseau.',
    sectionOverview: 'Vue d’ensemble',
    sectionPerformance: 'Performances en direct',
    sectionDetails: 'Détails du matériel',
    cpuTitle: 'Processeur (CPU)',
    gpuTitle: 'Carte graphique (GPU)',
    ramTitle: 'Mémoire (RAM)',
    storageTitle: 'Disques de stockage',
    networkTitle: 'Activité réseau',
    modelLabel: 'Modèle',
    manufacturerLabel: 'Fabricant',
    usageLabel: 'Utilisation',
    temperatureLabel: 'Température',
    clockSpeedLabel: 'Fréquence',
    coresThreadsLabel: 'Cœurs / Threads',
    coresUnit: 'Cœurs',
    threadsUnit: 'Threads',
    powerLabel: 'Consommation',
    perCoreUsageLabel: 'Charge par thread logique',
    vramLabel: 'VRAM utilisée',
    fanSpeedLabel: 'Ventilateur',
    noGpuDetected: 'Aucune donnée GPU détectée sur cet hôte.',
    totalRamLabel: 'RAM totale',
    usedRamLabel: 'RAM utilisée',
    availableRamLabel: 'RAM disponible',
    memoryTypeLabel: 'Type mémoire',
    memorySpeedLabel: 'Fréquence RAM',
    driveTypeLabel: 'Type',
    capacityLabel: 'Capacité totale',
    usedSpaceLabel: 'Espace utilisé',
    freeSpaceLabel: 'Espace libre',
    readSpeedLabel: 'Vitesse lecture',
    writeSpeedLabel: 'Vitesse écriture',
    noStorageDetected: 'Aucun lecteur de stockage détecté.',
    activeInterfaceLabel: 'Interface active',
    linkStateLabel: 'État du lien',
    linkSpeedLabel: 'Débit du lien',
    downloadSpeedLabel: 'Téléchargement',
    uploadSpeedLabel: 'Envoi',
    totalRxLabel: 'Total reçu',
    totalTxLabel: 'Total envoyé',
    noNetworkDetected: 'Aucune interface réseau active détectée.',
    uptimeLabel: 'Temps d’activité',
    hostLabel: 'Hôte',
    chartCpuRamTitle: 'Charge CPU et RAM (%)',
    chartGpuTempTitle: 'Charge GPU (%) et Températures (°C)',
    chartNetworkTitle: 'Débit réseau',
    chartCpuLoad: 'Charge CPU',
    chartRamLoad: 'Charge RAM',
    chartGpuLoad: 'Charge GPU',
    chartCpuTemp: 'Temp. CPU',
    chartGpuTemp: 'Temp. GPU',
    chartNetDownload: 'Réception',
    chartNetUpload: 'Émission',
    peakLabel: 'Pic',
    avgLabel: 'Moy.',
    lastUpdatedLabel: 'Dernière mesure',
    tabOverview: 'Télémétrie système',
    tabGaming: 'Jeux & Goulets',
    tabTechnologies: 'Tech GPU, Écran & Portable',
    tabCleaner: 'Nettoyeur PC',
    cpuSeriesLabel: 'Série',
    cpuGenerationLabel: 'Génération',
    ramChannelsLabel: 'Canaux mémoire',
    ramSlotsLabel: 'Emplacements utilisés',
    gamingTitle: 'Moniteur de performances en jeu',
    gamingSubtitle: 'Capture FPS et temps d’image par session (via PresentMon ETW), latence réseau, corrélation matérielle et analyse multi-échantillons des goulets d’étranglement.',
    gamingSelectProcess: 'Jeu / Processus cible',
    gamingAllProcesses: 'Fenêtre active au premier plan',
    gamingRefreshProcesses: 'Actualiser les processus',
    gamingPingHost: 'Hôte de test Ping',
    gamingStartSession: 'Démarrer la session',
    gamingStopSession: 'Arrêter la session',
    gamingSessionActive: 'Session active',
    gamingSessionDuration: 'Durée',
    gamingPresentMonMissingTitle: 'PresentMon ETW absent — FPS affichés en N/D',
    gamingPresentMonMissingDesc: 'SecretArea ne simule jamais les FPS et n’injecte aucun overlay. Placez PresentMon.exe dans resources/bin/PresentMon.exe ou %LOCALAPPDATA%\\Intel\\PresentMon pour capturer les vrais FPS, 1% Low et Frame Time.',
    gamingPresentMonReady: 'PresentMon ETW prêt',
    gamingFpsCurrent: 'FPS actuels',
    gamingFpsAvg: 'FPS moyens',
    gamingFps1Low: 'FPS 1% Low',
    gamingFps01Low: 'FPS 0.1% Low',
    gamingFpsMax: 'FPS max',
    gamingFrameTimeAvg: 'Frame Time moy.',
    gamingFrameTimeP95: 'Frame Time P95',
    gamingFramePacing: 'Stabilité du pacing',
    gamingSpikes: 'Pics de latence',
    gamingStutters: 'Micro-saccades',
    gamingDroppedFrames: 'Images perdues',
    gamingFrameTimeChartTitle: 'Historique Frame Time en direct (ms)',
    gamingNetworkLatencyTitle: 'Réseau & Thermique en jeu',
    gamingPingLabel: 'Ping ICMP',
    gamingPacketLossLabel: 'Perte de paquets',
    gamingInputLatencyLabel: 'Latence d’entrée',
    gamingThrottlingLabel: 'Bridal thermique',
    gamingThrottlingDetected: 'Limitation détectée',
    gamingThrottlingNormal: 'Températures normales',
    gamingBottleneckTitle: 'Analyse des goulets multi-échantillons',
    gamingBottleneckWarming: 'Collecte de la ligne de base (minimum 5 échantillons consécutifs requis pour éviter les faux positifs)...',
    gamingHistoryTitle: 'Historique local des sessions',
    gamingHistoryEmpty: 'Aucune session enregistrée. Démarrez puis arrêtez une session pour conserver vos statistiques.',
    gamingClearHistory: 'Effacer l’historique',
    gamingCompareTitle: 'Comparer deux sessions',
    gamingCompareSelectA: 'Session A',
    gamingCompareSelectB: 'Session B',
    techTitle: 'Technologies graphiques et capacités matérielles',
    techSubtitle: 'Matrice de compatibilité GPU NVIDIA, AMD et Intel. Les fonctions dépendant des jeux ne sont jamais marquées actives à tort.',
    techStatusSupported: 'Compatible',
    techStatusDetected: 'Détecté',
    techStatusActive: 'Actif',
    techStatusUnsupported: 'Non pris en charge',
    techStatusUnavailable: 'Indisponible',
    techStatusRequiresGame: 'Requiert intégration jeu',
    techStatusRequiresDriver: 'Requiert pilote / SDK',
    techArchitectureLabel: 'Architecture',
    techDriverLabel: 'Version pilote',
    techRebarLabel: 'Resizable BAR / SAM',
    displayTitle: 'Écran et réglages jeu Windows',
    displayPrimaryLabel: 'Écran principal',
    displayResolutionLabel: 'Résolution',
    displayRefreshRateLabel: 'Fréquence',
    displayConnectionLabel: 'Connexion',
    displayActiveGpuLabel: 'GPU de rendu actif',
    displayDirectXLabel: 'DirectX',
    displayHagsLabel: 'Planification GPU matérielle (HAGS)',
    displayGameModeLabel: 'Mode Jeu Windows',
    displayHdrLabel: 'HDR',
    displayVrrLabel: 'VRR / Sync adaptative',
    laptopTitle: 'Batterie et alimentation portable',
    laptopBatteryLabel: 'Niveau batterie',
    laptopPowerStateLabel: 'Alimentation',
    laptopPluggedIn: 'Secteur branché',
    laptopOnBattery: 'Sur batterie',
    laptopCharging: 'En charge',
    laptopHealthLabel: 'Santé batterie',
    laptopPowerPlanLabel: 'Mode d’alimentation',
    laptopHybridGpuLabel: 'Mode GPU hybride',
    laptopDesktopNotice: 'Aucune batterie détectée — configuration PC fixe sur secteur.',
    cleanerTitle: 'Nettoyeur PC sécurisé',
    cleanerSubtitle: 'Analysez d’abord les dossiers temporaires, vérifiez les chemins exacts, puis confirmez le nettoyage.',
    cleanerSafetyBannerTitle: 'Protection stricte des fichiers personnels et jeux',
    cleanerSafetyBannerDesc: 'SecretArea ne touche JAMAIS au Bureau, Documents, Téléchargements, Images, Vidéos, jeux, sauvegardes, mods, Windows/System32, ni aux mots de passe, favoris, cookies ou historique des navigateurs.',
    cleanerScanBtn: 'Analyser les zones sûres',
    cleanerScanningBtn: 'Analyse...',
    cleanerCleanBtn: 'Vérifier et nettoyer',
    cleanerCleaningBtn: 'Nettoyage...',
    cleanerSelectSafeDefaults: 'Sélection recommandée',
    cleanerEstimatedTotal: 'Espace sélectionné',
    cleanerOptInBadge: 'Optionnel',
    cleanerOptInWarningDesc: 'Catégorie optionnelle (décochée par défaut). Vider le cache de shaders peut provoquer une compilation au prochain lancement.',
    cleanerPathsLabel: 'Chemins ciblés',
    cleanerConfirmTitle: 'Confirmer le nettoyage',
    cleanerConfirmDesc: 'Vérifiez les catégories sélectionnées avant de supprimer définitivement ces fichiers temporaires.',
    cleanerConfirmAction: 'Confirmer et nettoyer',
    cleanerCancelAction: 'Annuler',
    cleanerProgressCleaning: 'Nettoyage en cours...',
    cleanerReportTitle: 'Nettoyage terminé',
    cleanerReportFreed: 'Espace libéré',
    cleanerReportRemoved: 'Fichiers supprimés',
    cleanerReportSkipped: 'Fichiers verrouillés ignorés',
    cleanerCatOldTempTitle: 'Anciens fichiers Temp (>48h)',
    cleanerCatOldTempDesc: 'Fichiers temporaires système de plus de 48 heures.',
    cleanerCatUserTempTitle: 'Dossier Temp utilisateur',
    cleanerCatUserTempDesc: 'Fichiers temporaires dans %TEMP%.',
    cleanerCatAppCacheTitle: 'Caches temporaires système',
    cleanerCatAppCacheDesc: 'Journaux temporaires et vidages d’erreur sûrs.',
    cleanerCatSecretAreaCacheTitle: 'Cache SecretArea',
    cleanerCatSecretAreaCacheDesc: 'Cache HTTP/GPU interne et téléchargements temporaires de SecretArea.',
    cleanerCatThumbnailTitle: 'Cache de miniatures Windows',
    cleanerCatThumbnailDesc: 'Fichiers thumbcache_*.db de l’Explorateur Windows.',
    cleanerCatShaderTitle: 'Cache Shaders DirectX / GPU',
    cleanerCatShaderDesc: 'Caches de shaders D3DSCache et pilotes GPU.',
    cleanerCatRecycleTitle: 'Corbeille Windows',
    cleanerCatRecycleDesc: 'Vide définitivement les éléments de la Corbeille.',
    cleanerCatBrowserTitle: 'Cache HTTP navigateur uniquement',
    cleanerCatBrowserDesc: 'Supprime uniquement le cache HTTP/Code d’Edge, Chrome ou Firefox (conserve connexions, cookies et historique).',
    tabHealth: 'Santé & Diagnostics',
    tabInventoryPorts: 'Système & Ports',
    tabAdvisors2030: 'Conseillers & 2030+',
    tabBenchmarksDb: 'Benchmarks & Base',
    provDetected: 'Détecté',
    provMeasured: 'Mesuré',
    provSpec: 'Spécification',
    provEstimated: 'Estimé',
    provNotSupported: 'Non supporté',
    provNotDetected: 'Non détecté',
    provSensorUnavailable: 'Capteur indisponible',
    provRequiresAdmin: 'Droits Admin Requis',
    provUnknown: 'Inconnu',
    workloadProfileLabel: 'Usage principal',
    workloadGaming: 'Jeu vidéo',
    workloadOffice: 'Bureautique & Quotidien',
    workloadProgramming: 'Programmation & VMs',
    workload3d: 'Modélisation & Rendu 3D',
    workloadVideo: 'Montage Vidéo',
    workloadDesign: 'Design Graphique',
    workloadAi: 'IA / Machine Learning',
    workloadPro: 'Usage Professionnel',
    workloadMixed: 'Usage Mixte',
    intelRefreshDeepScan: 'Réanalyser le matériel',
    loadingDeepScan: 'Collecte de l’inventaire matériel approfondi...',
    intelPrivacyOn: 'Confidentialité : ACTIVÉE',
    intelPrivacyOff: 'Confidentialité : DÉSACTIVÉE',
    intelExportJson: 'Exporter JSON',
    intelExportPdf: 'Exporter PDF',
    intelExportHtml: 'Exporter Rapport',
    intelExportSuccess: 'Rapport matériel exporté avec succès',
    intelExportHtmlWebNote: 'Rapport HTML imprimable téléchargé (ouvrir puis Imprimer en PDF).',
    intelUnknown: 'Inconnu',
    intelUnavailable: 'Indisponible',
    intelNotDetected: 'Non détecté',
    intelSensorUnavailable: 'Capteur indisponible',
    intelSourceLabel: 'Source capteur',
    desktopOnlyHint: 'Disponible dans SecretArea Desktop (Windows / Linux).',
    healthPhysicalTitle: 'Santé Physique',
    healthMeasuredCoverage: 'composants mesurés',
    healthPerformanceTitle: 'Capacité de Performance',
    healthAgeTitle: 'Âge Matériel',
    healthAgeNote: 'Basé sur les générations CPU/GPU/RAM détectées',
    healthLifespanTitle: 'Durée de vie utile estimée',
    healthLifespanDisclaimer: 'Dépend de l’usage, du refroidissement et de l’usure',
    healthBreakdownTitle: 'Détail Santé & Analyse des Goulots',
    thermalCoolingTitle: 'Ventilateurs, Refroidissement & Thermique',
    fanNoSourceHint: 'Aucun pont RPM détecté (LibreHardwareMonitor recommandé sous Windows)',
    fansDetectedHeader: 'Ventilateurs détectés',
    fansUnavailableBody: 'Aucun capteur RPM exposé par l’OS. LibreHardwareMonitor (Windows) ou hwmon (Linux) permet de lire les RPM réels sans estimation.',
    fanStatusRunning: 'Actif',
    fanStatusStopped: 'Arrêté — Confirmé',
    fanStatusAbnormal: 'RPM Anormal',
    fanStatusNotDetected: 'Non détecté',
    fanStatusUnavailable: 'Capteur indisponible',
    thermalSensorsHeader: 'Capteurs de Température',
    thermalPhysicalNoticeTitle: 'Inspection Physique Requise',
    errorsDriversTitle: 'Erreurs Matérielles, Journaux & Pilotes',
    errorsDriversSubtitle: 'Codes Gestionnaire de périphériques, journaux WHEA/Disque/Affichage et pilotes signés',
    pnpErrorsHeader: 'Erreurs Périphériques (PnP)',
    pnpNoErrors: 'Aucune erreur détectée dans le Gestionnaire de périphériques.',
    eventLogsHeader: 'Journaux Système (14 jours)',
    eventLogsEmpty: 'Aucun événement critique WHEA, disque ou affichage récent.',
    signedDriversHeader: 'Pilotes Matériels Signés',
    searchDriversPlaceholder: 'Rechercher un pilote...',
    driverDeviceCol: 'Périphérique',
    driverClassCol: 'Classe',
    driverVersionCol: 'Version',
    driverDateCol: 'Date',
    driverSignedCol: 'Signature',
    driverSigned: 'Signé',
    driverUnsigned: 'Non signé',
    sysIdTitle: 'Identification Système',
    sysFormFactor: 'Format (Châssis)',
    sysSku: 'Produit / SKU',
    sysSerialMasked: 'N° Série (Masqué)',
    sysOsBuild: 'OS & Build',
    sysArch: 'Architecture',
    sysBootMode: 'Mode Démarrage',
    sysSecureBoot: 'Secure Boot',
    sysTpm: 'Module TPM',
    sysSensorBackends: 'Moteurs Télémétrie Actifs',
    moboTitle: 'Diagnostics Carte Mère',
    moboChipset: 'Chipset',
    moboSocket: 'Socket CPU',
    moboBios: 'BIOS / UEFI',
    moboBiosDate: 'Date BIOS',
    moboRamSupport: 'Support Mémoire',
    moboPcieSlots: 'Slots PCIe / Extension (SMBIOS)',
    portsTitle: 'Ports, Connecteurs & Contrôleurs',
    portsSubtitle: 'Distingue strictement ports physiques SMBIOS, contrôleurs hôtes et appareils connectés',
    portsHonestyBanner: 'Règle de précision : Un contrôleur USB n’est jamais compté comme un port physique. Les ports non confirmés restent séparés.',
    portsTabConfirmed: 'Ports Physiques Confirmés',
    portsTabControllers: 'Contrôleurs Matériels',
    portsTabConnected: 'Appareils Connectés',
    portsTabUnconfirmed: 'En-têtes Internes / Non Confirmés',
    portsBucketEmpty: 'Aucun élément signalé dans cette catégorie par les tables OS/SMBIOS.',
    storageSmartTitle: 'Santé Stockage & Diagnostics SMART',
    storageSmartSubtitle: 'Tout disque sans compteur SMART est marqué Indisponible — jamais sain par défaut',
    smartUnavailable: 'SMART Indisponible',
    smartWearLabel: 'Usure / Vie SSD',
    smartPohLabel: 'Heures sous tension',
    smartCyclesLabel: 'Cycles allumage',
    smartErrorsLabel: 'Erreurs non corrigées',
    cpuGpuDeepTitle: 'CPU Détaillé & Rôles Multi-GPU',
    cpuCacheLabel: 'Cache CPU',
    cpuVirtLabel: 'Virtualisation Matérielle',
    cpuVoltageLabel: 'Tension Cœur',
    multiGpuRolesHeader: 'Attribution Rôles GPU (iGPU vs dGPU)',
    ramDimmsTitle: 'RAM & Détail par Barrette (DIMM)',
    ramEccLabel: 'Statut ECC',
    ramPagefileLabel: 'Fichier d’échange (Pagefile)',
    ramDimmsUnavailable: 'Les détails SMBIOS par slot DIMM sont indisponibles ici.',
    displaysDeepTitle: 'Écrans & Dimensions Physiques EDID',
    powerPsuBatteryTitle: 'Alimentation & Batterie',
    psuTelemetryHeader: 'Information Télémétrie PSU Bureau',
    batteryDesignVsFull: 'Capacité Actuelle / Design',
    batteryCyclesLabel: 'Cycles de charge',
    batteryRateLabel: 'Débit Charge / Décharge',
    peripheralsNetTitle: 'Réseau, Périphériques & Composants Système',
    adaptersLabel: 'Adaptateurs',
    peripheralsLabel: 'Périphériques',
    systemComponentsLabel: 'Contrôleurs & Composants',
    future2030Title: 'Compatibilité Future & Conseiller 2030+',
    future2030Subtitle: 'Sépare les faits matériels vérifiés des projections futures (2027–2030+)',
    futureProjectedVerdict: 'Préparation Projetée',
    futureVerifiedFactsTitle: 'Faits Matériels Vérifiés',
    futureForwardEstimatesTitle: 'Estimations & Hypothèses Futures',
    upgradeAdvisorTitle: 'Conseiller Mise à Niveau Intelligent',
    upgradeAdvisorSubtitle: 'Vérifie socket, génération/slots RAM, composants soudés PC portable & alimentation PSU',
    psuWattageInputLabel: 'Puissance Alimentation PSU (W)',
    psuApplyBtn: 'Vérifier PSU',
    psuOptionalHint: 'Optionnel — Windows ne lit pas la puissance d’un bloc ATX standard.',
    upgradeNoneNeeded: 'Aucune mise à niveau urgente requise pour votre profil d’usage actuel.',
    compatVerified: 'Compatibilité Vérifiée',
    compatCheckNeeded: 'Vérifier Espace / PSU',
    gamingCompatTitle: 'Compatibilité Jeu & Catalogue SecretArea',
    gamingCompatSubtitle: 'Recommandations réalistes par résolution + test sur les jeux du catalogue',
    catalogGamesCheckTitle: 'Tester avec le Catalogue de Jeux',
    catalogSearchPlaceholder: 'Rechercher un jeu du catalogue...',
    proCompatTitle: 'Compatibilité Logiciels Professionnels',
    maintenanceTitle: 'Maintenance & Entretien Préventif',
    maintenanceSafetyNote: 'Conseils en lecture seule — ne modifie jamais BIOS, tensions ou fichiers personnels',
    benchTitle: 'Micro-Benchmarks Sûrs & Optionnels',
    benchSubtitle: 'Tests courts, non destructifs et annulables avec arrêt thermique automatique',
    benchSafetyNotice: 'Tests lancés uniquement à la demande. Arrêt automatique si CPU >= 92°C ou GPU >= 88°C. Le test disque utilise uniquement un fichier temporaire supprimé aussitôt.',
    benchCpuSingle: 'CPU Mono-Cœur',
    benchCpuMulti: 'CPU Multi-Cœurs',
    benchRamThroughput: 'Bande Passante RAM',
    benchStorageSeq: 'Stockage Séquentiel (Temp)',
    benchStorage4k: 'Stockage Lecture 4K (Temp)',
    benchNetLatency: 'Latence Réseau',
    benchStartBtn: 'Lancer les tests sélectionnés',
    benchStartWebBtn: 'Lancer micro-tests navigateur',
    benchCancelBtn: 'Arrêter le test',
    benchStarting: 'Préparation du benchmark sûr...',
    benchRunningWeb: 'Exécution des micro-tests navigateur...',
    benchCompleted: 'Benchmark terminé.',
    benchAbortedThermal: 'Arrêt de sécurité thermique déclenché.',
    benchCancelled: 'Benchmark annulé par l’utilisateur.',
    dbTitle: 'Base Générations Matérielles & Mise à Jour',
    dbVersionLabel: 'Version Base',
    dbEntriesLabel: 'entrées',
    dbSourceLabel: 'Source Active',
    dbCheckUpdateBtn: 'Vérifier Flux HTTPS',
    dbCustomFeedConsentLabel: 'Je fais confiance à ce flux HTTPS personnalisé et j’accepte de remplacer la base officielle.',
    dbImportJsonBtn: 'Importer JSON',
    dbRollbackBtn: 'Restaurer Sauvegarde',
    dbSearchPlaceholder: 'Filtrer CPU, GPU, RAM, Chipsets...',
    dbWebOfflineNote: 'Utilisation de la base hors-ligne intégrée en mode Aperçu Web.',
    dbUpdateApplied: 'Base matérielle mise à jour et validée.',
    dbUpToDate: 'La base matérielle locale vérifiée est active.',
    dbImportSuccess: 'Base JSON locale importée et validée.',
    dbRollbackSuccess: 'Restauration vers la dernière sauvegarde valide réussie.',
    tabOpenSourceTools: 'Outils Open-Source',
    ossTitle: 'Outils Matériels Open-Source & Gestionnaire de Versions',
    ossSubtitle: 'Moteurs de télémétrie open-source vérifiés téléchargés directement depuis GitHub Releases et NuGet avec vérification SHA-256.',
    ossPolicyBadge: 'Open-Source OSI uniquement',
    ossPolicyDesc: 'Seuls les logiciels véritablement open-source et gratuits (comme LibreHardwareMonitorLib sous MPL-2.0) sont éligibles. Les utilitaires propriétaires à code fermé sont exclus.',
    ossCheckUpdatesBtn: 'Vérifier les mises à jour',
    ossCheckingBtn: 'Vérification des sorties...',
    ossInstallBtn: 'Installer la version officielle',
    ossUpdateBtn: 'Mettre à jour',
    ossReinstallBtn: 'Réinstaller & Vérifier',
    ossRollbackBtn: 'Restaurer la précédente',
    ossCancelBtn: 'Annuler',
    ossConfirmDownloadTitle: 'Confirmer le téléchargement open-source officiel',
    ossConfirmDownloadDesc: 'SecretArea va télécharger la version officielle depuis GitHub Releases ou NuGet, vérifier sa somme SHA-256 et installer LibreHardwareMonitorLib localement sans interface graphique autonome.',
    ossConfirmRollbackDesc: 'Restaurer la version précédente sauvegardée de LibreHardwareMonitorLib dans le dossier actif.',
    ossConfirmProceedBtn: 'Approuver & Continuer',
    ossInstalledVersionLabel: 'Version installée',
    ossLatestVersionLabel: 'Dernière version stable',
    ossStatusLabel: 'Statut',
    ossLastCheckedLabel: 'Dernière vérification',
    ossReleaseDateLabel: 'Date de sortie',
    ossReleaseNotesLabel: 'Notes de version officielles',
    ossNoReleaseNotes: 'Cliquez sur « Vérifier les mises à jour » pour récupérer dynamiquement la version, la date et les notes depuis GitHub.',
    ossStatusNotInstalled: 'Non installé',
    ossStatusUpToDate: 'À jour',
    ossStatusUpdateAvailable: 'Mise à jour disponible',
    ossStatusNewerInstalled: 'Version locale plus récente',
    ossStatusRepairRequired: 'Réparation requise',
    ossStageDownloading: 'Téléchargement de l’archive officielle',
    ossStageVerifying: 'Vérification SHA-256 & intégrité PE',
    ossStageInstalling: 'Extraction & activation de la bibliothèque',
    ossLinkRepo: 'Dépôt GitHub',
    ossLinkReleases: 'Versions officielles',
    ossLinkNuget: 'Paquet NuGet',
    ossLinkLicense: 'Licence MPL-2.0',
    ossLinkSource: 'Code source',
    ossDirectLibBadge: 'Moteur DLL direct · Sans GUI requis',
    ossShaVerifiedBadge: 'SHA-256 vérifié',
    ossAdminTitle: 'Sécurité utilisateur standard & Élévation',
    ossAdminDescStandard: 'SecretArea ne s’exécute jamais en permanence en Administrateur. Les capteurs GPU, NVMe et mémoire fonctionnent en utilisateur standard ; les capteurs carte mère Ring0 (VRM, tensions, ventilateurs SuperIO) nécessitent un accès administrateur lorsqu’ils sont bloqués.',
    ossAdminDescElevated: 'La session actuelle dispose des droits administrateur ; tous les capteurs carte mère, VRM, tensions et ventilateurs SuperIO sont accessibles via LibreHardwareMonitorLib.',
    ossThirdPartyTitle: 'Conformité Licence Open-Source Tierce (MPL-2.0)',
    ossThirdPartyDesc: 'LibreHardwareMonitorLib est distribué sous licence Mozilla Public License 2.0 (MPL-2.0) par les contributeurs LibreHardwareMonitor. Les notices officielles sont conservées localement et dans THIRD_PARTY_LICENSES.md.',
    ossWebPreviewNote: 'Téléchargements désactivés en Aperçu Web : utilisez SecretArea Desktop sur Windows 10/11 pour télécharger, vérifier le SHA-256 et activer LibreHardwareMonitorLib.',
    ossPlatformUnsupportedNote: 'L’intégration directe de LibreHardwareMonitorLib (.NET DLL) cible Windows 10/11. Sous Linux, SecretArea utilise automatiquement sysfs hwmon/DRM.',
  },
  updateHistory: {
    title: 'Historique des mises à jour',
    subtitle: 'Chronologie complète des versions et changements de SecretArea',
    settingsCardTitle: 'Version de l’application & Historique',
    settingsCardDesc: 'Consultez toutes les versions précédentes de SecretArea Desktop et le détail de chaque nouveauté.',
    openHistoryBtn: 'Historique des versions',
    searchPlaceholder: 'Rechercher une version ou un changement...',
    filterAll: 'Tout',
    filterFeature: 'Nouveautés',
    filterImprovement: 'Améliorations',
    filterFix: 'Correctifs',
    currentBadge: 'Installée',
    latestBadge: 'Dernière',
    refreshBtn: 'Actualiser',
    refreshingBtn: 'Sync...',
    checkUpdatesBtn: 'Rechercher des mises à jour',
    emptyState: 'Aucune version ou entrée ne correspond à votre recherche.',
    changesSuffix: 'modifications',
    closeBtn: 'Fermer',
    devBadge: 'En développement',
    updateAvailableBadge: 'Mise à jour disponible',
    installedDevBadge: 'Actif (Mode Dév)',
    devModeEnvLabel: 'Mode Développement',
    prodEnvLabel: 'Version Installée',
    unpublishedNote: 'Pas encore publié sur GitHub',
    syncingAutoLabel: 'Synchronisation auto...',
    newCountLabel: 'Nouveautés',
    changedCountLabel: 'Modifiés',
    fixedCountLabel: 'Corrigés',
    justUpdatedTitle: 'Nouveautés de cette version',
    justUpdatedFromPrefix: 'Mise à jour automatique depuis',
    newlyInstalledBadge: 'Installée à l’instant',
  },
  notificationCenter: {
    buttonLabel: 'Notifications',
    title: 'Centre de notifications',
    subtitle: 'Les 3 derniers jeux ajoutés et mises à jour',
    syncNowBtn: 'Synchroniser',
    syncingBtn: 'Sync...',
    markAllReadBtn: 'Tout marquer lu',
    updateHistoryBtn: 'Historique',
    lastSyncedPrefix: 'Dernière sync',
    neverSynced: 'Cache local',
    searchPlaceholder: 'Filtrer par titre, version ou onglet...',
    filterAll: 'Tout',
    filterImportant: 'Onglets importants',
    filterNews: 'Actualités',
    importantHint: 'Ajouts et mises à jour : Jeux, Hypervisor, SteamTools, PS5, Outils & Sauvegardes',
    newsHint: 'Annonces et tendances : À venir, Liste à venir & Repacks populaires',
    liveBadge: 'Direct',
    newBadge: 'Nouveau',
    updatedBadge: 'Mis à jour',
    upcomingBadge: 'À venir',
    popularBadge: 'Populaire',
    openItemHint: 'Ouvrir',
    openExtrasHint: 'Voir dans Extras',
    emptyTitle: 'Tout est à jour',
    emptyDesc: 'Aucune mise à jour ou nouveauté récente pour le moment.',
    syncedToast: 'Catalogue synchronisé',
    newUpdatesToastPrefix: 'nouvelles mises à jour',
    tabLabels: {
      all: 'Tous',
      game: 'Jeux',
      hypervisor: 'Hypervisor',
      steamtools: 'SteamTools',
      ps5: 'PS5',
      architect: 'Outils',
      extra: 'Sauvegardes',
      upcoming: 'À venir',
      upcominglist: 'Liste à venir',
      popularrepacks: 'Repacks populaires',
    },
  },
  spinWheel: {
    title: 'Roue des Repacks Populaires',
    subtitle: 'Tournez la roue pour découvrir un jeu aléatoire parmi les Plus Populaires',
    spinBtn: 'Lancer la roue',
    spinningLabel: 'Rotation...',
    spinAgainBtn: 'Relancer',
    viewGameBtn: 'Voir les détails du jeu',
    poolCountSuffix: 'jeux dispo',
    filterAll: 'Tous populaires',
    filterGames: 'Jeux',
    filterHv: 'Hypervisor',
    filterCanRun: 'Compatible PC',
    readyTitle: 'Prêt pour une surprise ?',
    readyDesc: 'Cliquez sur SPIN au centre de la roue pour tirer au sort un jeu parmi les Repacks Populaires.',
    winnerLabel: 'Sélection gagnante',
    recentTitle: 'Tirages récents',
    emptyPool: 'Aucun jeu ne correspond à ce filtre dans les Repacks Populaires.',
    repackSizeLabel: 'Repack',
    originalSizeLabel: 'Original',
    canRunPass: 'Compatible avec votre PC',
    canRunFail: 'Config PC insuffisante',
    addFavorite: 'Favori',
    removeFavorite: 'Favori ajouté',
    congratsTitle: 'Félicitations !',
    congratsSubtitle: 'Votre sélection aléatoire est prête.',
  },
  deals: {
    pageTitle: 'Découverte & Bons Plans PC',
    pageSubtitle: 'Promotions PC en direct, comparateur multi-boutiques et jeux gratuits vérifiés.',
    refreshBtn: 'Actualiser',
    refreshingBtn: 'Actualisation',
    lastUpdatedPrefix: 'Mis à jour',
    regionLabel: 'Région',
    currencyLabel: 'Devise',
    allCurrenciesLabel: 'Toutes les devises',
    liveFxRateLabel: 'Taux direct',
    fxLoadingLabel: 'Mise à jour...',
    fxUnavailableLabel: 'Taux indispo · USD',
    sourcePriceHint: 'Prix boutique',
    currencyNames: {
      USD: 'Dollar américain',
      MAD: 'Dirham marocain',
      EUR: 'Euro',
      GBP: 'Livre sterling',
      CAD: 'Dollar canadien',
      SAR: 'Riyal saoudien',
      AED: 'Dirham des Émirats',
      TRY: 'Livre turque',
      BRL: 'Réal brésilien',
      JPY: 'Yen japonais',
    },
    tabOverview: 'Aperçu',
    tabAllDeals: 'Toutes les offres',
    tabFreeGames: 'Jeux gratuits',
    tabStores: 'Boutiques',
    featuredDealsTitle: 'Offres à la une',
    bestDiscountsTitle: 'Meilleures réductions',
    trendingDealsTitle: 'Tendances du moment',
    recentlyUpdatedTitle: 'Récemment mises à jour',
    freeGamesSpotlightTitle: 'Jeux gratuits & Cadeaux',
    popularGamesTitle: 'Jeux populaires',
    viewAllBtn: 'Tout voir',
    searchPlaceholder: 'Rechercher un jeu PC...',
    storeFilterAll: 'Toutes les boutiques vérifiées',
    minPriceLabel: 'Min',
    maxPriceLabel: 'Max',
    minDiscountLabel: 'Remise',
    discountAny: 'Toutes',
    sortLabel: 'Trier',
    sortDealRating: 'Meilleure note',
    sortSavings: 'Plus forte remise',
    sortPriceAsc: 'Prix croissant',
    sortPriceDesc: 'Prix décroissant',
    sortRecent: 'Plus récents',
    sortMetacritic: 'Score Metacritic',
    sortTitle: 'Titre A–Z',
    resetFiltersBtn: 'Réinitialiser',
    resultsCountSuffix: 'offres',
    pageLabel: 'Page',
    ofLabel: 'sur',
    prevPageBtn: 'Précédent',
    nextPageBtn: 'Suivant',
    freeCatLimited: 'Gratuits temporairement',
    freeCatGiveaways: 'Cadeaux & Clés',
    freeCatFreeToPlay: 'Free-to-Play',
    freeCatLimitedDesc: 'Jeux payants offerts temporairement à 100 % — triés par fin la plus proche.',
    freeCatGiveawaysDesc: 'DLC, packs et clés promotionnelles vérifiés.',
    freeCatFreeToPlayDesc: 'Jeux PC gratuits en permanence auprès d’éditeurs vérifiés.',
    expiresPrefix: 'Expire dans',
    noExpiryLabel: 'Gratuit en permanence',
    originalWorthPrefix: 'Prix initial',
    claimFreeBtn: 'Obtenir gratuitement',
    playFreeBtn: 'Ouvrir la boutique',
    viewDealBtn: 'Voir l’offre',
    compareOffersBtn: 'Comparer',
    dealRatingLabel: 'Note',
    freeBadge: 'GRATUIT',
    storesTitle: 'Boutiques numériques vérifiées',
    storesSubtitle: 'Boutiques récupérées dynamiquement depuis les fournisseurs intégrés.',
    storeActiveDealsSuffix: 'offres repérées',
    storeTopDiscountPrefix: 'Jusqu’à',
    browseStoreBtn: 'Voir les offres',
    detailOffersTitle: 'Comparaison multi-boutiques',
    detailHistoricalLowLabel: 'Plus bas historique',
    detailHistoricalDatePrefix: 'Enregistré le',
    detailBestPriceLabel: 'Meilleur prix actuel',
    detailLoadingOffers: 'Chargement des offres et du plus bas historique...',
    detailCurrencyNotice: 'Les conversions utilisent le taux en direct ; le prix boutique d’origine reste affiché.',
    detailStoreCol: 'Boutique',
    detailOriginalCol: 'Initial',
    detailCurrentCol: 'Actuel',
    detailDiscountCol: 'Remise',
    detailActionCol: 'Lien',
    detailCloseBtn: 'Fermer',
    emptyDealsTitle: 'Aucune offre ne correspond',
    emptyDealsDesc: 'Réduisez la remise minimale, élargissez le budget ou effacez la recherche.',
    emptyFreeTitle: 'Aucune offre active dans cette catégorie',
    emptyFreeDesc: 'Les promotions vérifiées apparaissent dès qu’elles sont publiées.',
    errorTitle: 'Impossible de charger les offres',
    offlineDesc: 'Vous semblez hors ligne. Reconnectez-vous pour actualiser les prix.',
    retryBtn: 'Réessayer',
    tabLivePlayers: 'Joueurs en direct',
    tabCompare: 'Comparer',
    tabAlerts: 'Alertes Prix',
    whatsHotTodayTitle: "À l'affiche aujourd'hui",
    whatsHotSubtitle: 'Pics de joueurs en direct, meilleures remises et sorties tendance',
    hotMostPlayed: 'Plus joués en direct',
    hotBiggestGains: 'Plus fortes hausses 24h',
    hotNewReleases: 'Nouveautés populaires',
    hotBestDiscounts: 'Meilleures remises',
    kpiTopPlayers: 'Top 100 Steam simultané',
    kpiActiveDeals: 'Offres suivies',
    kpiFreeNow: 'Jeux gratuits & cadeaux',
    kpiFollowedAlerts: 'Alertes suivies',
    livePlayersTitle: 'Joueurs Steam en direct & Tendances',
    livePlayersSubtitle: 'Classement Top 100, dynamique sur 24h et évolution des avis',
    liveTabTop100: 'Top 100 Direct',
    liveTabGainers: 'En hausse',
    liveTabDecliners: 'En baisse',
    liveTabReviewMovers: 'Tendances avis',
    liveSearchPlaceholder: 'Filtrer par titre ou ID Steam...',
    liveColRank: 'Rang',
    liveColGame: 'Jeu',
    liveColPlayers: 'En jeu',
    liveColPeak24h: 'Pic 24h',
    liveColChange24h: 'Var. 24h',
    liveColTrend7d: 'Tendance 7j',
    liveColPrice: 'Prix Steam',
    liveColActions: 'Actions',
    healthLegendTitle: 'Niveaux de santé des jeux',
    healthLegendDesc: 'Basé sur la rétention récente sur 30 jours et les instantanés historiques (jamais de fausses estimations).',
    healthTiers: {
      thriving: 'Florissant',
      healthy: 'Sain',
      cooling: 'En recul',
      quiet: 'Calme',
      dormant: 'Inactif',
      unknown: 'Non classé',
    },
    freeFilterAll: 'Toutes boutiques',
    freeFilterEpic: 'Epic Games',
    freeFilterSteam: 'Steam',
    freeFilterGog: 'GOG',
    freeFilterPcDlc: 'DLC & Bonus',
    compareTitle: 'Comparaison côte à côte',
    compareSubtitle: 'Comparez joueurs, avis Steam, notes critiques séparées et prix (2 à 4 jeux)',
    compareSearchPlaceholder: 'Rechercher un jeu PC à comparer...',
    compareAddBtn: 'Comparer',
    compareAddedBadge: 'Ajouté',
    compareRemoveBtn: 'Retirer',
    compareClearBtn: 'Tout effacer',
    compareEmptyTitle: 'Sélectionnez des jeux à comparer',
    compareEmptyDesc: 'Recherchez ci-dessus ou cliquez sur Comparer sur une offre.',
    compareMaxNotice: 'Jusqu’à 4 jeux peuvent être comparés simultanément.',
    compareMetricCol: 'Indicateur',
    alertsTitle: 'Alertes de baisse de prix',
    alertsSubtitle: 'Suivez des jeux et recevez des alertes locales dès que le prix baisse',
    alertsCheckNowBtn: 'Vérifier maintenant',
    alertsCheckingBtn: 'Vérification...',
    alertsFollowBtn: 'Suivre le prix',
    alertsFollowingBadge: 'Alerte active',
    alertsTargetPriceLabel: 'Prix cible',
    alertsAnyDropOption: 'Toute baisse',
    alertsLastCheckedLabel: 'Dernière vérification',
    alertsTriggeredTitle: 'Baisses détectées',
    alertsFollowedTitle: 'Jeux suivis',
    alertsMarkAllReadBtn: 'Tout marquer lu',
    alertsClearEventsBtn: "Effacer l'historique",
    alertsEmptyFollowed: 'Aucun jeu suivi pour le moment.',
    alertsEmptyTriggered: 'Aucune baisse de prix détectée récemment.',
    alertsDropDetectedToast: 'Baisse de prix détectée pour',
    modalTabOverview: 'Aperçu & Boutiques',
    modalTabCharts: 'Courbes Joueurs & Prix',
    modalTabReviewsCritics: 'Avis & Critiques',
    modalTabStatsNews: 'Stats, Succès & Actus',
    playerChartTitle: 'Historique des joueurs Steam',
    priceChartTitle: 'Historique des prix',
    noChartData: 'Aucune donnée historique disponible pour ce titre.',
    discountShameWarning: 'Alerte hausse : le prix de base a augmenté juste avant la promo.',
    criticsSectionTitle: 'Notes critiques et avis séparés',
    criticsSeparateNote: 'Chaque plateforme conserve sa propre échelle sans fusion artificielle.',
    steamRatingCardTitle: 'Note joueurs Steam',
    metacriticScoreCardTitle: 'Metacritic Metascore',
    metacriticUserCardTitle: 'Note utilisateurs Metacritic',
    openCriticCardTitle: 'Score OpenCritic',
    keyRequiredBadge: 'Clé optionnelle requise',
    configureKeyAction: 'Configurer la clé API',
    reviewsPositiveLabel: 'Positifs',
    reviewsNegativeLabel: 'Négatifs',
    reviewsDailyTrendTitle: 'Évolution des avis',
    reviewsRecentTitle: 'Avis des joueurs',
    reviewsSnapshotNote: 'Agrégats et tendances via The Game Census (thegamecensus.com, CC BY 4.0).',
    achievementsTitle: 'Succès mondiaux débloqués',
    newsUpdatesTitle: 'Actualités & impact des mises à jour',
    updateImpactLabel: 'Joueurs après maj',
    developerLabel: 'Développeur',
    publisherLabel: 'Éditeur',
    releaseDateLabel: 'Date de sortie',
    platformsLabel: 'Plateformes',
    healthStatusLabel: 'Santé du jeu',
    sourcesLabel: 'Sources de données',
    apiKeysBtn: 'Clés API',
    apiKeysTitle: 'Fournisseurs & Clés API optionnelles',
    apiKeysSubtitle: 'Les API publiques fonctionnent sans clé. Les clés optionnelles débloquent Steam Index, Metacritic Users et OpenCritic.',
    apiKeysFreeLabel: 'API publiques actives (sans clé)',
    apiKeysOptionalLabel: 'API authentifiées optionnelles (chiffrées)',
    apiKeysSaveBtn: 'Enregistrer la clé',
    apiKeysClearBtn: 'Supprimer',
    apiKeysConfiguredBadge: 'Configurée',
    apiKeysNotSetBadge: 'Non définie',
    apiKeysSafeStorageNote: 'Chiffré localement via Electron safeStorage.',
  },
  settingsHub: {
    searchPlaceholder: 'Rechercher un paramètre, thème ou outil (ex: qBittorrent, FPS, API, cache)...',
    searchResultsCount: 'sections correspondantes',
    searchEmptyTitle: 'Aucun paramètre ou outil trouvé',
    searchEmptyDesc: 'Essayez de rechercher langue, thème, curseur, performance, qBittorrent, PresentMon, nettoyeur ou API.',
    clearSearchBtn: 'Effacer la recherche',
    catAll: 'Tous les paramètres',
    catTools: 'Outils & Intégrations',
    catLanguage: 'Langue & Région',
    catStartup: 'Démarrage & Système',
    catAppearance: 'Apparence & Thèmes',
    catAudio: 'Audio & Ambiance',
    catPerformance: 'Performance & Énergie',
    catStorage: 'Stockage, Cache & Sauvegarde',
    catUpdates: 'Mises à jour & Historique',
    summaryThemeLabel: 'Thème actif',
    summaryPerfLabel: 'Profil de performance',
    summaryToolsLabel: 'Outils & Moteurs',
    summarySystemLabel: 'Matériel & Stockage',
    toolsReadySuffix: 'prêts',
    themeStudioTitle: 'Studio de Thèmes Rapide',
    themeStudioDesc: 'Basculez facilement entre les modes sombre/clair, les ambiances console ou votre palette personnalisée.',
    themeDefaultDark: 'Sombre par défaut',
    themeCrispLight: 'Clair lumineux',
    themePs5: 'PlayStation 5',
    themeXbox: 'Xbox Nexus',
    themeCustom: 'Studio perso',
    traySmartTip: 'Astuce : le démarrage avec l’ordinateur est actif. Passez la fermeture sur « Réduire dans la zone de notification » pour garder SecretArea prêt en arrière-plan.',
    traySmartBtn: 'Réduire en barre d’état',
    audioStatusConsoleActive: 'La musique d’ambiance console et les effets sonores UI sont actifs.',
    audioStatusStandby: 'Les sons de clic sont actifs. La musique d’ambiance démarre automatiquement avec le thème PS5 ou Xbox.',
    audioPreviewBtn: 'Tester le son',
    volumeMute: 'Muet',
    volumeLow: 'Faible',
    volumeBalanced: 'Équilibré',
    volumeMax: 'Max',
    effectiveParamsTitle: 'Paramètres effectifs en direct',
    effectiveHwPoll: 'Sonde Matériel',
    effectiveUiCoalesce: 'Sync UI',
    effectiveTorrentPoll: 'Torrent Veille',
    effectiveCacheCap: 'Limite Images',
    diskFreeLabel: 'Espace disque libre',
    cacheSectionTitle: 'Cache, Données & Sauvegarde Portable',
    cacheSectionDesc: 'Videz les caches réseau ou images, ou exportez/importez vos préférences SecretArea en JSON.',
    clearDealsCacheBtn: 'Vider le cache Bons plans',
    dealsCacheCleared: 'Cache mémoire des bons plans vidé.',
    clearImageCacheBtn: 'Vider le cache d’images',
    imageCacheCleared: 'Cache des jaquettes vidé.',
    exportSettingsBtn: 'Exporter les réglages',
    importSettingsBtn: 'Importer les réglages',
    importSettingsSuccess: 'Réglages importés et appliqués.',
    importSettingsError: 'Fichier JSON de réglages invalide.',
    hubTitle: 'Centre des Outils & Intégrations',
    hubSubtitle: 'Tous les utilitaires intégrés, moteurs matériels, outils de téléchargement et API au même endroit : découvrez leur rôle et configurez-les directement.',
    hubFilterAll: 'Tous les outils',
    hubFilterHardware: 'Matériel & Diagnostics',
    hubFilterDownloads: 'Téléchargements & Réseau',
    hubFilterDeals: 'Bons plans & API',
    hubFilterUtilities: 'Utilitaires & Guides',
    hubConfigureBtn: 'Configurer',
    hubHideConfigBtn: 'Masquer la config',
    hubPurposeLabel: 'À quoi sert cet outil',
    hubStatusReady: 'Prêt',
    hubStatusAttention: 'Action requise',
    hubStatusStandby: 'En veille',
    hubStatusBuiltin: 'Outil intégré',
    hubStatusWebPreview: 'App Bureau requise',
    toolQbitName: 'qBittorrent Web UI (API v2 / 5.0+)',
    toolQbitPurpose: 'Envoie les liens magnet et .torrent vers votre client qBittorrent local et suit les vitesses DL/UL, ETA et la file en direct.',
    toolPresentMonName: 'Intel PresentMon (FPS & Frame Time)',
    toolPresentMonPurpose: 'Capture les temps d’image DX11/DX12/Vulkan/OpenGL, les FPS 1%/0.1% Low et la charge GPU en jeu.',
    toolLhmName: 'LibreHardwareMonitorLib (Capteurs)',
    toolLhmPurpose: 'Moteur open-source MPL-2.0 mesurant températures CPU/GPU, fréquences, puissance, tensions VRM, SMART NVMe et ventilateurs.',
    toolCleanerName: 'Nettoyeur PC sécurisé & Optimiseur',
    toolCleanerPurpose: 'Analyse et nettoie en toute sécurité les fichiers temporaires Windows, caches d’applications, cache SecretArea, miniatures et shaders DirectX.',
    toolDealsApiName: 'Fournisseurs Bons plans & Critiques',
    toolDealsApiPurpose: 'Alimente Bons plans, Joueurs en direct et Notes via 6 API publiques gratuites plus 3 clés chiffrées optionnelles.',
    toolCanRunItName: 'Can Run It & Profil Matériel PC',
    toolCanRunItPurpose: 'Compare les prérequis CPU, GPU, VRAM, RAM et disque de chaque jeu à la configuration détectée ou personnalisée de votre PC.',
    toolBenchDbName: 'Benchmarks Matériel & Base de Données',
    toolBenchDbPurpose: 'Exécute des micro-benchmarks CPU/RAM/Stockage/Latence et maintient la base de référence matérielle (hardware-db.json).',
    toolHypervisorName: 'Guide Hyperviseur & Virtualisation',
    toolHypervisorPurpose: 'Guide pas à pas pour BIOS VT-x / AMD-V, Hyper-V et pilotes requis par certains titres.',
    toolSpinWheelName: 'Roue de la Fortune (À quoi jouer ?)',
    toolSpinWheelPurpose: 'Sélecteur aléatoire dans votre bibliothèque pour lancer immédiatement un jeu surprise.',
    toolUpdaterName: 'Mises à jour, Historique & Notifications',
    toolUpdaterPurpose: 'Vérifie les versions GitHub de SecretArea, affiche le journal complet et gère les alertes du catalogue.',
    specsAutoDetected: 'Détecté auto (Natif)',
    specsCustomOverride: 'Profil personnalisé',
    specsBrowserMode: 'Estimé (Navigateur)',
    specsRescanBtn: 'Réanalyser le PC',
    specsCustomizeBtn: 'Modifier les specs',
    specsSaveBtn: 'Enregistrer',
    specsResetAutoBtn: 'Rétablir auto',
    specsCpuLabel: 'Processeur (CPU)',
    specsGpuLabel: 'Carte graphique (GPU)',
    specsVramLabel: 'VRAM (Go)',
    specsRamLabel: 'Mémoire RAM (Go)',
    specsDiskFreeLabel: 'Espace libre (Go)',
    cleanerQuickScanBtn: 'Analyse rapide',
    cleanerQuickCleanBtn: 'Nettoyer la sélection',
    cleanerWebNote: 'Le nettoyage système nécessite l’application de bureau SecretArea.exe.',
    dbEntriesLabel: 'Entrées en base',
    dbVersionLabel: 'Version BD',
    dbCheckUpdateBtn: 'Vérifier MÀJ BD',
    openHardwareMonitorBtn: 'Ouvrir Moniteur matériel',
    openPcCleanerBtn: 'Ouvrir Nettoyeur complet',
    openBenchmarksBtn: 'Ouvrir Benchmarks & BD',
    openDealsBtn: 'Ouvrir Bons plans',
    openHypervisorBtn: 'Ouvrir Guide Hyperviseur',
    openSpinWheelBtn: 'Lancer la Roue',
    openUpdaterBtn: 'Vérifier les mises à jour',
  },
};

const ES: LauncherTranslations = {
  locale: 'es-ES',
  nav: {
    home: 'Inicio',
    library: 'Biblioteca',
    gameDeals: 'Ofertas',
    downloads: 'Descargas',
    extras: 'Extras',
    requests: 'Solicitudes',
    hardwareMonitor: 'Monitor de hardware',
    settings: 'Ajustes',
    switchLight: 'Cambiar a modo claro',
    switchDark: 'Cambiar a modo oscuro',
    lightLabel: 'Claro',
    darkLabel: 'Oscuro',
    selectLanguage: 'Seleccionar idioma',
    openMenu: 'Abrir menú de navegación',
    closeMenu: 'Cerrar menú de navegación',
    languageLabel: 'Idioma',
    themeLabel: 'Apariencia',
    spin: 'Ruleta',
  },
  topbar: {
    webVersion: 'SecretArea versión web',
    updatesTitle: 'Acerca de SecretArea y Buscar actualizaciones',
    enterFullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    muteSounds: 'Reproduciendo: PS5 Cosmic Horizon — Clic para silenciar',
    enableSounds: 'Activar música y sonidos PS5',
    muteXboxSounds: 'Reproduciendo: Xbox Nexus — Clic para silenciar',
    enableXboxSounds: 'Activar música y sonidos Xbox',
    offlineMode: 'Modo sin conexión',
    onlineMode: 'Modo en línea',
  },
  settings: {
    pageTitle: 'Ajustes',
    pageSubtitle: 'Personaliza el idioma, el inicio, la apariencia de la ventana y el paisaje sonoro.',
    resetDefaults: 'Restablecer',
    resetToast: 'Ajustes restablecidos a los valores predeterminados',
    languageSectionTitle: 'Idioma',
    languageSectionDesc: 'Elige el idioma de la interfaz y la dirección del texto en SecretArea.',
    rtlBadge: 'Derecha → Izquierda',
    ltrBadge: 'Izquierda → Derecha',
    startingSectionTitle: 'Inicio y cierre',
    startWithComputerTitle: 'Iniciar con tu computadora',
    startWithComputerDesc: 'Abre SecretArea en la bandeja del sistema al iniciar sesión en este equipo.',
    desktopSupportedBadge: 'Bandeja de Windows',
    webNotice: 'El inicio automático en bandeja se activa en la aplicación de escritorio SecretArea.exe.',
    trayActiveHint: 'Al cerrar la ventana, SecretArea permanecerá en la bandeja del sistema mientras esta opción esté activa.',
    canRunItTitle: 'Comprobación de hardware «Can Run It»',
    canRunItDesc: 'Compara juegos y herramientas con los requisitos de tu PC en Inicio, Biblioteca y fichas de juegos.',
    windowSectionTitle: 'Ventana',
    compactNavbarTitle: 'Barra de navegación compacta',
    compactNavbarDesc: 'Muestra la barra de navegación como iconos, incluso en una ventana ancha.',
    customCursorTitle: 'Cursor animado personalizado',
    customCursorDesc: 'Usa el cursor vectorial de escritorio con ondas al hacer clic, anillo al pasar y estados animados.',
    lightModeTitle: 'Modo Claro / Oscuro',
    lightModeDesc: 'Alterna entre el modo Claro y el modo Oscuro. Al activar el tema PS5 o Xbox vuelve al modo Oscuro.',
    darkModeBadge: 'Modo Oscuro',
    lightModeBadge: 'Modo Claro',
    alwaysPs5Title: 'Ejecutar siempre con tema PS5',
    alwaysPs5Desc: 'Mantén activo el tema zafiro de PlayStation 5 y su ambiente sonoro en todo el lanzador.',
    alwaysXboxTitle: 'Ejecutar siempre con tema Xbox',
    alwaysXboxDesc: 'Aplica el tema esmeralda de Xbox, el fondo de malla geométrica con orbe verde y sonidos de Xbox.',
    audioSectionTitle: 'Audio y sonido',
    audioSectionDesc: 'Activa o silencia por separado la música ambiental de PS5/Xbox y los clics de interfaz, y ajusta el volumen.',
    ambientMusicTitle: 'Música ambiental de fondo (PS5 / Xbox)',
    ambientMusicDesc: 'Reproduce la música ambiental espacial de PS5 o esmeralda de Xbox Nexus cuando hay un tema de consola activo.',
    uiSoundsTitle: 'Sonidos de clic y enfoque en la interfaz',
    uiSoundsDesc: 'Reproduce efectos nítidos al hacer clic con el cursor, toques de enfoque y retroceso en todos los temas.',
    volumeTitle: 'Volumen principal',
    volumeDesc: 'Ajusta el nivel de salida para los clics del cursor, música ambiental y efectos de sonido.',
    consoleThemeAudioHint: 'Los sonidos de clic están activos en todos los temas. Selecciona PS5 o Xbox arriba para escuchar música ambiental.',
    activeLabel: 'Activado',
    inactiveLabel: 'Desactivado',
    downloadSectionTitle: 'Descargas y almacenamiento',
    downloadFolderTitle: 'Carpeta de descargas predeterminada',
    downloadFolderDesc: 'Elige dónde guardar enlaces directos, archivos MediaFire, archivos Mega y descargas del navegador integrado.',
    chooseFolderBtn: 'Elegir carpeta',
    openFolderBtn: 'Abrir carpeta',
    torrentSectionTitle: 'Integración con qBittorrent (Web UI API v2)',
    torrentSectionDesc: 'Opcional: conecta SecretArea con qBittorrent Web UI local (API v2 / 5.0+) para añadir magnets y archivos .torrent y ver velocidad DL/UL, ETA y pausar/reanudar/eliminar.',
    torrentEnableTitle: 'Activar sincronización con qBittorrent Web UI',
    torrentEnableDesc: 'Sincroniza enlaces magnet y .torrent con qBittorrent local usando safeStorage. Los enlaces directos, MediaFire y Mega funcionan sin qBittorrent.',
    torrentAutoDetectBtn: 'Autodetectar',
    torrentDetectingBtn: 'Buscando...',
    torrentTestBtn: 'Probar conexión',
    torrentTestingBtn: 'Probando...',
    torrentSaveBtn: 'Guardar configuración',
    torrentSavingBtn: 'Guardando...',
    torrentStatusConnected: 'Conectado',
    torrentStatusDisconnected: 'Desconectado',
    torrentStatusTesting: 'Probando...',
    torrentNotInstalledTitle: 'No se detectó qBittorrent en este PC (Opcional)',
    torrentNotInstalledDesc: 'Las descargas directas, MediaFire, Mega y el navegador integrado funcionan sin qBittorrent. Instálalo solo si deseas seguimiento de magnets y .torrent.',
    torrentDownloadBtn: 'Descargar qBittorrent',
    torrentHostLabel: 'Host (Solo local)',
    torrentPortLabel: 'Puerto',
    torrentUsernameLabel: 'Usuario',
    torrentPasswordLabel: 'Contraseña',
    torrentPasswordSavedPlaceholder: 'Cifrada con safeStorage (dejar vacío para mantener)',
    torrentApiKeyLabel: 'API Key (Opcional · qBittorrent 5.2+)',
    torrentApiKeyPlaceholder: 'qbt_... (opcional)',
    torrentApiKeySavedPlaceholder: 'API Key guardada (dejar vacío para mantener)',
    torrentLoopbackNotice: 'Seguridad local: las conexiones Web UI se limitan a direcciones locales (127.0.0.1 / localhost / ::1) y nunca se exponen a redes externas.',
    torrentLoopbackError: 'El host debe ser una dirección local (127.0.0.1, localhost o ::1).',
    torrentGuideTitle: 'Cómo habilitar qBittorrent Web UI (Configuración manual)',
    torrentGuideStep1: '1. Abre qBittorrent en Windows y ve a Herramientas → Opciones → Web UI.',
    torrentGuideStep2: '2. Marca «Interfaz de usuario Web (Control remoto)», mantén la IP en 127.0.0.1 y el puerto en 8080.',
    torrentGuideStep3: '3. En Autenticación, configura Usuario y Contraseña (o una API Key qbt_ en qBittorrent 5.2.0+).',
    torrentGuideStep4: '4. Pulsa Aplicar y Aceptar en qBittorrent, escribe las credenciales arriba y guarda la configuración.',
    torrentGuideStep5: '5. Pulsa «Autodetectar» y «Probar conexión» para verificar la API Web UI v2.',
    torrentWebNotice: 'Modo vista web: el navegador no puede conectarse a qBittorrent local (127.0.0.1) ni usar safeStorage. Usa SecretArea.exe para probar y sincronizar.',
    torrentTestingWebPreviewMsg: 'Desconectado — La vista web no puede conectar con qBittorrent local.',
    torrentTestingWebPreviewHint: 'El navegador bloquea las solicitudes locales Web UI y safeStorage. Abre SecretArea.exe para probar y sincronizar qBittorrent.',
    modeDesktopBadge: 'App de Escritorio',
    modeWebPreviewBadge: 'Vista Web',
    torrentSavedToast: 'Configuración de qBittorrent guardada',
    torrentManageSetupBtn: 'Instalar / Actualizar qBittorrent',
    replaySetupBtn: 'Asistente inicial',
    closeBehaviorTitle: 'Comportamiento al cerrar',
    closeBehaviorDesc: 'Elige si al cerrar la ventana SecretArea se minimiza a la bandeja del sistema o se cierra por completo.',
    closeBehaviorMinimizeTray: 'Minimizar a la bandeja',
    closeBehaviorExit: 'Cerrar aplicación por completo',
    exitAppTitle: 'Cierre completo',
    exitAppDesc: 'Detiene inmediatamente los monitores de hardware y juego, quita el icono de la bandeja y cierra SecretArea.',
    exitAppBtn: 'Cerrar por completo',
    exitAppConfirmBtn: 'Confirmar cierre total',
    exitAppCancelBtn: 'Cancelar',
    exitAppWebHint: 'El cierre completo solo está disponible en SecretArea.exe.',
  },
  performance: {
    sectionTitle: 'Rendimiento y consumo de recursos',
    sectionSubtitle: 'Ajusta el uso de CPU, RAM, GPU y tareas en segundo plano en tiempo real y sin reiniciar.',
    liveApplyBadge: 'Aplicación inmediata',
    modeEcoTitle: 'Modo Eco',
    modeEcoDesc: 'Mínimo uso de CPU, RAM y GPU. Reduce efectos visuales continuos, espacia sondeos y pausa tareas al minimizar.',
    modeBalancedTitle: 'Modo Equilibrado',
    modeBalancedDesc: 'Perfil predeterminado. Mantiene animaciones fluidas y respuesta rápida reduciendo el consumo en reposo.',
    modePerformanceTitle: 'Modo Rendimiento',
    modePerformanceDesc: 'Prioriza máxima fluidez visual, actualizaciones rápidas de hardware/descargas y efectos completos sin desperdicio en reposo.',
    recommendedBadge: 'Predeterminado',
    activeBadge: 'Activo',
    advancedTitle: 'Controles avanzados de recursos',
    advancedDesc: 'Ajusta manualmente los intervalos de sondeo, efectos visuales y tareas en segundo plano.',
    pauseOnMinimizeTitle: 'Pausar telemetría al minimizar u ocultar la ventana',
    pauseOnMinimizeDesc: 'Suspende al instante sensores, animaciones ambientales y pings mientras la ventana esté oculta o en bandeja.',
    reduceEffectsTitle: 'Reducir desenfoque y animaciones continuas',
    reduceEffectsDesc: 'Desactiva brillos ambientales constantes y desenfoque de fondo pesado para aliviar la carga de GPU.',
    hwIntervalTitle: 'Frecuencia del Monitor de Hardware',
    hwIntervalDesc: 'Controla el intervalo de muestreo de sensores mientras la pestaña está abierta.',
    hwIntervalAuto: 'Auto (Según perfil)',
    dlThrottleTitle: 'Agrupación de estado de descargas',
    dlThrottleDesc: 'Controla con qué frecuencia las descargas activas actualizan la interfaz y guardan estado.',
    dlThrottleAuto: 'Auto (Según perfil)',
    adaptiveTorrentTitle: 'Sondeo adaptativo de qBittorrent',
    adaptiveTorrentDesc: 'Reduce automáticamente las consultas Web UI cuando no hay torrents activos.',
    deferSyncTitle: 'Espaciar comprobaciones en segundo plano',
    deferSyncDesc: 'Amplía el intervalo de sincronización de catálogo, precarga de imágenes y búsqueda de actualizaciones.',
    auditTitle: 'Huella de recursos en vivo',
    auditDesc: 'Lectura instantánea bajo demanda de procesos Electron y estado de tareas activas.',
    auditRefreshBtn: 'Medir ahora',
    auditMainCpuLabel: 'CPU proceso principal',
    auditMainHeapLabel: 'Heap JS principal',
    auditMainRssLabel: 'Memoria residente (RSS)',
    auditTotalProcessesLabel: 'Procesos de escritorio',
    auditHwMonitorLabel: 'Monitor de hardware',
    auditDownloadsLabel: 'Descargas activas',
    auditTorrentPollerLabel: 'Sondeo qBittorrent',
    auditStateActive: 'Activo',
    auditStatePausedHidden: 'Pausado (Oculto)',
    auditStateIdle: 'Inactivo / Detenido',
    auditStateOff: 'Desactivado',
    auditWebNote: 'Ejecutándose en vista web. La telemetría multiproceso completa está disponible en SecretArea.exe.',
    auditGpuProcessNote: 'La aceleración por hardware sigue activa de forma inteligente evitando renderizado GPU innecesario.',
  },
  customTheme: {
    sectionTitle: 'Creador de tema personalizado',
    sectionSubtitle: 'Diseña tu tema predeterminado eligiendo superficie, colores de acento, botones y bordes.',
    enableLabel: 'Activar tema personalizado',
    surfaceLabel: 'Superficie base',
    surfaceMidnight: 'Pizarra Nocturna',
    surfaceObsidian: 'Obsidiana Pura',
    surfaceAbyss: 'Abismo Profundo',
    surfaceDaylight: 'Luz Diurna',
    accentColorLabel: 'Color de acento',
    customHexLabel: 'Hex personalizado',
    buttonStyleLabel: 'Estilo de botones',
    btnRounded: 'Redondeado',
    btnPill: 'Píldora',
    btnSharp: 'Recto',
    cardRadiusLabel: 'Esquinas de tarjetas',
    cardSharp: 'Marcadas',
    cardMedium: 'Equilibradas',
    cardSoft: 'Suaves',
    glassBlurLabel: 'Desenfoque cristal',
    glassBlurDesc: 'Efecto translúcido sutil en paneles y tarjetas',
    previewLabel: 'Vista previa en vivo',
    previewTitle: 'Estilo personalizado SecretArea',
    previewPrimaryBtn: 'Acción principal',
    previewSecondaryBtn: 'Secundario',
    resetBtn: 'Restablecer tema',
    consoleOverrideNote: 'Nota: activar el tema personalizado desactiva el tema de consola PS5 / Xbox.',
    summaryCustomPrefix: 'Personalizado',
  },
  downloads: {
    pageTitle: 'Gestor de descargas',
    pageSubtitle: 'Controla enlaces directos, MediaFire, Mega, capturas del navegador integrado y transferencias qBittorrent.',
    quickAddPlaceholder: 'Pega un enlace directo, MediaFire, Mega o Magnet...',
    quickAddBtn: 'Añadir descarga',
    addTorrentFileBtn: 'Añadir .torrent',
    quickAddInvalid: 'Introduce una URL válida http://, https:// o magnet:?',
    folderLabel: 'Guardar en',
    chooseFolder: 'Elegir carpeta',
    openFolder: 'Abrir carpeta',
    clearFinished: 'Limpiar terminados',
    tabAll: 'Todos',
    tabActive: 'Activos',
    tabPaused: 'Pausados',
    tabCompleted: 'Completados',
    tabFailed: 'Fallidos',
    searchPlaceholder: 'Filtrar descargas...',
    metricActive: 'Activos',
    metricSpeed: 'Velocidad total',
    metricCompleted: 'Completados',
    metricFreeDisk: 'Espacio libre',
    statusQueued: 'En cola',
    statusResolving: 'Resolviendo enlace...',
    statusDownloading: 'Descargando',
    statusPaused: 'Pausado',
    statusCompleted: 'Completado',
    statusFailed: 'Error',
    statusCancelled: 'Cancelado',
    sourceDirect: 'Enlace directo',
    sourceMediafire: 'MediaFire',
    sourceMega: 'Mega',
    sourceQbittorrent: 'qBittorrent',
    sourceBrowser: 'Navegador integrado',
    actionPause: 'Pausar',
    actionResume: 'Reanudar',
    actionCancel: 'Cancelar',
    actionDelete: 'Eliminar',
    actionRetry: 'Reintentar',
    actionOpenFile: 'Abrir archivo',
    actionOpenFolder: 'Abrir carpeta',
    actionRemove: 'Eliminar',
    actionOpenExternal: 'Abrir externamente',
    peersLabel: 'Pares',
    seedsLabel: 'Semillas',
    unknownSize: 'Tamaño desconocido',
    etaCalculating: 'Calculando...',
    torrentConnected: 'qBittorrent conectado',
    torrentDisconnected: 'qBittorrent desconectado',
    torrentWebPreviewStatus: 'Vista web — La sincronización con qBittorrent requiere SecretArea.exe',
    configureTorrentBtn: 'Configurar qBittorrent',
    speedGraphTitle: 'Gráfico de velocidad',
    periodLabel: 'Período:',
    period1m: '1 minuto',
    period5m: '5 minutos',
    period30m: '30 minutos',
    period1h: '1 hora',
    totalUploadLabel: 'Subida total',
    totalDownloadLabel: 'Descarga total',
    sizeLabel: 'Tamaño',
    progressLabel: 'Progreso',
    statusLabel: 'Estado',
    downSpeedLabel: 'Vel. bajada',
    upSpeedLabel: 'Vel. subida',
    etaLabel: 'ETA',
    ratioLabel: 'Ratio',
    showGraphBtn: 'Mostrar gráfico',
    hideGraphBtn: 'Ocultar gráfico',
    emptyTitle: 'No hay descargas en esta vista',
    emptySubtitle: 'Pega cualquier enlace directo, MediaFire, Mega o magnet arriba, sube un archivo .torrent, o elige un canal desde la ficha de cualquier juego.',
    webNoticeTitle: 'Modo vista web',
    webNoticeBody: 'La pausa/reanudación, velocidad/ETA, captura integrada y sincronización con qBittorrent Web UI requieren la app de escritorio SecretArea.exe.',
    startedToast: 'Descarga añadida a la cola',
    failedToast: 'No se pudo iniciar la descarga',
    detailActiveTitle: 'Descargas de este lanzamiento',
    detailManageBtn: 'Abrir gestor de descargas',
    detailOpenExternal: 'Abrir en navegador externo',
    detailStartInApp: 'Descargar en SecretArea',
  },
  store: {
    featuredSpotlight: 'Destacado',
    latestRelease: 'Último lanzamiento',
    download: 'Descargar',
    watchTrailer: 'Ver tráiler',
    viewDetails: 'Detalles',
    exploreCatalog: 'Explorar catálogo',
    repackVsOriginal: 'Tamaño Repack vs Original',
    upcomingGames: 'Próximos juegos',
    recentGames: 'Juegos recientes',
    canRunTitle: '¿Puede correrlo? — Recomendado para tu PC',
    canRunSubtitle: 'Compara automáticamente Juegos, Hypervisor, SteamTools, PS5 y Herramientas con los requisitos de tu PC',
    scopeAll: 'Todo',
    scopeGames: 'Juegos',
    scopeHypervisor: 'Hypervisor',
    scopeSteamTools: 'SteamTools',
    scopePs5: 'PS5',
    scopeTools: 'Herramientas',
    canRunBtn: 'Compatible',
    cannotRunBtn: 'No compatible',
    scanPc: 'Escanear PC',
    gpuLabel: 'GPU',
    cpuLabel: 'CPU',
    ramLabel: 'RAM',
    freeDriveLabel: 'Libre',
    canRunEmptyFail: '¡Buenas noticias — tu PC cumple con los requisitos de todos los elementos de esta categoría!',
    canRunEmptyPass: 'No se encontraron elementos para el filtro seleccionado.',
    canRunCardPass: 'Compatible',
    mostPopularGames: 'Juegos más populares',
    showAll: 'Mostrar todo',
    hideHv: 'Ocultar HV',
    hideGames: 'Ocultar Juegos',
    newestFirst: 'Más recientes',
    nameAz: 'A – Z',
    pageOf: 'Página',
    previous: 'Anterior',
    next: 'Siguiente',
    seeMoreNext: 'Ver más · Siguientes',
    gameSingular: 'Juego',
    gamePlural: 'Juegos',
    backToPage1: 'Volver a pág. 1',
    topStudios: 'Mejores estudios',
    viewAllStudios: 'Ver todos los estudios',
    bestTwoPlayers: 'Mejores juegos para dos jugadores',
    noCatalogLoaded: 'No hay elementos cargados.',
  },
  library: {
    sectionLabel: 'Sección',
    genresIn: 'Géneros en',
    allGenres: 'Todos los géneros',
    reset: 'Restablecer',
    allCountLabel: 'TODO',
    hide: 'Ocultar',
    show: 'Mostrar',
    noMatchingTitles: 'No se encontraron títulos.',
    sortBy: 'Ordenar por',
    sortSmart: 'Orden inteligente (Top y Nuevos)',
    sortLatest: 'Más recientes',
    sortAz: 'Nombre: A → Z',
    sortZa: 'Nombre: Z → A',
    sortFavorites: 'Favoritos primero',
    sortSizeAsc: 'Tamaño: menor a mayor',
    sortSizeDesc: 'Tamaño: mayor a menor',
    sortMirrors: 'Más canales de descarga',
    canRunAll: 'Compatibilidad PC: Todo',
    canRunPass: '✓ Funciona en este PC',
    canRunFail: '✕ No funciona (PC débil)',
    clear: 'Limpiar',
    searchPlaceholder: 'Búsqueda inteligente',
    emptyTitle: 'Ningún elemento coincide con tus filtros',
    emptySubtitle: 'Prueba limpiar la búsqueda, el filtro de género o cambiar de sección.',
    previous: 'Anterior',
    next: 'Siguiente',
    next50: 'Siguientes 50',
    backToPage1: 'Volver a pág. 1',
    pageOf: 'Página',
    newToLibrary: 'NUEVO',
    pinned: 'Fijado',
    free: 'Gratis',
    canRunCard: '✓ Funciona en este PC',
  },
  extras: {
    upcomingList: 'Lista próxima',
    trailers: 'Tráileres',
    bestSeries: 'Mejores sagas',
    topOpenWorld: 'Top juegos Open World',
    videosLabel: 'Videos',
    titleSingular: 'Título',
    titlePlural: 'Títulos',
    platforms: 'Plataformas',
    watchTrailer: 'Ver tráiler',
    noTrailer: 'No hay URL de tráiler disponible.',
    back: 'Volver',
    seriesPosters: 'Pósteres de la saga',
    gamesInSeries: 'Juegos en la saga',
    bestBadge: 'Mejor',
  },
  requests: {
    pageTitle: 'Solicitudes de juegos y herramientas',
    formTitle: 'Enviar una solicitud al catálogo',
    formSubtitle: 'Solicita repacks faltantes, parches recientes, DLCs o reporta enlaces caídos.',
    titleLabel: 'Título',
    titlePlaceholder: 'ej., Ghost of Yotei o Forza Horizon 6',
    categoryLabel: 'Categoría',
    coverUrlLabel: 'URL de portada (Opcional)',
    detailsLabel: 'Detalles / Notas',
    detailsPlaceholder: 'Incluye repacker preferido, versión específica o DLCs...',
    sending: 'Enviando...',
    submitRequest: 'Enviar solicitud',
    recentRequests: 'Solicitudes recientes',
    noRequestsYet: 'Aún no hay solicitudes enviadas.',
    syncedNotice: '¡Solicitud enviada y guardada en la cola del catálogo!',
    localNotice: 'Solicitud guardada en tu cola local.',
    communitySupportTitle: 'Comunidad y Apóyanos',
    joinCommunityTitle: 'Únete a nuestra comunidad',
    joinCommunityDesc: 'Recibe alertas de lanzamientos, respuestas a solicitudes y soporte directo en Telegram y Discord.',
    telegramLabel: 'Comunidad Telegram',
    telegramSub: 'Novedades, estrenos y chat rápido',
    discordLabel: 'Comunidad Discord',
    discordSub: 'Soporte en vivo y comunidad',
    joinBtn: 'Unirse',
    supportBadge: 'Apoyar SecretArea',
    supportHeadline: 'Apoya nuestra misión y ayúdanos a crecer',
    supportDesc: 'Cada contribución mantiene el lanzador SecretArea, el catálogo y las solicitudes gratuitos para todos.',
    anonMonero: 'Anónimo · Cripto y Monero (XMR)',
    openInBrowser: 'Abrir en el navegador',
  },
  studios: {
    backToHome: 'Volver al inicio',
    topStudios: 'Mejores estudios',
    searchPlaceholder: 'Buscar estudios...',
    noMatch: 'Ningún estudio coincide con la búsqueda.',
    gameSingular: 'Juego',
    gamePlural: 'Juegos',
    aboutStudio: 'Sobre este estudio',
    noOverview: 'Sin descripción disponible en el catálogo.',
    all: 'Todo',
    back: 'Volver',
    totalTitleSingular: 'Título en total',
    totalTitlePlural: 'Títulos en total',
    noItemsInCategory: 'No hay títulos en esta categoría.',
    previous: 'Anterior',
    next: 'Siguiente',
    next20Games: 'Siguientes 20 juegos',
    pageOf: 'Página',
  },
  detail: {
    back: 'Volver',
    home: 'Inicio',
    releaseDetails: 'Detalles del lanzamiento',
    gameId: 'ID del juego',
    version: 'Versión',
    originalSize: 'Tamaño original',
    downloadSize: 'Tamaño descarga',
    repackSize: 'Tamaño Repack',
    downloadChannels: 'Canales de descarga',
    channelSingular: 'Canal',
    channelPlural: 'Canales',
    license: 'Licencia',
    pinned: 'Fijado',
    standard: 'Estándar',
    free: 'Gratis',
    dateAdded: 'Fecha añadido',
    developerStudio: 'Estudio desarrollador',
    repacker: 'Repacker',
    languages: 'Idiomas',
    genres: 'Géneros',
    watchTrailer: 'Ver tráiler',
    trailerGallery: 'Tráiler y Galería',
    switchToTrailer: 'Ir al tráiler',
    openTrailer: 'Abrir tráiler',
    description: 'Descripción',
    noDescription: 'No hay descripción disponible.',
    requirementsAndCanRun: 'Requisitos y Compatibilidad',
    requirementsOnly: 'Requisitos del sistema',
    tools: 'Herramientas',
    steps: 'Pasos de instalación',
    completed: 'completados',
    linkedEntries: 'Entradas vinculadas',
    hvWarningTitle: '¿Qué es un bypass Hypervisor?',
    hvWarningBody: 'Lee este artículo antes de descargar e instalar:',
    noChannels: 'No hay enlaces de descarga disponibles.',
    recommendedTag: 'Recomendado',
    recommendedForYou: 'Recomendado para ti',
    canRunItTitle: '¿Puede correrlo?',
    thisPcAuto: 'Este PC (Auto)',
    customPc: 'PC personalizado',
    detectedPc: 'PC detectado',
    thisPcVsMinimum: 'Este PC vs mínimo',
    scan: 'Escanear',
    myPc: 'Mi PC',
    close: 'Cerrar',
    yourPcCanRun: 'Tu PC · Compatibilidad',
    runsWell: 'Funciona bien',
    cantRun: 'No funciona',
    checkSpecs: 'Ver requisitos',
    weakPrefix: 'Débil',
    estimated: 'estimado',
    needsPrefix: 'requiere',
    pcSpecsHeading: 'Especificaciones de tu PC',
    resetAuto: 'Restablecer autodetección',
    gpuInput: 'Gráficos (GPU)',
    cpuInput: 'Procesador (CPU)',
    ramInput: 'RAM (GB)',
    spaceInput: 'Espacio libre en disco (GB, opcional)',
    cancel: 'Cancelar',
    compareSpecs: 'Comparar',
    osLabel: 'Sistema operativo',
    ramLabel: 'Memoria / RAM',
    cpuLabel: 'Procesador / CPU',
    gpuLabel: 'Gráficos / GPU',
    noReqsListed: 'No se especifican requisitos de hardware.',
    positive: 'Positivo',
    negative: 'Negativo',
  },
  qbitSetup: {
    modalTitle: 'Instalación automática de qBittorrent',
    modalSubtitle: 'Detección en Windows, actualización oficial verificada y configuración local de Web UI.',
    stepChecking: 'Comprobando dependencias...',
    stepDetecting: 'Detectando qBittorrent...',
    stepDownloading: 'Descargando qBittorrent...',
    stepVerifying: 'Verificando instalador...',
    stepInstalling: 'Instalando qBittorrent...',
    stepConfiguring: 'Configurando integración...',
    stepCompleted: 'Configuración completada.',
    installedLabel: 'Instalado',
    notInstalledValue: 'No instalado',
    latestLabel: 'Última versión oficial',
    processLabel: 'Proceso',
    processRunning: 'En ejecución',
    processStopped: 'Detenido',
    statusUpToDate: 'Tu versión de qBittorrent ya está actualizada. No es necesario reinstalar.',
    statusNewerInstalled: 'Ya tienes instalada una versión más reciente. SecretArea nunca la degradará.',
    statusUpdateAvailable: 'Hay una nueva actualización estable oficial de qBittorrent lista para instalar.',
    statusNotInstalled: 'No se detectó qBittorrent en este PC. SecretArea puede descargar el instalador oficial de 64 bits, verificar su SHA-256 y firma, e instalarlo.',
    statusRunningBlocked: 'qBittorrent está abierto actualmente. Ciérralo para no interrumpir tus torrents y luego pulsa Comprobar de nuevo.',
    statusLookupFailed: 'No se pudo obtener la última versión oficial en este momento.',
    consentNote: 'Al pulsar Instalar/Actualizar, SecretArea descarga el instalador oficial x64 desde GitHub/qbittorrent.org y verifica su integridad SHA-256 antes de ejecutarlo.',
    installBtn: 'Descargar e instalar qBittorrent',
    updateBtn: 'Actualizar qBittorrent ahora',
    recheckBtn: 'Comprobar de nuevo',
    retryBtn: 'Reintentar',
    skipBtn: 'Ahora no',
    closeBtn: 'Listo',
    officialDownloadBtn: 'Descarga oficial',
    launchQbitBtn: 'Abrir qBittorrent',
    shaVerifiedLabel: 'SHA-256 verificado',
    sigVerifiedLabel: 'Firma del editor verificada',
    unsignedVerifiedNote: 'Instalador FOSS (sin firma) · SHA-256 oficial verificado',
    webUiSectionTitle: 'Configuración de Web UI (solo 127.0.0.1)',
    webUiDetectedEnabled: 'La Web UI está habilitada en la configuración de qBittorrent.',
    webUiNotEnabledHint: 'La Web UI aún no está activa. Sigue estos pasos en qBittorrent y luego verifica la conexión:',
    webUiLoopbackWarning: 'La IP de la Web UI no está limitada a 127.0.0.1. Cambia la IP a 127.0.0.1 en qBittorrent.',
    webUiGuide1: '1. Abre qBittorrent → Herramientas → Opciones → Web UI.',
    webUiGuide2: '2. Marca «Interfaz Web (Control remoto)».',
    webUiGuide3: '3. Establece la dirección IP en 127.0.0.1 y el puerto en 8080.',
    webUiGuide4: '4. Configura un Usuario y Contraseña y pulsa Aplicar / Aceptar.',
    webUiGuide5: '5. Introduce esas credenciales abajo y pulsa Guardar y verificar conexión.',
    generatePasswordBtn: 'Generar contraseña segura',
    saveAndVerifyBtn: 'Guardar y verificar',
    verifyingBtn: 'Verificando...',
    webUiConnectedMsg: '¡Conectado y verificado! SecretArea está listo para enlaces magnet y archivos .torrent.',
    openSettingsBtn: 'Abrir Ajustes',
    webPreviewNotice: 'La instalación automática funciona en SecretArea.exe para Windows. En la vista Web usa el enlace oficial.',
  },
  presentMonSetup: {
    sectionTitle: 'Intel PresentMon (Motor de FPS y Frame Time)',
    sectionSubtitle: 'Detección automática, actualizaciones desde GitHub Releases y verificación SHA-256 y de firma Intel.',
    modalTitleInstall: 'Activar monitorización de rendimiento en juegos',
    modalTitleUpdate: 'Actualizar Intel PresentMon',
    modalTitleRepair: 'Reparar instalación de PresentMon',
    modalTitleManage: 'Gestor de dependencias Intel PresentMon',
    modalSubtitle: 'Motor oficial de telemetría ETW gestionado automáticamente por SecretArea Desktop.',
    benefitsHeading: 'Qué habilita PresentMon en SecretArea',
    benefit1: 'FPS en tiempo real, 1% Low y 0.1% Low mediante ETW sin inyección en juegos',
    benefit2: 'Registro de frame time, picos, tirones y latencia de visualización',
    benefit3: 'Correlación CPU/GPU y diagnóstico de cuellos de botella por sesión',
    stepChecking: 'Comprobando instalación y última versión oficial en GitHub...',
    stepDownloading: 'Descargando binario oficial PresentMon x64...',
    stepVerifying: 'Verificando resumen SHA-256 y firma de Intel...',
    stepInstalling: 'Instalando y validando compatibilidad CLI...',
    stepCompleted: 'PresentMon está instalado, verificado y listo para capturar FPS.',
    stepCancelled: 'Descarga cancelada limpiamente.',
    statusReady: 'Instalado y listo',
    statusNotInstalled: 'No instalado',
    statusUpdateAvailable: 'Actualización disponible',
    statusRepairRequired: 'Reparación necesaria',
    statusNewerInstalled: 'Actualizado (compilación local más reciente)',
    statusDeclined: 'Omitido por el usuario',
    statusChecking: 'Comprobando...',
    statusWebPreview: 'Solo Windows Desktop',
    installedVersionLabel: 'Versión instalada',
    latestVersionLabel: 'Última oficial',
    downloadSizeLabel: 'Tamaño de descarga',
    installPathLabel: 'Ruta de instalación',
    sourceLabel: 'Fuente oficial',
    notInstalledValue: 'No instalado',
    allowInstallBtn: 'Permitir e instalar',
    notNowBtn: 'Ahora no',
    updateNowBtn: 'Actualizar ahora',
    laterBtn: 'Más tarde',
    repairBtn: 'Reparar instalación',
    reinstallBtn: 'Reinstalar PresentMon',
    checkUpdatesBtn: 'Buscar actualizaciones',
    checkingBtn: 'Comprobando...',
    cancelDownloadBtn: 'Cancelar',
    retryBtn: 'Reintentar',
    doneBtn: 'Listo',
    officialReleasesBtn: 'GitHub Releases',
    enablePresentMonBtn: 'Instalar / Activar PresentMon',
    managePresentMonBtn: 'Gestionar PresentMon',
    shaVerifiedLabel: 'SHA-256 verificado',
    sigVerifiedLabel: 'Firma de Intel Corporation verificada',
    consentNote: 'SecretArea nunca descarga ni instala PresentMon sin tu aprobación explícita. Los archivos se descargan solo por HTTPS desde GitHub Releases y se verifican por SHA-256 y firma Intel.',
    runningConflictMsg: 'Hay otro proceso PresentMon abierto. Ciérralo y vuelve a intentarlo.',
    corruptedIssuePrefix: 'Problema detectado',
    declinedBannerTitle: 'Monitorización FPS con PresentMon omitida',
    declinedBannerDesc: 'SecretArea sigue funcionando normalmente con métricas de CPU, GPU, RAM, disco y ping. Puedes instalar PresentMon cuando quieras.',
    lookupErrorMsg: 'No se pudo consultar GitHub Releases para PresentMon en este momento.',
  },
  onboarding: {
    stepWelcome: 'Bienvenida',
    stepAppearance: 'Tema e idioma',
    stepQbitCheck: 'qBittorrent',
    stepQbitIntegration: 'Integración',
    stepReady: 'Listo',
    firstTimeNotice: 'Configuración única tras instalar',
    welcomeEyebrow: 'SecretArea Desktop',
    welcomeTitle: 'Bienvenido a SecretArea',
    welcomeSubtitle: 'Personaliza tu estilo, idioma y herramientas de descarga en menos de un minuto antes de entrar en el lanzador.',
    welcomeFeature1Title: '01. Tema e Idioma',
    welcomeFeature1Desc: 'Elige Oscuro, Claro, PlayStation 5, Xbox Nexus o crea tu Tema Personalizado en 4 idiomas.',
    welcomeFeature2Title: '02. Scan qBittorrent',
    welcomeFeature2Desc: 'Detecta instalaciones previas en tu PC o instala automáticamente la versión oficial de 64 bits.',
    welcomeFeature3Title: '03. Sync y PresentMon',
    welcomeFeature3Desc: 'Conecta la Web UI local cifrada, recibe alertas del catálogo y activa Intel PresentMon para medir FPS reales.',
    getStartedBtn: 'Comenzar',
    skipAllBtn: 'Ir a la aplicación',
    appearanceTitle: 'Personaliza tema e idioma',
    appearanceSubtitle: 'Cada cambio se aplica en vivo. Podrás ajustarlo en cualquier momento desde Ajustes.',
    themePickerLabel: 'Tema del lanzador',
    languagePickerLabel: 'Idioma de la interfaz',
    themeDarkName: 'Modo Oscuro',
    themeDarkDesc: 'Interfaz pizarra oscura de alto contraste',
    themeLightName: 'Modo Claro',
    themeLightDesc: 'Espacio diurno limpio y luminoso',
    themePs5Name: 'PlayStation 5',
    themePs5Desc: 'Aurora zafiro y sonido ambiental de consola',
    themeXboxName: 'Xbox Nexus',
    themeXboxDesc: 'Malla esmeralda y brillo clásico Xbox',
    settingsEditableNote: 'También puedes ajustar sonido, barra y temas más tarde en Ajustes.',
    backBtn: 'Atrás',
    continueBtn: 'Continuar',
    qbitCheckTitle: 'Comprobación de qBittorrent',
    qbitCheckSubtitle: 'SecretArea analiza tu equipo para respetar instalaciones previas de qBittorrent.',
    scanningText: 'Buscando una instalación existente de qBittorrent...',
    alreadyInstalledTitle: 'qBittorrent ya está instalado en este equipo',
    alreadyInstalledDesc: '¡Genial! Como qBittorrent ya estaba instalado antes de SecretArea, continúa al siguiente paso para añadir los ajustes de integración.',
    goIntegrationBtn: 'Configurar integración qBittorrent',
    updateFirstBtn: 'Actualizar qBittorrent primero',
    notInstalledTitle: 'qBittorrent aún no está instalado',
    notInstalledDesc: 'Instala automáticamente la versión oficial de 64 bits verificada y pasa directo a los ajustes de integración.',
    installAndNextBtn: 'Instalar qBittorrent y continuar',
    installCompleteAdvanceMsg: '¡qBittorrent instalado y verificado! Pasando a integración...',
    skipTorrentBtn: 'Omitir por ahora (solo descargas directas)',
    integrationTitle: 'Ajustes de integración qBittorrent',
    integrationSubtitle: 'Añade tus credenciales locales de Web UI para sincronizar velocidad, seeds, peers, ETA y progreso.',
    hostLoopbackHint: 'Bloqueado en 127.0.0.1 (solo local) y guardado cifrado con Electron safeStorage.',
    finishSetupBtn: 'Finalizar configuración',
    skipIntegrationBtn: 'Configurar luego en Ajustes',
    finalizingPhase1: 'Guardando tema e idioma...',
    finalizingPhase2: 'Preparando descargas y torrent...',
    finalizingPhase3: '¡Verificaciones listas!',
    congratsEyebrow: 'Configuración completada',
    congratsTitle: '¡Felicidades! SecretArea Desktop está listo.',
    congratsSubtitle: 'Listo para descargas rápidas y telemetría FPS en vivo.',
    summaryThemeLabel: 'Tema activo',
    summaryLanguageLabel: 'Idioma',
    summaryTorrentLabel: 'qBittorrent',
    summaryTorrentConnected: 'Conectado y verificado',
    summaryTorrentInstalled: 'Instalado (Configurar en Ajustes)',
    summaryTorrentSkipped: 'Omitido (Opcional)',
    changeLaterHint: 'Puedes cambiar tema, idioma, carpeta o qBittorrent cuando quieras desde Ajustes.',
    enterAppBtn: 'Entrar en SecretArea',
    openSettingsPageBtn: 'Ver en Ajustes',
    whatIsSecretAreaTitle: '¿Qué es SecretArea?',
    whatIsSecretAreaBody: 'Nuestro objetivo es simple : reunir los mejores juegos en un solo lugar para que dediques menos tiempo a buscar y más tiempo a jugar.',
    whatIsSecretAreaPoint1: 'Explora Juegos, Hypervisor, SteamTools, PS5, Herramientas y Partidas con análisis «Can Run It» y telemetría FPS en vivo.',
    whatIsSecretAreaPoint2: 'Descarga con pausa y reanudación en enlaces directos, MediaFire, Mega y navegador integrado, además de sincronización opcional con qBittorrent.',
    whatIsSecretAreaPoint3: 'Cambia entre Oscuro, Claro, PS5, Xbox Nexus o tu Tema Personalizado en 4 idiomas (incluido árabe RTL) con Notificaciones e Historial.',
    whatIsSecretAreaPoint4: 'Intel PresentMon (Opcional): usa la telemetría oficial firmada de Intel PresentMon ETW para medir FPS reales, 1% Low y frame time sin inyectar juegos — te pedirá permiso antes de instalarlo.',
    presentMonNotice: 'Sobre PresentMon: al entrar a la app, SecretArea puede pedir permiso para instalar Intel PresentMon (opcional) y medir FPS reales y frame time en el Monitor de Hardware.',
    readySummaryHeading: 'Resumen del entorno',
    readyClickToEdit: 'Pulsa para editar',
    readyLaunchHeading: 'Inicio inteligente',
    readyDestinationHint: 'Vista inicial',
    readyStartStoreTitle: 'Tienda y Catálogo',
    readyStartStoreDesc: 'Juegos, herramientas y descargas',
    readyStartSettingsTitle: 'Ajustes e Integraciones',
    readyStartSettingsDesc: 'Rutas, audio y Web UI',
    presentMonShortLabel: 'Intel PresentMon',
    presentMonShortDesc: 'Aviso FPS opcional al abrir',
    readyEditableShortLabel: 'Siempre editable',
    readyEditableShortDesc: 'Temas, idioma y rutas abiertos',
    readyStatusDone: 'Listo',
    readyStatusSyncing: 'Sync',
    stepGuideLabel: 'Qué hace este paso',
    step1Guide: 'Este asistente rápido de 5 pasos presenta qué es SecretArea, te permite dejar listos tema, idioma y motor torrent, y explica la telemetría FPS de Intel PresentMon.',
    step2Guide: 'Elige un tema base o usa el Creador de tema personalizado para ajustar colores, botones y bordes junto con tu idioma en tiempo real.',
    step3Guide: 'SecretArea analiza tu equipo para saber si qBittorrent ya está instalado y conservar tu configuración actual, o instalar la versión oficial.',
    step4Guide: 'Conecta SecretArea con la Web UI local (solo 127.0.0.1) para ver velocidad DL/UL, semillas, pares, ETA y ratio en enlaces magnet y .torrent.',
    step5Guide: 'Revisa el resumen de tu configuración inicial. Todos estos ajustes se pueden modificar en cualquier momento desde Ajustes.',
    platformHint: 'Diseño adaptable a pantallas pequeñas y grandes',
  },
  updater: {
    title: 'Acerca de y Actualizaciones',
    subtitle: 'SecretArea Desktop',
    currentVersionLabel: 'Versión instalada actual',
    checkBtn: 'Buscar actualizaciones',
    checkingBtn: 'Buscando...',
    upToDateMsg: 'Ya tienes la última versión instalada.',
    checkingMsg: 'Comprobando nuevas versiones en GitHub Releases...',
    newVersionAvailable: 'Nueva versión disponible',
    whatsNewTitle: 'Qué hay de nuevo en esta actualización',
    whatsNewCountSuffix: 'cambios',
    categoryFeature: 'Nuevo',
    categoryImprovement: 'Mejorado',
    categoryFix: 'Corregido',
    downloadUpdateBtn: 'Descargar actualización',
    downloadingPrefix: 'Descargando',
    readyToInstall: 'está lista para instalar',
    readyToInstallDesc: 'Pulsa Instalar y reiniciar para actualizar desde tu versión anterior ahora, o posponer para seguir usando SecretArea.',
    installRestartBtn: 'Instalar y reiniciar',
    postponeBtn: 'Posponer',
    laterBtn: 'Más tarde',
    detailsBtn: 'Novedades',
    toastUpdateAvailable: 'Actualización disponible',
    toastUpdateReady: 'Actualización lista',
    toastDownloading: 'Descargando',
    installedVersionLabel: 'Versión instalada',
    restartHint: 'Reinicia SecretArea para completar la instalación.',
    lastCheckedLabel: 'Última comprobación',
    errorFallback: 'No se pudo comprobar si hay actualizaciones ahora.',
    preparingDownload: 'Preparando descarga...',
  },
  hardware: {
    pageTitle: 'Monitor de hardware',
    pageSubtitle: 'Telemetría del sistema en tiempo real: temperaturas, discos, memoria y red.',
    startMonitoring: 'Iniciar monitoreo',
    stopMonitoring: 'Detener monitoreo',
    refreshNow: 'Actualizar',
    statusActive: 'Monitoreo activo',
    statusStopped: 'Monitoreo pausado',
    statusWebPreview: 'Vista web',
    intervalLabel: 'Intervalo',
    interval1s: '1s',
    interval1500ms: '1.5s',
    interval2s: '2s',
    interval3s: '3s',
    interval5s: '5s',
    naValue: 'N/D',
    unsupportedHint: 'Sensor no compatible en este sistema',
    webPreviewTitle: 'Se requiere la app de escritorio',
    webPreviewBody: 'La vista previa web no puede leer sensores del hardware. Abre SecretArea Desktop para ver CPU, GPU, RAM, almacenamiento y red en tiempo real.',
    sectionOverview: 'Resumen del sistema',
    sectionPerformance: 'Rendimiento en vivo',
    sectionDetails: 'Detalles del hardware',
    cpuTitle: 'Procesador (CPU)',
    gpuTitle: 'Gráficos (GPU)',
    ramTitle: 'Memoria (RAM)',
    storageTitle: 'Almacenamiento',
    networkTitle: 'Actividad de red',
    modelLabel: 'Modelo',
    manufacturerLabel: 'Fabricante',
    usageLabel: 'Uso',
    temperatureLabel: 'Temperatura',
    clockSpeedLabel: 'Frecuencia',
    coresThreadsLabel: 'Núcleos / Hilos',
    coresUnit: 'Núcleos',
    threadsUnit: 'Hilos',
    powerLabel: 'Consumo',
    perCoreUsageLabel: 'Carga por hilo lógico',
    vramLabel: 'Uso de VRAM',
    fanSpeedLabel: 'Ventilador',
    noGpuDetected: 'No se detectó telemetría de GPU.',
    totalRamLabel: 'RAM total',
    usedRamLabel: 'RAM usada',
    availableRamLabel: 'RAM disponible',
    memoryTypeLabel: 'Tipo de memoria',
    memorySpeedLabel: 'Velocidad',
    driveTypeLabel: 'Tipo',
    capacityLabel: 'Capacidad total',
    usedSpaceLabel: 'Espacio usado',
    freeSpaceLabel: 'Espacio libre',
    readSpeedLabel: 'Lectura',
    writeSpeedLabel: 'Escritura',
    noStorageDetected: 'No se detectaron unidades de almacenamiento.',
    activeInterfaceLabel: 'Interfaz activa',
    linkStateLabel: 'Estado',
    linkSpeedLabel: 'Velocidad de enlace',
    downloadSpeedLabel: 'Descarga',
    uploadSpeedLabel: 'Subida',
    totalRxLabel: 'Total recibido',
    totalTxLabel: 'Total enviado',
    noNetworkDetected: 'No hay interfaz de red activa.',
    uptimeLabel: 'Tiempo activo',
    hostLabel: 'Equipo',
    chartCpuRamTitle: 'Uso de CPU y RAM (%)',
    chartGpuTempTitle: 'Carga GPU (%) y Temperaturas (°C)',
    chartNetworkTitle: 'Actividad de red',
    chartCpuLoad: 'Uso CPU',
    chartRamLoad: 'Uso RAM',
    chartGpuLoad: 'Uso GPU',
    chartCpuTemp: 'Temp. CPU',
    chartGpuTemp: 'Temp. GPU',
    chartNetDownload: 'Descarga',
    chartNetUpload: 'Subida',
    peakLabel: 'Pico',
    avgLabel: 'Prom.',
    lastUpdatedLabel: 'Última lectura',
    tabOverview: 'Telemetría del sistema',
    tabGaming: 'Juegos y cuellos de botella',
    tabTechnologies: 'Tecnologías GPU, Pantalla y Portátil',
    tabCleaner: 'Limpiador de PC',
    cpuSeriesLabel: 'Serie',
    cpuGenerationLabel: 'Generación',
    ramChannelsLabel: 'Canales RAM',
    ramSlotsLabel: 'Ranuras activas',
    gamingTitle: 'Monitor de rendimiento en juegos',
    gamingSubtitle: 'Captura de FPS y Frame Time por sesión (PresentMon ETW), ping real, correlación de hardware y análisis multimuestra.',
    gamingSelectProcess: 'Juego / Proceso objetivo',
    gamingAllProcesses: 'Ventana activa en primer plano',
    gamingRefreshProcesses: 'Actualizar procesos',
    gamingPingHost: 'Host de prueba Ping',
    gamingStartSession: 'Iniciar sesión',
    gamingStopSession: 'Detener sesión',
    gamingSessionActive: 'Sesión activa',
    gamingSessionDuration: 'Duración',
    gamingPresentMonMissingTitle: 'PresentMon ETW no instalado — FPS en N/D',
    gamingPresentMonMissingDesc: 'SecretArea nunca simula FPS ni inyecta overlays. Coloca PresentMon.exe en resources/bin/PresentMon.exe o %LOCALAPPDATA%\\Intel\\PresentMon para leer FPS reales, 1% Low y Frame Time.',
    gamingPresentMonReady: 'PresentMon ETW listo',
    gamingFpsCurrent: 'FPS actuales',
    gamingFpsAvg: 'FPS promedio',
    gamingFps1Low: 'FPS 1% Low',
    gamingFps01Low: 'FPS 0.1% Low',
    gamingFpsMax: 'FPS máximos',
    gamingFrameTimeAvg: 'Frame Time prom.',
    gamingFrameTimeP95: 'Frame Time P95',
    gamingFramePacing: 'Estabilidad de pacing',
    gamingSpikes: 'Picos',
    gamingStutters: 'Tirones',
    gamingDroppedFrames: 'Cuadros perdidos',
    gamingFrameTimeChartTitle: 'Historial de Frame Time en vivo (ms)',
    gamingNetworkLatencyTitle: 'Red y estado térmico',
    gamingPingLabel: 'Ping ICMP',
    gamingPacketLossLabel: 'Pérdida de paquetes',
    gamingInputLatencyLabel: 'Latencia de entrada',
    gamingThrottlingLabel: 'Estrangulamiento térmico',
    gamingThrottlingDetected: 'Throttling detectado',
    gamingThrottlingNormal: 'Temperaturas normales',
    gamingBottleneckTitle: 'Análisis de cuellos de botella multimuestra',
    gamingBottleneckWarming: 'Recopilando muestras base (se requieren al menos 5 muestras consecutivas)...',
    gamingHistoryTitle: 'Historial local de sesiones',
    gamingHistoryEmpty: 'Aún no hay sesiones guardadas. Inicia y detén una sesión para registrar métricas.',
    gamingClearHistory: 'Borrar historial',
    gamingCompareTitle: 'Comparar dos sesiones',
    gamingCompareSelectA: 'Sesión A',
    gamingCompareSelectB: 'Sesión B',
    techTitle: 'Tecnologías gráficas y capacidades del hardware',
    techSubtitle: 'Compatibilidad verificada de NVIDIA, AMD e Intel. Las funciones por juego nunca se muestran como activas globalmente sin confirmación.',
    techStatusSupported: 'Compatible',
    techStatusDetected: 'Detectado',
    techStatusActive: 'Activo',
    techStatusUnsupported: 'No compatible',
    techStatusUnavailable: 'No disponible',
    techStatusRequiresGame: 'Requiere soporte del juego',
    techStatusRequiresDriver: 'Requiere driver / SDK',
    techArchitectureLabel: 'Arquitectura',
    techDriverLabel: 'Versión de driver',
    techRebarLabel: 'Resizable BAR / SAM',
    displayTitle: 'Pantalla y ajustes de juego Windows',
    displayPrimaryLabel: 'Pantalla principal',
    displayResolutionLabel: 'Resolución',
    displayRefreshRateLabel: 'Frecuencia',
    displayConnectionLabel: 'Conexión',
    displayActiveGpuLabel: 'GPU de renderizado',
    displayDirectXLabel: 'DirectX',
    displayHagsLabel: 'Programación GPU por hardware (HAGS)',
    displayGameModeLabel: 'Modo de juego Windows',
    displayHdrLabel: 'HDR',
    displayVrrLabel: 'VRR / Sync adaptativa',
    laptopTitle: 'Batería y energía de portátil',
    laptopBatteryLabel: 'Batería',
    laptopPowerStateLabel: 'Fuente de energía',
    laptopPluggedIn: 'Conectado a corriente',
    laptopOnBattery: 'Con batería',
    laptopCharging: 'Cargando',
    laptopHealthLabel: 'Salud de batería',
    laptopPowerPlanLabel: 'Plan de energía',
    laptopHybridGpuLabel: 'Modo GPU híbrida',
    laptopDesktopNotice: 'No se detectó batería — funcionando en modo escritorio.',
    cleanerTitle: 'Limpiador seguro de PC',
    cleanerSubtitle: 'Escanea carpetas temporales primero, revisa rutas exactas y confirma la limpieza.',
    cleanerSafetyBannerTitle: 'Protección estricta de archivos personales y juegos',
    cleanerSafetyBannerDesc: 'SecretArea NUNCA borra Escritorio, Documentos, Descargas, Imágenes, Vídeos, juegos, partidas, mods, System32 ni contraseñas, marcadores, cookies o historial del navegador.',
    cleanerScanBtn: 'Escanear ubicaciones seguras',
    cleanerScanningBtn: 'Escaneando...',
    cleanerCleanBtn: 'Revisar y limpiar',
    cleanerCleaningBtn: 'Limpiando...',
    cleanerSelectSafeDefaults: 'Seleccionar recomendados',
    cleanerEstimatedTotal: 'Espacio seleccionado',
    cleanerOptInBadge: 'Opcional',
    cleanerOptInWarningDesc: 'Categoría opcional (desmarcada por defecto). Limpiar caché de shaders puede requerir recompilación al abrir juegos.',
    cleanerPathsLabel: 'Rutas analizadas',
    cleanerConfirmTitle: 'Confirmar limpieza',
    cleanerConfirmDesc: 'Revisa las categorías seleccionadas antes de eliminar estos archivos temporales.',
    cleanerConfirmAction: 'Confirmar y limpiar',
    cleanerCancelAction: 'Cancelar',
    cleanerProgressCleaning: 'Limpiando cachés seleccionadas...',
    cleanerReportTitle: 'Limpieza completada',
    cleanerReportFreed: 'Espacio liberado',
    cleanerReportRemoved: 'Archivos eliminados',
    cleanerReportSkipped: 'Archivos en uso omitidos',
    cleanerCatOldTempTitle: 'Temporales antiguos (>48h)',
    cleanerCatOldTempDesc: 'Archivos temporales del sistema con más de 48 horas.',
    cleanerCatUserTempTitle: 'Carpeta Temp de usuario',
    cleanerCatUserTempDesc: 'Archivos temporales de aplicaciones en %TEMP%.',
    cleanerCatAppCacheTitle: 'Cachés temporales de apps',
    cleanerCatAppCacheDesc: 'Volcados de error y registros temporales seguros.',
    cleanerCatSecretAreaCacheTitle: 'Caché de SecretArea',
    cleanerCatSecretAreaCacheDesc: 'Caché HTTP/GPU y descargas temporales de SecretArea.',
    cleanerCatThumbnailTitle: 'Caché de miniaturas de Windows',
    cleanerCatThumbnailDesc: 'Archivos thumbcache_*.db del explorador.',
    cleanerCatShaderTitle: 'Caché de Shaders DirectX / GPU',
    cleanerCatShaderDesc: 'Cachés compiladas D3DSCache y de controladores GPU.',
    cleanerCatRecycleTitle: 'Papelera de reciclaje',
    cleanerCatRecycleDesc: 'Vacía permanentemente la Papelera de Windows.',
    cleanerCatBrowserTitle: 'Solo caché HTTP del navegador',
    cleanerCatBrowserDesc: 'Elimina únicamente Cache / Code Cache de Edge, Chrome o Firefox sin tocar sesiones, cookies ni historial.',
    tabHealth: 'Salud y Diagnóstico',
    tabInventoryPorts: 'Sistema y Puertos',
    tabAdvisors2030: 'Asesores y 2030+',
    tabBenchmarksDb: 'Pruebas y Base DB',
    provDetected: 'Detectado',
    provMeasured: 'Medido',
    provSpec: 'Especificación',
    provEstimated: 'Estimado',
    provNotSupported: 'No Soportado',
    provNotDetected: 'No Detectado',
    provSensorUnavailable: 'Sensor No Disponible',
    provRequiresAdmin: 'Requiere Administrador',
    provUnknown: 'Desconocido',
    workloadProfileLabel: 'Uso Principal',
    workloadGaming: 'Gaming',
    workloadOffice: 'Oficina y Diario',
    workloadProgramming: 'Programación y VMs',
    workload3d: 'Modelado y Render 3D',
    workloadVideo: 'Edición de Vídeo',
    workloadDesign: 'Diseño Gráfico',
    workloadAi: 'IA / Machine Learning',
    workloadPro: 'Uso Profesional',
    workloadMixed: 'Uso Mixto',
    intelRefreshDeepScan: 'Reescanear Hardware',
    loadingDeepScan: 'Recopilando inventario profundo de hardware...',
    intelPrivacyOn: 'Privacidad: ACTIVADA',
    intelPrivacyOff: 'Privacidad: DESACTIVADA',
    intelExportJson: 'Exportar JSON',
    intelExportPdf: 'Exportar PDF',
    intelExportHtml: 'Exportar Informe',
    intelExportSuccess: 'Informe de hardware exportado correctamente',
    intelExportHtmlWebNote: 'Informe HTML imprimible descargado (abrir e Imprimir a PDF).',
    intelUnknown: 'Desconocido',
    intelUnavailable: 'No disponible',
    intelNotDetected: 'No detectado',
    intelSensorUnavailable: 'Sensor no disponible',
    intelSourceLabel: 'Fuente de sensor',
    desktopOnlyHint: 'Disponible en SecretArea Desktop (Windows / Linux).',
    healthPhysicalTitle: 'Salud Física',
    healthMeasuredCoverage: 'componentes medidos',
    healthPerformanceTitle: 'Capacidad de Rendimiento',
    healthAgeTitle: 'Antigüedad Generacional',
    healthAgeNote: 'Basado en años de lanzamiento de CPU/GPU/RAM',
    healthLifespanTitle: 'Vida Útil Estimada',
    healthLifespanDisclaimer: 'Depende del uso, refrigeración y desgaste',
    healthBreakdownTitle: 'Desglose de Salud y Cuellos de Botella',
    thermalCoolingTitle: 'Ventiladores, Refrigeración y Térmica',
    fanNoSourceHint: 'Sin puente RPM detectado (LibreHardwareMonitor recomendado en Windows)',
    fansDetectedHeader: 'Ventiladores Detectados',
    fansUnavailableBody: 'El SO no expone sensores RPM. LibreHardwareMonitor (Windows) o hwmon (Linux) muestran RPM reales sin inventar datos.',
    fanStatusRunning: 'Activo',
    fanStatusStopped: 'Detenido — Confirmado',
    fanStatusAbnormal: 'RPM Anormal',
    fanStatusNotDetected: 'No Detectado',
    fanStatusUnavailable: 'Sensor No Disponible',
    thermalSensorsHeader: 'Sensores de Temperatura',
    thermalPhysicalNoticeTitle: 'Requiere Inspección Física',
    errorsDriversTitle: 'Errores de Hardware, Registros y Controladores',
    errorsDriversSubtitle: 'Códigos del Administrador de dispositivos, visor de eventos WHEA/Disco/GPU y drivers firmados',
    pnpErrorsHeader: 'Errores de Dispositivos (PnP)',
    pnpNoErrors: 'No se detectaron códigos de error en dispositivos.',
    eventLogsHeader: 'Registros del Sistema (14 días)',
    eventLogsEmpty: 'Sin eventos críticos de WHEA, disco o pantalla recientes.',
    signedDriversHeader: 'Controladores Firmados',
    searchDriversPlaceholder: 'Buscar controlador o clase...',
    driverDeviceCol: 'Dispositivo',
    driverClassCol: 'Clase',
    driverVersionCol: 'Versión',
    driverDateCol: 'Fecha',
    driverSignedCol: 'Firma',
    driverSigned: 'Firmado',
    driverUnsigned: 'Sin firmar',
    sysIdTitle: 'Identificación del Sistema',
    sysFormFactor: 'Formato',
    sysSku: 'Producto / SKU',
    sysSerialMasked: 'Serie (Oculta)',
    sysOsBuild: 'SO y Compilación',
    sysArch: 'Arquitectura',
    sysBootMode: 'Modo de Arranque',
    sysSecureBoot: 'Secure Boot',
    sysTpm: 'Seguridad TPM',
    sysSensorBackends: 'Motores de Telemetría',
    moboTitle: 'Diagnóstico Placa Base',
    moboChipset: 'Chipset',
    moboSocket: 'Socket CPU',
    moboBios: 'BIOS / UEFI',
    moboBiosDate: 'Fecha BIOS',
    moboRamSupport: 'Soporte de Memoria',
    moboPcieSlots: 'Ranuras PCIe (SMBIOS)',
    portsTitle: 'Puertos, Conectores y Controladores',
    portsSubtitle: 'Separa puertos físicos SMBIOS de controladores USB/PCI y dispositivos conectados',
    portsHonestyBanner: 'Regla de precisión: Un controlador USB NO equivale a un puerto físico. Los puertos no confirmados se listan aparte.',
    portsTabConfirmed: 'Puertos Físicos Confirmados',
    portsTabControllers: 'Controladores Hardware',
    portsTabConnected: 'Dispositivos Conectados',
    portsTabUnconfirmed: 'Cabeceras Internas / No Confirmadas',
    portsBucketEmpty: 'No hay elementos en esta categoría según las tablas OS/SMBIOS.',
    storageSmartTitle: 'Salud Almacenamiento y SMART',
    storageSmartSubtitle: 'Unidades sin contadores SMART se muestran como No Disponible — nunca sanas sin pruebas',
    smartUnavailable: 'SMART No Disponible',
    smartWearLabel: 'Desgaste / Vida SSD',
    smartPohLabel: 'Horas Encendido',
    smartCyclesLabel: 'Ciclos Encendido',
    smartErrorsLabel: 'Errores Sin Corregir',
    cpuGpuDeepTitle: 'CPU Extendida y Roles Multi-GPU',
    cpuCacheLabel: 'Caché CPU',
    cpuVirtLabel: 'Virtualización',
    cpuVoltageLabel: 'Voltaje Núcleo',
    multiGpuRolesHeader: 'Asignación de Roles GPU (iGPU vs dGPU)',
    ramDimmsTitle: 'RAM y Módulos DIMM',
    ramEccLabel: 'Estado ECC',
    ramPagefileLabel: 'Archivo de Paginación',
    ramDimmsUnavailable: 'Los detalles SMBIOS por módulo DIMM no están disponibles aquí.',
    displaysDeepTitle: 'Pantallas y Dimensiones EDID',
    powerPsuBatteryTitle: 'Fuente de Alimentación y Batería',
    psuTelemetryHeader: 'Aviso Telemetría PSU de Escritorio',
    batteryDesignVsFull: 'Capacidad Actual vs Diseño',
    batteryCyclesLabel: 'Ciclos de Carga',
    batteryRateLabel: 'Tasa Carga / Descarga',
    peripheralsNetTitle: 'Redes, Periféricos y Componentes',
    adaptersLabel: 'Adaptadores',
    peripheralsLabel: 'Periféricos',
    systemComponentsLabel: 'Controladores y Componentes',
    future2030Title: 'Compatibilidad Futura y Asesor 2030+',
    future2030Subtitle: 'Separa hechos verificados de proyecciones futuras (2027–2030+)',
    futureProjectedVerdict: 'Preparación Proyectada',
    futureVerifiedFactsTitle: 'Hechos Verificados del Equipo',
    futureForwardEstimatesTitle: 'Estimaciones y Supuestos Futuros',
    upgradeAdvisorTitle: 'Asesor Inteligente de Mejoras',
    upgradeAdvisorSubtitle: 'Verifica socket, tipo/ranuras RAM, piezas soldadas en portátil y fuente PSU',
    psuWattageInputLabel: 'Potencia PSU Escritorio (W)',
    psuApplyBtn: 'Verificar PSU',
    psuOptionalHint: 'Opcional — el software no puede leer vatios de fuentes ATX estándar.',
    upgradeNoneNeeded: 'No se requieren mejoras urgentes para tu perfil de uso actual.',
    compatVerified: 'Compatibilidad Verificada',
    compatCheckNeeded: 'Verificar Espacio / PSU',
    gamingCompatTitle: 'Compatibilidad Gaming y Catálogo',
    gamingCompatSubtitle: 'Guía realista por resolución + comprobación del catálogo SecretArea',
    catalogGamesCheckTitle: 'Probar con Juegos del Catálogo',
    catalogSearchPlaceholder: 'Buscar juego del catálogo...',
    proCompatTitle: 'Compatibilidad Aplicaciones Profesionales',
    maintenanceTitle: 'Mantenimiento y Cuidado Preventivo',
    maintenanceSafetyNote: 'Solo lectura — nunca modifica BIOS, voltajes ni elimina archivos personales',
    benchTitle: 'Micro-Pruebas Seguras Opcionales',
    benchSubtitle: 'Pruebas cortas, no destructivas y cancelables con parada térmica automática',
    benchSafetyNotice: 'Pruebas iniciadas solo por el usuario. Se detienen automáticamente si CPU >= 92°C o GPU >= 88°C. El test de disco usa un archivo temporal borrado al instante.',
    benchCpuSingle: 'CPU 1 Hilo',
    benchCpuMulti: 'CPU Multi-Hilo',
    benchRamThroughput: 'Ancho de Banda RAM',
    benchStorageSeq: 'Almacenamiento Secuencial (Temp)',
    benchStorage4k: 'Almacenamiento Lectura 4K (Temp)',
    benchNetLatency: 'Latencia de Red',
    benchStartBtn: 'Ejecutar Pruebas Seguras',
    benchStartWebBtn: 'Ejecutar Micro-Pruebas Web',
    benchCancelBtn: 'Detener Prueba',
    benchStarting: 'Preparando prueba segura...',
    benchRunningWeb: 'Ejecutando micro-pruebas seguras en navegador...',
    benchCompleted: 'Prueba completada.',
    benchAbortedThermal: 'Detenido por límite térmico de seguridad.',
    benchCancelled: 'Prueba cancelada por el usuario.',
    dbTitle: 'Base de Generaciones Hardware y Actualizador',
    dbVersionLabel: 'Versión Base',
    dbEntriesLabel: 'registros',
    dbSourceLabel: 'Fuente Activa',
    dbCheckUpdateBtn: 'Buscar Actualización HTTPS',
    dbCustomFeedConsentLabel: 'Confío en esta URL HTTPS personalizada y acepto reemplazar la base oficial.',
    dbImportJsonBtn: 'Importar JSON',
    dbRollbackBtn: 'Restaurar Copia',
    dbSearchPlaceholder: 'Filtrar CPUs, GPUs, RAM, Chipsets...',
    dbWebOfflineNote: 'Usando base de datos offline integrada en modo Vista Web.',
    dbUpdateApplied: 'Base de datos hardware actualizada y validada.',
    dbUpToDate: 'La base de datos local verificada está activa.',
    dbImportSuccess: 'Base de datos JSON local importada y validada.',
    dbRollbackSuccess: 'Restaurada la última copia válida de la base de datos.',
    tabOpenSourceTools: 'Herramientas Open-Source',
    ossTitle: 'Herramientas Hardware Open-Source y Gestor de Versiones',
    ossSubtitle: 'Motores de telemetría de código abierto verificados obtenidos directamente de GitHub Releases y NuGet con validación SHA-256.',
    ossPolicyBadge: 'Solo Open-Source OSI',
    ossPolicyDesc: 'Solo es elegible el software genuinamente libre y de código abierto (como LibreHardwareMonitorLib bajo MPL-2.0). Las utilidades propietarias de código cerrado quedan excluidas.',
    ossCheckUpdatesBtn: 'Buscar última versión',
    ossCheckingBtn: 'Comprobando lanzamientos...',
    ossInstallBtn: 'Instalar versión oficial',
    ossUpdateBtn: 'Actualizar a la última',
    ossReinstallBtn: 'Reinstalar y verificar',
    ossRollbackBtn: 'Revertir a anterior',
    ossCancelBtn: 'Cancelar',
    ossConfirmDownloadTitle: 'Confirmar descarga oficial Open-Source',
    ossConfirmDownloadDesc: 'SecretArea descargará la compilación oficial desde GitHub Releases o NuGet, verificará su suma SHA-256 e instalará LibreHardwareMonitorLib localmente sin interfaz gráfica independiente.',
    ossConfirmRollbackDesc: 'Restaurar la copia de seguridad de la versión anterior de LibreHardwareMonitorLib en el directorio activo.',
    ossConfirmProceedBtn: 'Aprobar y continuar',
    ossInstalledVersionLabel: 'Versión instalada',
    ossLatestVersionLabel: 'Última versión estable',
    ossStatusLabel: 'Estado',
    ossLastCheckedLabel: 'Última comprobación',
    ossReleaseDateLabel: 'Fecha de lanzamiento',
    ossReleaseNotesLabel: 'Notas oficiales de la versión',
    ossNoReleaseNotes: 'Pulsa «Buscar última versión» para consultar dinámicamente versión, fecha y notas desde GitHub.',
    ossStatusNotInstalled: 'No instalado',
    ossStatusUpToDate: 'Actualizado',
    ossStatusUpdateAvailable: 'Actualización disponible',
    ossStatusNewerInstalled: 'Versión local más reciente',
    ossStatusRepairRequired: 'Reparación requerida',
    ossStageDownloading: 'Descargando archivo oficial',
    ossStageVerifying: 'Verificando SHA-256 e integridad PE',
    ossStageInstalling: 'Extrayendo y activando biblioteca',
    ossLinkRepo: 'Repositorio GitHub',
    ossLinkReleases: 'Lanzamientos oficiales',
    ossLinkNuget: 'Paquete NuGet',
    ossLinkLicense: 'Licencia MPL-2.0',
    ossLinkSource: 'Código fuente',
    ossDirectLibBadge: 'Motor DLL directo · Sin GUI',
    ossShaVerifiedBadge: 'SHA-256 verificado',
    ossAdminTitle: 'Seguridad de usuario estándar y elevación',
    ossAdminDescStandard: 'SecretArea nunca se ejecuta permanentemente como Administrador. Los sensores de GPU, NVMe y memoria funcionan como usuario estándar; los sensores Ring0 de placa base (VRM, voltajes y ventiladores SuperIO) pueden requerir permisos de administrador.',
    ossAdminDescElevated: 'La sesión actual cuenta con privilegios de administrador; se puede acceder directamente a los sensores completos de placa base, VRM, voltajes y ventiladores SuperIO.',
    ossThirdPartyTitle: 'Cumplimiento de licencia Open-Source de terceros (MPL-2.0)',
    ossThirdPartyDesc: 'LibreHardwareMonitorLib se distribuye bajo la licencia Mozilla Public License 2.0 (MPL-2.0). Los avisos oficiales se conservan junto a la librería local y en THIRD_PARTY_LICENSES.md.',
    ossWebPreviewNote: 'Descargas deshabilitadas en Vista Web: abre SecretArea Desktop en Windows 10/11 para descargar, verificar SHA-256 y usar LibreHardwareMonitorLib.',
    ossPlatformUnsupportedNote: 'La integración directa de LibreHardwareMonitorLib (.NET DLL) está destinada a Windows 10/11. En Linux, SecretArea utiliza sysfs hwmon/DRM de forma nativa.',
  },
  updateHistory: {
    title: 'Historial de actualizaciones',
    subtitle: 'Cronología completa de versiones y cambios de SecretArea',
    settingsCardTitle: 'Versión e historial de cambios',
    settingsCardDesc: 'Consulta todas las versiones anteriores de SecretArea Desktop y revisa qué cambió en cada lanzamiento.',
    openHistoryBtn: 'Historial de versiones',
    searchPlaceholder: 'Buscar versiones, funciones o arreglos...',
    filterAll: 'Todo',
    filterFeature: 'Novedades',
    filterImprovement: 'Mejoras',
    filterFix: 'Correcciones',
    currentBadge: 'Instalada',
    latestBadge: 'Última',
    refreshBtn: 'Actualizar',
    refreshingBtn: 'Sincronizando...',
    checkUpdatesBtn: 'Buscar actualizaciones',
    emptyState: 'No hay versiones ni cambios que coincidan con el filtro.',
    changesSuffix: 'cambios',
    closeBtn: 'Cerrar',
    devBadge: 'En desarrollo',
    updateAvailableBadge: 'Actualización disponible',
    installedDevBadge: 'Activo (Modo Dev)',
    devModeEnvLabel: 'Modo Desarrollo',
    prodEnvLabel: 'Versión Instalada',
    unpublishedNote: 'Aún no publicado en GitHub',
    syncingAutoLabel: 'Sincronizando versiones...',
    newCountLabel: 'Nuevas',
    changedCountLabel: 'Cambios',
    fixedCountLabel: 'Correcciones',
    justUpdatedTitle: 'Novedades de esta versión',
    justUpdatedFromPrefix: 'Actualizado automáticamente desde',
    newlyInstalledBadge: 'Recién instalada',
  },
  notificationCenter: {
    buttonLabel: 'Notificaciones',
    title: 'Centro de notificaciones',
    subtitle: 'Últimos 3 juegos nuevos y actualizaciones',
    syncNowBtn: 'Sincronizar',
    syncingBtn: 'Sincronizando...',
    markAllReadBtn: 'Marcar todo leído',
    updateHistoryBtn: 'Historial',
    lastSyncedPrefix: 'Última sync',
    neverSynced: 'En caché',
    searchPlaceholder: 'Filtrar títulos, versiones o pestañas...',
    filterAll: 'Todo',
    filterImportant: 'Pestañas clave',
    filterNews: 'Solo noticias',
    importantHint: 'Novedades principales: Juegos, Hypervisor, SteamTools, PS5, Herramientas y Partidas',
    newsHint: 'Anuncios y tendencias: Próximos, Lista próxima y Repacks populares',
    liveBadge: 'En vivo',
    newBadge: 'Nuevo',
    updatedBadge: 'Actualizado',
    upcomingBadge: 'Próximo',
    popularBadge: 'Popular',
    openItemHint: 'Abrir',
    openExtrasHint: 'Ver en Extras',
    emptyTitle: 'Todo al día',
    emptyDesc: 'Aún no hay juegos nuevos ni actualizaciones recientes.',
    syncedToast: 'Catálogo sincronizado',
    newUpdatesToastPrefix: 'novedades del catálogo',
    tabLabels: {
      all: 'Todas',
      game: 'Juegos',
      hypervisor: 'Hypervisor',
      steamtools: 'SteamTools',
      ps5: 'PS5',
      architect: 'Herramientas',
      extra: 'Partidas',
      upcoming: 'Próximos',
      upcominglist: 'Lista próxima',
      popularrepacks: 'Repacks populares',
    },
  },
  spinWheel: {
    title: 'Ruleta de Repacks Populares',
    subtitle: 'Gira la ruleta para elegir al azar entre los Juegos Más Populares',
    spinBtn: 'Girar la ruleta',
    spinningLabel: 'Girando...',
    spinAgainBtn: 'Girar de nuevo',
    viewGameBtn: 'Ver detalles del juego',
    poolCountSuffix: 'juegos',
    filterAll: 'Todos',
    filterGames: 'Juegos',
    filterHv: 'Hypervisor',
    filterCanRun: 'Puedo jugarlo',
    readyTitle: '¿Listo para tu próximo juego?',
    readyDesc: 'Pulsa SPIN en el centro de la ruleta para descubrir un título aleatorio de Repacks Populares.',
    winnerLabel: 'Juego elegido',
    recentTitle: 'Giros recientes',
    emptyPool: 'No hay juegos en Repacks Populares para este filtro.',
    repackSizeLabel: 'Repack',
    originalSizeLabel: 'Original',
    canRunPass: 'Funciona bien en tu PC',
    canRunFail: 'Debajo de requisitos',
    addFavorite: 'Favorito',
    removeFavorite: 'En favoritos',
    congratsTitle: '¡Felicidades!',
    congratsSubtitle: 'Tu juego elegido al azar está listo.',
  },
  deals: {
    pageTitle: 'Ofertas y Descubrimiento de Juegos',
    pageSubtitle: 'Descuentos de PC en vivo, comparador entre tiendas y juegos gratis verificados.',
    refreshBtn: 'Actualizar',
    refreshingBtn: 'Actualizando',
    lastUpdatedPrefix: 'Actualizado',
    regionLabel: 'Región',
    currencyLabel: 'Moneda',
    allCurrenciesLabel: 'Todas las monedas',
    liveFxRateLabel: 'Tasa en vivo',
    fxLoadingLabel: 'Actualizando...',
    fxUnavailableLabel: 'Sin tasa · USD',
    sourcePriceHint: 'Precio tienda',
    currencyNames: {
      USD: 'Dólar estadounidense',
      MAD: 'Dírham marroquí',
      EUR: 'Euro',
      GBP: 'Libra esterlina',
      CAD: 'Dólar canadiense',
      SAR: 'Riyal saudí',
      AED: 'Dírham de EAU',
      TRY: 'Lira turca',
      BRL: 'Real brasileño',
      JPY: 'Yen japonés',
    },
    tabOverview: 'Resumen',
    tabAllDeals: 'Todas las ofertas',
    tabFreeGames: 'Juegos gratis',
    tabStores: 'Tiendas',
    featuredDealsTitle: 'Ofertas destacadas',
    bestDiscountsTitle: 'Mejores descuentos',
    trendingDealsTitle: 'En tendencia',
    recentlyUpdatedTitle: 'Actualizadas recientemente',
    freeGamesSpotlightTitle: 'Juegos gratis y sorteos',
    popularGamesTitle: 'Juegos populares',
    viewAllBtn: 'Ver todo',
    searchPlaceholder: 'Buscar juegos de PC por título...',
    storeFilterAll: 'Todas las tiendas verificadas',
    minPriceLabel: 'Mín',
    maxPriceLabel: 'Máx',
    minDiscountLabel: 'Descuento',
    discountAny: 'Cualquiera',
    sortLabel: 'Ordenar',
    sortDealRating: 'Mejor valoración',
    sortSavings: 'Mayor descuento',
    sortPriceAsc: 'Menor precio',
    sortPriceDesc: 'Mayor precio',
    sortRecent: 'Más recientes',
    sortMetacritic: 'Nota Metacritic',
    sortTitle: 'Título A–Z',
    resetFiltersBtn: 'Restablecer',
    resultsCountSuffix: 'ofertas',
    pageLabel: 'Página',
    ofLabel: 'de',
    prevPageBtn: 'Anterior',
    nextPageBtn: 'Siguiente',
    freeCatLimited: 'Gratis por tiempo limitado',
    freeCatGiveaways: 'Promociones y claves',
    freeCatFreeToPlay: 'Free-to-Play',
    freeCatLimitedDesc: 'Juegos de pago gratis al 100 % temporalmente — priorizados por cierre próximo.',
    freeCatGiveawaysDesc: 'DLCs, botín y claves promocionales verificadas.',
    freeCatFreeToPlayDesc: 'Juegos de PC gratuitos permanentes de editores verificados.',
    expiresPrefix: 'Termina en',
    noExpiryLabel: 'Gratis permanente',
    originalWorthPrefix: 'Antes',
    claimFreeBtn: 'Reclamar gratis',
    playFreeBtn: 'Abrir tienda',
    viewDealBtn: 'Ver oferta',
    compareOffersBtn: 'Comparar tiendas',
    dealRatingLabel: 'Valoración',
    freeBadge: 'GRATIS',
    storesTitle: 'Tiendas digitales verificadas',
    storesSubtitle: 'Tiendas obtenidas dinámicamente desde los proveedores integrados.',
    storeActiveDealsSuffix: 'ofertas activas',
    storeTopDiscountPrefix: 'Hasta',
    browseStoreBtn: 'Explorar ofertas',
    detailOffersTitle: 'Comparación entre tiendas',
    detailHistoricalLowLabel: 'Mínimo histórico',
    detailHistoricalDatePrefix: 'Registrado',
    detailBestPriceLabel: 'Mejor precio actual',
    detailLoadingOffers: 'Cargando ofertas y mínimo histórico...',
    detailCurrencyNotice: 'Las conversiones usan tasas en vivo; el precio original se muestra al lado.',
    detailStoreCol: 'Tienda',
    detailOriginalCol: 'Original',
    detailCurrentCol: 'Actual',
    detailDiscountCol: 'Descuento',
    detailActionCol: 'Enlace',
    detailCloseBtn: 'Cerrar',
    emptyDealsTitle: 'No hay ofertas para estos filtros',
    emptyDealsDesc: 'Prueba bajando el descuento mínimo, ampliando el precio o limpiando la búsqueda.',
    emptyFreeTitle: 'No hay promociones activas en esta categoría',
    emptyFreeDesc: 'Las ofertas verificadas aparecen automáticamente cuando se publican.',
    errorTitle: 'No se pudieron cargar las ofertas',
    offlineDesc: 'Parece que no tienes conexión. Conéctate para obtener precios actualizados.',
    retryBtn: 'Reintentar',
    tabLivePlayers: 'Jugadores en vivo',
    tabCompare: 'Comparar',
    tabAlerts: 'Alertas de precio',
    whatsHotTodayTitle: 'Tendencias de hoy',
    whatsHotSubtitle: 'Picos de jugadores en vivo, mayores descuentos y estrenos populares',
    hotMostPlayed: 'Más jugados en vivo',
    hotBiggestGains: 'Mayores subidas 24h',
    hotNewReleases: 'Estrenos populares',
    hotBestDiscounts: 'Mejores descuentos',
    kpiTopPlayers: 'Top 100 Steam simultáneo',
    kpiActiveDeals: 'Ofertas activas',
    kpiFreeNow: 'Juegos gratis y sorteos',
    kpiFollowedAlerts: 'Alertas activas',
    livePlayersTitle: 'Jugadores Steam en vivo y Tendencias',
    livePlayersSubtitle: 'Ranking Top 100, variación 24h y velocidad de reseñas',
    liveTabTop100: 'Top 100 en vivo',
    liveTabGainers: 'Mayores subidas',
    liveTabDecliners: 'En descenso',
    liveTabReviewMovers: 'Tendencia de reseñas',
    liveSearchPlaceholder: 'Filtrar por título o Steam App ID...',
    liveColRank: 'Pos.',
    liveColGame: 'Juego',
    liveColPlayers: 'En juego',
    liveColPeak24h: 'Pico 24h',
    liveColChange24h: 'Cambio 24h',
    liveColTrend7d: 'Tendencia 7d',
    liveColPrice: 'Precio Steam',
    liveColActions: 'Acciones',
    healthLegendTitle: 'Niveles de salud del juego',
    healthLegendDesc: 'Basado en retención reciente de 30 días y snapshots históricos.',
    healthTiers: {
      thriving: 'En auge',
      healthy: 'Saludable',
      cooling: 'Enfriándose',
      quiet: 'Tranquilo',
      dormant: 'Inactivo',
      unknown: 'Sin datos',
    },
    freeFilterAll: 'Todas las tiendas',
    freeFilterEpic: 'Epic Games',
    freeFilterSteam: 'Steam',
    freeFilterGog: 'GOG',
    freeFilterPcDlc: 'DLC y Recompensas',
    compareTitle: 'Comparación lado a lado',
    compareSubtitle: 'Compara jugadores, reseñas Steam, crítica separada y precios (2–4 juegos)',
    compareSearchPlaceholder: 'Buscar cualquier juego de PC para comparar...',
    compareAddBtn: 'Comparar',
    compareAddedBadge: 'Añadido',
    compareRemoveBtn: 'Quitar',
    compareClearBtn: 'Limpiar todo',
    compareEmptyTitle: 'Selecciona juegos para comparar',
    compareEmptyDesc: 'Busca arriba o pulsa Comparar en cualquier oferta o ranking.',
    compareMaxNotice: 'La comparación admite hasta 4 juegos simultáneos.',
    compareMetricCol: 'Métrica',
    alertsTitle: 'Alertas de bajada de precio',
    alertsSubtitle: 'Sigue juegos y recibe avisos locales cuando baje su precio',
    alertsCheckNowBtn: 'Comprobar ahora',
    alertsCheckingBtn: 'Comprobando...',
    alertsFollowBtn: 'Seguir precio',
    alertsFollowingBadge: 'Alerta activa',
    alertsTargetPriceLabel: 'Precio objetivo',
    alertsAnyDropOption: 'Cualquier bajada',
    alertsLastCheckedLabel: 'Última comprobación',
    alertsTriggeredTitle: 'Bajadas detectadas',
    alertsFollowedTitle: 'Juegos seguidos',
    alertsMarkAllReadBtn: 'Marcar leídas',
    alertsClearEventsBtn: 'Limpiar historial',
    alertsEmptyFollowed: 'Aún no sigues ningún juego.',
    alertsEmptyTriggered: 'Sin bajadas recientes detectadas.',
    alertsDropDetectedToast: 'Bajada de precio detectada para',
    modalTabOverview: 'Resumen y Tiendas',
    modalTabCharts: 'Gráficos Jugadores y Precio',
    modalTabReviewsCritics: 'Reseñas y Crítica',
    modalTabStatsNews: 'Estadísticas, Logros y Noticias',
    playerChartTitle: 'Historial de jugadores en Steam',
    priceChartTitle: 'Historial de precios',
    noChartData: 'No hay datos históricos disponibles para este título.',
    discountShameWarning: 'Aviso: el precio base subió antes de iniciar esta oferta.',
    criticsSectionTitle: 'Puntuaciones independientes de crítica y usuarios',
    criticsSeparateNote: 'Cada plataforma mantiene su escala original sin promediarse.',
    steamRatingCardTitle: 'Valoración Steam',
    metacriticScoreCardTitle: 'Metacritic Metascore',
    metacriticUserCardTitle: 'Puntuación usuarios Metacritic',
    openCriticCardTitle: 'Puntuación OpenCritic',
    keyRequiredBadge: 'Clave opcional requerida',
    configureKeyAction: 'Configurar clave API',
    reviewsPositiveLabel: 'Positivas',
    reviewsNegativeLabel: 'Negativas',
    reviewsDailyTrendTitle: 'Tendencia de reseñas',
    reviewsRecentTitle: 'Reseñas de jugadores',
    reviewsSnapshotNote: 'Métricas históricas cortesía de The Game Census (thegamecensus.com, CC BY 4.0).',
    achievementsTitle: 'Porcentaje global de logros',
    newsUpdatesTitle: 'Noticias e impacto de parches',
    updateImpactLabel: 'Jugadores tras parche',
    developerLabel: 'Desarrollador',
    publisherLabel: 'Editor',
    releaseDateLabel: 'Lanzamiento',
    platformsLabel: 'Plataformas',
    healthStatusLabel: 'Salud del juego',
    sourcesLabel: 'Fuentes de datos',
    apiKeysBtn: 'Claves API',
    apiKeysTitle: 'Proveedores y Claves API opcionales',
    apiKeysSubtitle: 'Las APIs públicas funcionan sin clave. Las claves opcionales activan Steam Index, usuarios de Metacritic y OpenCritic.',
    apiKeysFreeLabel: 'APIs públicas activas (sin clave)',
    apiKeysOptionalLabel: 'APIs autenticadas opcionales (cifradas)',
    apiKeysSaveBtn: 'Guardar clave',
    apiKeysClearBtn: 'Eliminar',
    apiKeysConfiguredBadge: 'Configurada',
    apiKeysNotSetBadge: 'Sin configurar',
    apiKeysSafeStorageNote: 'Guardado de forma cifrada mediante Electron safeStorage.',
  },
  settingsHub: {
    searchPlaceholder: 'Buscar ajustes, temas o herramientas (ej. qBittorrent, FPS, API, caché)...',
    searchResultsCount: 'secciones encontradas',
    searchEmptyTitle: 'No se encontraron ajustes ni herramientas',
    searchEmptyDesc: 'Prueba buscar idioma, tema, cursor, rendimiento, qBittorrent, PresentMon, limpiador o API.',
    clearSearchBtn: 'Limpiar búsqueda',
    catAll: 'Todos los ajustes',
    catTools: 'Herramientas e Integraciones',
    catLanguage: 'Idioma y Región',
    catStartup: 'Inicio y Sistema',
    catAppearance: 'Apariencia y Temas',
    catAudio: 'Audio y Sonido',
    catPerformance: 'Rendimiento y Energía',
    catStorage: 'Almacenamiento, Caché y Respaldo',
    catUpdates: 'Actualizaciones e Historial',
    summaryThemeLabel: 'Tema activo',
    summaryPerfLabel: 'Perfil de rendimiento',
    summaryToolsLabel: 'Herramientas y Motores',
    summarySystemLabel: 'Hardware y Disco',
    toolsReadySuffix: 'listas',
    themeStudioTitle: 'Estudio Rápido de Temas',
    themeStudioDesc: 'Cambia al instante entre modo oscuro/claro, temas de consola o tu paleta personalizada.',
    themeDefaultDark: 'Oscuro base',
    themeCrispLight: 'Claro nítido',
    themePs5: 'PlayStation 5',
    themeXbox: 'Xbox Nexus',
    themeCustom: 'Estudio propio',
    traySmartTip: 'Consejo: activaste Iniciar con el equipo. Cambia el cierre a «Minimizar a la bandeja» para mantener SecretArea listo en segundo plano.',
    traySmartBtn: 'Minimizar en bandeja',
    audioStatusConsoleActive: 'La música ambiental de consola y los efectos de interfaz están activos.',
    audioStatusStandby: 'Los sonidos de clic están activos. La música ambiental se activa automáticamente al elegir el tema PS5 o Xbox.',
    audioPreviewBtn: 'Probar sonido',
    volumeMute: 'Silencio',
    volumeLow: 'Bajo',
    volumeBalanced: 'Equilibrado',
    volumeMax: 'Máx',
    effectiveParamsTitle: 'Parámetros efectivos en vivo',
    effectiveHwPoll: 'Sondeo HW',
    effectiveUiCoalesce: 'Sync UI',
    effectiveTorrentPoll: 'Torrent Inactivo',
    effectiveCacheCap: 'Tope Imágenes',
    diskFreeLabel: 'Espacio libre en disco',
    cacheSectionTitle: 'Caché, Datos y Respaldo Portable',
    cacheSectionDesc: 'Limpia la caché de ofertas o carátulas, o exporta/importa tus ajustes en un archivo JSON.',
    clearDealsCacheBtn: 'Limpiar caché de Ofertas',
    dealsCacheCleared: 'Caché en memoria de ofertas limpiada.',
    clearImageCacheBtn: 'Limpiar caché de imágenes',
    imageCacheCleared: 'Caché de carátulas eliminada.',
    exportSettingsBtn: 'Exportar ajustes',
    importSettingsBtn: 'Importar ajustes',
    importSettingsSuccess: 'Ajustes importados y aplicados.',
    importSettingsError: 'Archivo JSON de ajustes no válido.',
    hubTitle: 'Centro de Herramientas e Integraciones',
    hubSubtitle: 'Todas las utilidades integradas, motores de hardware, descargas y proveedores API en un solo lugar: conoce para qué sirve cada herramienta y configúrala aquí.',
    hubFilterAll: 'Todas',
    hubFilterHardware: 'Hardware y Diagnóstico',
    hubFilterDownloads: 'Descargas y Red',
    hubFilterDeals: 'Ofertas y APIs',
    hubFilterUtilities: 'Utilidades y Guías',
    hubConfigureBtn: 'Configurar',
    hubHideConfigBtn: 'Ocultar config',
    hubPurposeLabel: 'Para qué sirve',
    hubStatusReady: 'Listo',
    hubStatusAttention: 'Requiere atención',
    hubStatusStandby: 'En espera',
    hubStatusBuiltin: 'Integrada',
    hubStatusWebPreview: 'Requiere App Escritorio',
    toolQbitName: 'qBittorrent Web UI (API v2 / 5.0+)',
    toolQbitPurpose: 'Envía enlaces magnet y .torrent desde SecretArea a tu qBittorrent local y muestra velocidad DL/UL, ETA y controles en vivo.',
    toolPresentMonName: 'Intel PresentMon (FPS y Frame Time)',
    toolPresentMonPurpose: 'Captura tiempos de fotograma DX11/DX12/Vulkan/OpenGL, FPS 1%/0.1% Low y carga real de GPU en sesiones de juego.',
    toolLhmName: 'LibreHardwareMonitorLib (Sensores)',
    toolLhmPurpose: 'Motor open-source MPL-2.0 que lee temperaturas CPU/GPU, frecuencias, vatios, voltajes VRM, SMART NVMe y ventiladores.',
    toolCleanerName: 'Limpiador Seguro de PC y Caché',
    toolCleanerPurpose: 'Analiza y elimina de forma segura archivos temporales de Windows, caché de apps, caché de SecretArea, miniaturas y shaders DirectX.',
    toolDealsApiName: 'Proveedores de Ofertas y Críticas API',
    toolDealsApiPurpose: 'Alimenta Ofertas, Jugadores en vivo y Puntuaciones mediante 6 APIs públicas gratuitas más 3 claves cifradas opcionales.',
    toolCanRunItName: 'Can Run It y Perfil de Hardware',
    toolCanRunItPurpose: 'Compara los requisitos de CPU, GPU, VRAM, RAM y disco de cada juego frente a las especificaciones de tu PC.',
    toolBenchDbName: 'Benchmarks y Base de Datos Hardware',
    toolBenchDbPurpose: 'Ejecuta micro-benchmarks seguros de CPU/RAM/Disco/Latencia y actualiza la base de datos hardware-db.json.',
    toolHypervisorName: 'Guía de Hypervisor y Virtualización',
    toolHypervisorPurpose: 'Referencia paso a paso para BIOS VT-x / AMD-V, Hyper-V y controladores para títulos que requieren virtualización.',
    toolSpinWheelName: 'Ruleta de Juegos (¿Qué juego elijo?)',
    toolSpinWheelPurpose: 'Selector aleatorio sobre tu catálogo para superar la indecisión y abrir un juego sorpresa al instante.',
    toolUpdaterName: 'Actualizador, Historial y Alertas',
    toolUpdaterPurpose: 'Comprueba nuevas versiones de SecretArea en GitHub Releases, consulta el historial de cambios y gestiona notificaciones.',
    specsAutoDetected: 'Autodetectado (Nativo)',
    specsCustomOverride: 'Personalizado',
    specsBrowserMode: 'Estimado (Navegador)',
    specsRescanBtn: 'Reescanear PC',
    specsCustomizeBtn: 'Editar specs',
    specsSaveBtn: 'Guardar specs',
    specsResetAutoBtn: 'Restaurar auto',
    specsCpuLabel: 'Procesador (CPU)',
    specsGpuLabel: 'Gráfica (GPU)',
    specsVramLabel: 'VRAM (GB)',
    specsRamLabel: 'Memoria RAM (GB)',
    specsDiskFreeLabel: 'Espacio libre (GB)',
    cleanerQuickScanBtn: 'Análisis rápido',
    cleanerQuickCleanBtn: 'Limpiar selección',
    cleanerWebNote: 'La limpieza del sistema requiere la aplicación de escritorio SecretArea.exe.',
    dbEntriesLabel: 'Entradas en BD',
    dbVersionLabel: 'Versión BD',
    dbCheckUpdateBtn: 'Buscar MÀJ BD',
    openHardwareMonitorBtn: 'Abrir Monitor Hardware',
    openPcCleanerBtn: 'Abrir Limpiador completo',
    openBenchmarksBtn: 'Abrir Benchmarks y BD',
    openDealsBtn: 'Abrir Ofertas',
    openHypervisorBtn: 'Abrir Guía Hypervisor',
    openSpinWheelBtn: 'Abrir Ruleta',
    openUpdaterBtn: 'Buscar actualizaciones',
  },
};

const AR: LauncherTranslations = {
  locale: 'ar-EG-u-nu-latn',
  nav: {
    home: 'الرئيسية',
    library: 'المكتبة',
    gameDeals: 'عروض الألعاب',
    downloads: 'التنزيلات',
    extras: 'إضافات',
    requests: 'الطلبات',
    hardwareMonitor: 'مراقب العتاد',
    settings: 'الإعدادات',
    switchLight: 'التبديل إلى الوضع الفاتح',
    switchDark: 'التبديل إلى الوضع الداكن',
    lightLabel: 'فاتح',
    darkLabel: 'داكن',
    selectLanguage: 'اختر اللغة',
    openMenu: 'فتح قائمة التنقل',
    closeMenu: 'إغلاق قائمة التنقل',
    languageLabel: 'اللغة',
    themeLabel: 'المظهر',
    spin: 'عجلة الحظ',
  },
  topbar: {
    webVersion: 'نسخة الويب SecretArea',
    updatesTitle: 'حول SecretArea والتحقق من التحديثات',
    enterFullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء ملء الشاشة',
    muteSounds: 'قيد التشغيل: موسيقى PS5 — انقر لكتم الصوت',
    enableSounds: 'تفعيل موسيقى وأصوات PS5',
    muteXboxSounds: 'قيد التشغيل: أصوات Xbox — انقر لكتم الصوت',
    enableXboxSounds: 'تفعيل موسيقى وأصوات Xbox',
    offlineMode: 'وضع عدم الاتصال',
    onlineMode: 'متصل بالإنترنت',
  },
  settings: {
    pageTitle: 'الإعدادات',
    pageSubtitle: 'تخصيص لغة المشغّل، البدء والإغلاق، مظهر النافذة، والمؤثرات الصوتية.',
    resetDefaults: 'استعادة الافتراضي',
    resetToast: 'تمت استعادة الإعدادات الافتراضية',
    languageSectionTitle: 'اللغة',
    languageSectionDesc: 'اختر لغة واجهة المشغّل واتجاه العرض في SecretArea.',
    rtlBadge: 'يمين ← يسار',
    ltrBadge: 'يسار → يمين',
    startingSectionTitle: 'البدء والإغلاق',
    startWithComputerTitle: 'التشغيل مع جهاز الكمبيوتر',
    startWithComputerDesc: 'يفتح SecretArea في شريط المهام (Tray) عند تسجيل الدخول إلى هذا الكمبيوتر.',
    desktopSupportedBadge: 'تشغيل تلقائي في Tray',
    webNotice: 'يتفعّل التشغيل التلقائي في شريط النظام تلقائياً داخل تطبيق سطح المكتب SecretArea.exe.',
    trayActiveHint: 'عند تفعيل هذا الخيار، يؤدي إغلاق النافذة إلى تصغير SecretArea إلى شريط النظام.',
    canRunItTitle: 'فحص التوافق مع الجهاز (Can Run It)',
    canRunItDesc: 'مقارنة الألعاب والأدوات تلقائياً مع مواصفات جهازك في الصفحة الرئيسية والمكتبة وصفحات الألعاب.',
    windowSectionTitle: 'النافذة',
    compactNavbarTitle: 'شريط تنقّل مدمج',
    compactNavbarDesc: 'إظهار شريط التنقّل كأيقونات فقط، حتى في النافذة العريضة.',
    customCursorTitle: 'مؤشر مخصص متحرك',
    customCursorDesc: 'استخدام مؤشر سطح المكتب المرسوم المخصص مع تموجات النقر وحلقة التمرير والحالات المتحركة.',
    lightModeTitle: 'الوضع الفاتح / الداكن',
    lightModeDesc: 'التبديل بين الوضع الفاتح والوضع الداكن. تفعيل مظهر PS5 أو Xbox يعيد التبديل إلى الوضع الداكن.',
    darkModeBadge: 'الوضع الداكن',
    lightModeBadge: 'الوضع الفاتح',
    alwaysPs5Title: 'تشغيل التطبيق دائماً بمظهر PS5',
    alwaysPs5Desc: 'تشغيل مظهر PlayStation 5 الياقوتي والموسيقى المحيطة في كامل المشغّل.',
    alwaysXboxTitle: 'تشغيل التطبيق دائماً بمظهر Xbox',
    alwaysXboxDesc: 'تطبيق مظهر Xbox الأخضر الزمردي وخلفية الشبكة والكرة المضيئة مع مؤثرات Xbox الصوتية.',
    audioSectionTitle: 'الصوت والمشهد الصوتي',
    audioSectionDesc: 'التحكم المنفصل في الموسيقى المحيطة لـ PS5 و Xbox مقابل أصوات النقر في الواجهة مع شريط مستوى الصوت.',
    ambientMusicTitle: 'الموسيقى المحيطة بالخلفية (PS5 / Xbox)',
    ambientMusicDesc: 'تشغيل الموسيقى المحيطة الهادئة لـ PS5 أو Xbox Nexus عند تفعيل أحد مظاهر الكونسول.',
    uiSoundsTitle: 'أصوات النقر والتمرير في الواجهة',
    uiSoundsDesc: 'تشغيل أصوات نقر المؤشر المخصص ونغمات التمرير والرجوع عبر جميع السمات.',
    volumeTitle: 'مستوى الصوت الرئيسي',
    volumeDesc: 'ضبط مستوى الصوت لنقرات المؤشر والموسيقى المحيطة ومؤثرات الواجهة الصوتية.',
    consoleThemeAudioHint: 'أصوات نقر المؤشر تعمل في جميع السمات. اختر مظهر PS5 أو Xbox في قسم النافذة أعلاه لسماع الموسيقى المحيطة.',
    activeLabel: 'مفعّل',
    inactiveLabel: 'متوقف',
    downloadSectionTitle: 'التنزيلات والتخزين',
    downloadFolderTitle: 'مجلد التنزيلات الافتراضي',
    downloadFolderDesc: 'اختر المجلد الذي تُحفظ فيه الروابط المباشرة وملفات MediaFire و Mega وتنزيلات المتصفح المدمج.',
    chooseFolderBtn: 'تغيير المجلد',
    openFolderBtn: 'فتح المجلد',
    torrentSectionTitle: 'ربط qBittorrent (Web UI API v2)',
    torrentSectionDesc: 'اختياري: اربط SecretArea بواجهة الويب المحلية لبرنامج qBittorrent (API v2 / 5.0+) لإرسال روابط Magnet وملفات .torrent ومتابعة سرعة التحميل والرفع والوقت المتبقي.',
    torrentEnableTitle: 'تفعيل المزامنة مع qBittorrent Web UI',
    torrentEnableDesc: 'يزامن روابط Magnet وملفات .torrent مع qBittorrent المحلي مع تشفير البيانات عبر safeStorage. الروابط المباشرة و MediaFire و Mega تعمل دائماً دون الحاجة لـ qBittorrent.',
    torrentAutoDetectBtn: 'كشف تلقائي',
    torrentDetectingBtn: 'جارٍ الفحص...',
    torrentTestBtn: 'اختبار الاتصال',
    torrentTestingBtn: 'جارٍ الاختبار...',
    torrentSaveBtn: 'حفظ الإعدادات',
    torrentSavingBtn: 'جارٍ الحفظ...',
    torrentStatusConnected: 'متصل',
    torrentStatusDisconnected: 'غير متصل',
    torrentStatusTesting: 'جارٍ الاختبار...',
    torrentNotInstalledTitle: 'لم يتم العثور على qBittorrent على هذا الجهاز (اختياري)',
    torrentNotInstalledDesc: 'تعمل التنزيلات المباشرة و MediaFire و Mega والمتصفح المدمج بشكل مستقل تماماً. ثبّت qBittorrent فقط إذا أردت متابعة روابط Magnet وملفات .torrent داخل التطبيق.',
    torrentDownloadBtn: 'تنزيل qBittorrent الرسمي',
    torrentHostLabel: 'المضيف (محلي فقط)',
    torrentPortLabel: 'المنفذ (Port)',
    torrentUsernameLabel: 'اسم المستخدم',
    torrentPasswordLabel: 'كلمة المرور',
    torrentPasswordSavedPlaceholder: 'مشفرة عبر safeStorage (اتركها فارغة للإبقاء)',
    torrentApiKeyLabel: 'مفتاح API (اختياري · qBittorrent 5.2+)',
    torrentApiKeyPlaceholder: 'qbt_... (اختياري)',
    torrentApiKeySavedPlaceholder: 'مفتاح API محفوظ بأمان (اتركه فارغاً للإبقاء)',
    torrentLoopbackNotice: 'أمان الشبكة المحلية: يقتصر الاتصال على العنوان المحلي (127.0.0.1 / localhost / ::1) ولا يتم فتح Web UI على الشبكة الخارجية.',
    torrentLoopbackError: 'يجب أن يكون المضيف عنواناً محلياً فقط (127.0.0.1 أو localhost أو ::1).',
    torrentGuideTitle: 'خطوات تفعيل qBittorrent Web UI (إعداد يدوي)',
    torrentGuideStep1: '1. افتح qBittorrent على ويندوز واذهب إلى Tools ← Options ← Web UI.',
    torrentGuideStep2: '2. فعّل خيار «Web User Interface (Remote control)»، واترك IP Address على 127.0.0.1 والمنفذ 8080.',
    torrentGuideStep3: '3. ضمن Authentication أدخل اسم المستخدم وكلمة المرور (أو أنشئ مفتاح API يبدأ بـ qbt_ في qBittorrent 5.2.0+).',
    torrentGuideStep4: '4. اضغط Apply ثم OK في qBittorrent، ثم أدخل نفس البيانات أعلاه واضغط حفظ الإعدادات.',
    torrentGuideStep5: '5. اضغط «كشف تلقائي» ثم «اختبار الاتصال» للتحقق من الاتصال بـ Web UI API v2.',
    torrentWebNotice: 'وضع معاينة الويب: لا يمكن للمتصفح الاتصال بواجهة qBittorrent المحلية (127.0.0.1) أو استخدام safeStorage. استخدم تطبيق سطح المكتب SecretArea.exe لاختبار الاتصال والمزامنة.',
    torrentTestingWebPreviewMsg: 'غير متصل — معاينة الويب لا تستطيع الاتصال بـ qBittorrent المحلي.',
    torrentTestingWebPreviewHint: 'قيود المتصفح تمنع الاتصال بالمنفذ المحلي وتشفير safeStorage. شغّل تطبيق SecretArea.exe لاختبار الاتصال ومزامنة التحميلات.',
    modeDesktopBadge: 'تطبيق سطح المكتب',
    modeWebPreviewBadge: 'معاينة الويب',
    torrentSavedToast: 'تم حفظ إعدادات qBittorrent',
    torrentManageSetupBtn: 'تثبيت / تحديث qBittorrent تلقائياً',
    replaySetupBtn: 'إعداد الترحيب',
    closeBehaviorTitle: 'سلوك إغلاق التطبيق',
    closeBehaviorDesc: 'اختر ما إذا كان إغلاق النافذة يصغّر SecretArea إلى شريط النظام (Tray) أو يغلق التطبيق بالكامل.',
    closeBehaviorMinimizeTray: 'تصغير إلى شريط النظام',
    closeBehaviorExit: 'إغلاق التطبيق بالكامل',
    exitAppTitle: 'إغلاق كامل للتطبيق',
    exitAppDesc: 'إيقاف مراقبة العتاد والألعاب وأيقونة شريط النظام وإغلاق SecretArea بالكامل فوراً.',
    exitAppBtn: 'إغلاق التطبيق بالكامل',
    exitAppConfirmBtn: 'تأكيد الإغلاق الكامل',
    exitAppCancelBtn: 'إلغاء',
    exitAppWebHint: 'الإغلاق الكامل متاح فقط داخل تطبيق سطح المكتب SecretArea.exe.',
  },
  performance: {
    sectionTitle: 'وضع الأداء واستهلاك الموارد',
    sectionSubtitle: 'اضبط استهلاك المعالج والذاكرة وكرت الشاشة والمهام الخلفية فوراً دون الحاجة لإعادة التشغيل.',
    liveApplyBadge: 'تطبيق فوري',
    modeEcoTitle: 'الوضع الاقتصادي (Eco)',
    modeEcoDesc: 'أقل استهلاك ممكن للمعالج والذاكرة والرسوميات. يقلل التأثيرات المستمرة ويبطئ الفحص الخلفي ويوقف المراقبة عند التصغير.',
    modeBalancedTitle: 'الوضع المتوازن',
    modeBalancedDesc: 'الوضع الافتراضي. يحافظ على سلاسة الواجهة واستجابتها مع تقليص المهام غير الضرورية في الخلفية.',
    modePerformanceTitle: 'وضع الأداء العالي',
    modePerformanceDesc: 'أقصى سرعة استجابة وتحديث أسرع للحساسات والتنزيلات مع كامل التأثيرات البصرية دون هدر في الخمول.',
    recommendedBadge: 'الافتراضي',
    activeBadge: 'مُفعّل',
    advancedTitle: 'إعدادات الموارد المتقدمة',
    advancedDesc: 'تحكم دقيق في فترات التحديث والتأثيرات البصرية وسلوك الخلفية بشكل مستقل.',
    pauseOnMinimizeTitle: 'إيقاف المراقبة الخلفية عند التصغير أو الإخفاء',
    pauseOnMinimizeDesc: 'يوقف فوراً حلقات قراءة الحساسات والرسوميات المحيطية وفحص الاتصال عند تصغير النافذة أو وضعها في شريط النظام.',
    reduceEffectsTitle: 'تقليل الضبابية والرسوميات المستمرة',
    reduceEffectsDesc: 'يعطّل الإضاءات المتحركة وضبابية الخلفية الثقيلة لتخفيف الحمل عن معالج الرسوميات (GPU).',
    hwIntervalTitle: 'سرعة تحديث مراقب العتاد',
    hwIntervalDesc: 'يحدد الفاصل الزمني لقراءة الحساسات أثناء فتح صفحة مراقب العتاد.',
    hwIntervalAuto: 'تلقائي (حسب الوضع)',
    dlThrottleTitle: 'تجميع تحديثات واجهة التنزيل',
    dlThrottleDesc: 'يتحكم في وتيرة تحديث سرعة التنزيل في الواجهة وحفظ الحالة على القرص.',
    dlThrottleAuto: 'تلقائي (حسب الوضع)',
    adaptiveTorrentTitle: 'فحص qBittorrent التكيفي',
    adaptiveTorrentDesc: 'يبطئ طلبات الواجهة البرمجية تلقائياً عندما لا توجد ملفات تورنت نشطة.',
    deferSyncTitle: 'تأجيل المزامنة وفحص التحديثات الخلفية',
    deferSyncDesc: 'يمدد الفواصل الزمنية لمزامنة الفهرس وتخزين الصور المؤقت وفحص التحديثات غير العاجل.',
    auditTitle: 'بصمة استهلاك الموارد الحية',
    auditDesc: 'قراءة فورية عند الطلب لاستهلاك عمليات Electron وحالة المهام الخلفية النشطة.',
    auditRefreshBtn: 'قياس الآن',
    auditMainCpuLabel: 'معالج العملية الرئيسية',
    auditMainHeapLabel: 'ذاكرة JS (Heap)',
    auditMainRssLabel: 'الذاكرة الفعلية (RSS)',
    auditTotalProcessesLabel: 'عمليات سطح المكتب',
    auditHwMonitorLabel: 'مراقب العتاد',
    auditDownloadsLabel: 'التنزيلات النشطة',
    auditTorrentPollerLabel: 'فاحص qBittorrent',
    auditStateActive: 'نشط',
    auditStatePausedHidden: 'متوقف مؤقتاً (مخفي)',
    auditStateIdle: 'خامل / متوقف',
    auditStateOff: 'معطّل',
    auditWebNote: 'يعمل في معاينة المتصفح. تتوفر قياسات العمليات التفصيلية داخل تطبيق SecretArea.exe.',
    auditGpuProcessNote: 'يبقى تسريع العتاد مفعّلاً بذكاء لاستجابة سلسة مع خفض حمل الرسوميات الزائد.',
  },
  customTheme: {
    sectionTitle: 'منشئ المظهر المخصص',
    sectionSubtitle: 'صمّم مظهرك الافتراضي باختيار ألوان الخلفية ولون التمييز وشكل الأزرار والبطاقات.',
    enableLabel: 'تفعيل المظهر المخصص كافتراضي',
    surfaceLabel: 'خلفية الواجهة',
    surfaceMidnight: 'أردواز ليلي',
    surfaceObsidian: 'أسود عميق',
    surfaceAbyss: 'أزرق عميق',
    surfaceDaylight: 'نهاري مشرق',
    accentColorLabel: 'لون التمييز الأساسي',
    customHexLabel: 'لون مخصص Hex',
    buttonStyleLabel: 'نمط الأزرار',
    btnRounded: 'دائري لطيف',
    btnPill: 'كبسولة ناعمة',
    btnSharp: 'حواف حادة',
    cardRadiusLabel: 'استدارة البطاقات',
    cardSharp: 'حادة',
    cardMedium: 'متوازنة',
    cardSoft: 'ناعمة',
    glassBlurLabel: 'تأثير الزجاج الضبابي',
    glassBlurDesc: 'ضبابية خفيفة وشفافة للوحات والبطاقات',
    previewLabel: 'معاينة فورية',
    previewTitle: 'مظهر SecretArea المخصص',
    previewPrimaryBtn: 'زر أساسي',
    previewSecondaryBtn: 'زر ثانوي',
    resetBtn: 'إعادة ضبط المظهر المخصص',
    consoleOverrideNote: 'ملاحظة: تفعيل المظهر المخصص يلغي مؤقتاً مظهر كونسول PS5 / Xbox.',
    summaryCustomPrefix: 'مخصص',
  },
  downloads: {
    pageTitle: 'مدير التنزيلات',
    pageSubtitle: 'متابعة الروابط المباشرة و MediaFire و Mega وتنزيلات المتصفح المدمج وتحميلات qBittorrent.',
    quickAddPlaceholder: 'الصق رابطاً مباشراً أو MediaFire أو Mega أو Magnet...',
    quickAddBtn: 'إضافة تنزيل',
    addTorrentFileBtn: 'إضافة .torrent',
    quickAddInvalid: 'أدخل رابط http:// أو https:// أو magnet:? صحيحاً.',
    folderLabel: 'الحفظ في',
    chooseFolder: 'تغيير المجلد',
    openFolder: 'فتح المجلد',
    clearFinished: 'مسح المكتملة',
    tabAll: 'الكل',
    tabActive: 'النشطة',
    tabPaused: 'المتوقفة مؤقتاً',
    tabCompleted: 'المكتملة',
    tabFailed: 'الفاشلة',
    searchPlaceholder: 'تصفية التنزيلات...',
    metricActive: 'النشطة',
    metricSpeed: 'السرعة الكلية',
    metricCompleted: 'المكتملة',
    metricFreeDisk: 'المساحة الحرة',
    statusQueued: 'في الانتظار',
    statusResolving: 'جارٍ فحص الرابط...',
    statusDownloading: 'جارٍ التنزيل',
    statusPaused: 'متوقف مؤقتاً',
    statusCompleted: 'مكتمل',
    statusFailed: 'فشل',
    statusCancelled: 'ملغى',
    sourceDirect: 'رابط مباشر',
    sourceMediafire: 'MediaFire',
    sourceMega: 'Mega',
    sourceQbittorrent: 'qBittorrent',
    sourceBrowser: 'المتصفح المدمج',
    actionPause: 'إيقاف مؤقت',
    actionResume: 'استئناف',
    actionCancel: 'إلغاء',
    actionDelete: 'حذف',
    actionRetry: 'إعادة المحاولة',
    actionOpenFile: 'فتح الملف',
    actionOpenFolder: 'فتح المجلد',
    actionRemove: 'إزالة',
    actionOpenExternal: 'فتح في المتصفح',
    peersLabel: 'الأقران',
    seedsLabel: 'البذور',
    unknownSize: 'حجم غير معروف',
    etaCalculating: 'جارٍ الحساب...',
    torrentConnected: 'qBittorrent متصل',
    torrentDisconnected: 'qBittorrent غير متصل',
    torrentWebPreviewStatus: 'معاينة الويب — المزامنة المباشرة لـ qBittorrent تعمل في SecretArea.exe',
    configureTorrentBtn: 'إعداد qBittorrent',
    speedGraphTitle: 'مخطط سرعة التحميل والرفع',
    periodLabel: 'الفترة:',
    period1m: 'دقيقة واحدة',
    period5m: '5 دقائق',
    period30m: '30 دقيقة',
    period1h: 'ساعة واحدة',
    totalUploadLabel: 'إجمالي الرفع',
    totalDownloadLabel: 'إجمالي التحميل',
    sizeLabel: 'الحجم',
    progressLabel: 'التقدم',
    statusLabel: 'الحالة',
    downSpeedLabel: 'سرعة التحميل',
    upSpeedLabel: 'سرعة الرفع',
    etaLabel: 'الوقت المتبقي',
    ratioLabel: 'النسبة (Ratio)',
    showGraphBtn: 'إظهار مخطط السرعة',
    hideGraphBtn: 'إخفاء مخطط السرعة',
    emptyTitle: 'لا توجد تنزيلات في هذا العرض',
    emptySubtitle: 'الصق أي رابط مباشر أو MediaFire أو Mega أو Magnet أعلاه، أو أضف ملف .torrent، أو اختر قناة تحميل من صفحة أي لعبة.',
    webNoticeTitle: 'وضع معاينة الويب',
    webNoticeBody: 'التحكم بالإيقاف/الاستئناف وعرض السرعة والوقت المتبقي ومزامنة qBittorrent Web UI تعمل داخل تطبيق سطح المكتب SecretArea.exe.',
    startedToast: 'تمت إضافة التنزيل إلى القائمة',
    failedToast: 'تعذر بدء التنزيل',
    detailActiveTitle: 'تنزيلات هذا الإصدار',
    detailManageBtn: 'فتح مدير التنزيلات',
    detailOpenExternal: 'فتح في متصفح خارجي',
    detailStartInApp: 'التحميل داخل SecretArea',
  },
  store: {
    featuredSpotlight: 'اختيار مميز',
    latestRelease: 'أحدث إصدار',
    download: 'تحميل',
    watchTrailer: 'مشاهدة العرض',
    viewDetails: 'التفاصيل',
    exploreCatalog: 'تصفح الكتالوج',
    repackVsOriginal: 'حجم الريباك مقابل الأصلي',
    upcomingGames: 'الألعاب القادمة',
    recentGames: 'أحدث الألعاب',
    canRunTitle: 'هل يعمل على جهازك؟ — موصى به لجهازك',
    canRunSubtitle: 'يقارن تلقائياً الألعاب و Hypervisor و SteamTools و PS5 والأدوات مع متطلبات التشغيل',
    scopeAll: 'الكل',
    scopeGames: 'الألعاب',
    scopeHypervisor: 'Hypervisor',
    scopeSteamTools: 'SteamTools',
    scopePs5: 'PS5',
    scopeTools: 'الأدوات',
    canRunBtn: 'يعمل بكفاءة',
    cannotRunBtn: 'لا يعمل',
    scanPc: 'فحص الجهاز',
    gpuLabel: 'كرت الشاشة',
    cpuLabel: 'المعالج',
    ramLabel: 'الذاكرة',
    freeDriveLabel: 'المساحة الحرة',
    canRunEmptyFail: 'خبر سار — جهازك يلبّي متطلبات جميع العناصر في هذا القسم!',
    canRunEmptyPass: 'لا توجد عناصر مطابقة للتصفية الحالية.',
    canRunCardPass: 'يعمل',
    mostPopularGames: 'الألعاب الأكثر شعبية',
    showAll: 'عرض الكل',
    hideHv: 'إخفاء HV',
    hideGames: 'إخفاء الألعاب',
    newestFirst: 'الأحدث أولاً',
    nameAz: 'أ – ي',
    pageOf: 'صفحة',
    previous: 'السابق',
    next: 'التالي',
    seeMoreNext: 'عرض المزيد · التالي',
    gameSingular: 'لعبة',
    gamePlural: 'ألعاب',
    backToPage1: 'العودة للصفحة 1',
    topStudios: 'أفضل الاستوديوهات',
    viewAllStudios: 'عرض كل الاستوديوهات',
    bestTwoPlayers: 'أفضل ألعاب للاعبين اثنين',
    noCatalogLoaded: 'لا توجد عناصر محمّلة.',
  },
  library: {
    sectionLabel: 'القسم',
    genresIn: 'التصنيفات في',
    allGenres: 'جميع التصنيفات',
    reset: 'إعادة ضبط',
    allCountLabel: 'الكل',
    hide: 'إخفاء',
    show: 'إظهار',
    noMatchingTitles: 'لا توجد عناوين مطابقة.',
    sortBy: 'ترتيب حسب',
    sortSmart: 'ترتيب ذكي (الأفضل والجديد)',
    sortLatest: 'الأحدث أولاً',
    sortAz: 'الاسم: أ ← ي',
    sortZa: 'الاسم: ي ← أ',
    sortFavorites: 'المفضلة أولاً',
    sortSizeAsc: 'الحجم: الأصغر أولاً',
    sortSizeDesc: 'الحجم: الأكبر أولاً',
    sortMirrors: 'أكثر روابط تحميل',
    canRunAll: 'التوافق مع الجهاز: الكل',
    canRunPass: '✓ يعمل على هذا الجهاز',
    canRunFail: '✕ لا يعمل (مواصفات أضعف)',
    clear: 'مسح',
    searchPlaceholder: 'بحث ذكي في',
    emptyTitle: 'لا توجد عناصر تطابق عوامل التصفية الحالية',
    emptySubtitle: 'جرّب مسح البحث أو تغيير التصنيف أو الانتقال إلى قسم آخر.',
    previous: 'السابق',
    next: 'التالي',
    next50: 'الـ 50 عنصر التالي',
    backToPage1: 'العودة للصفحة 1',
    pageOf: 'صفحة',
    newToLibrary: 'جديد في المكتبة',
    pinned: 'مثبت',
    free: 'مجاني',
    canRunCard: '✓ يعمل على جهازك',
  },
  extras: {
    upcomingList: 'قائمة الإصدارات القادمة',
    trailers: 'العروض الدعائية',
    bestSeries: 'أفضل السلاسل',
    topOpenWorld: 'أفضل ألعاب العالم المفتوح',
    videosLabel: 'فيديوهات',
    titleSingular: 'عنوان',
    titlePlural: 'عناوين',
    platforms: 'المنصات',
    watchTrailer: 'مشاهدة العرض',
    noTrailer: 'لا يوجد رابط فيديو متاح.',
    back: 'رجوع',
    seriesPosters: 'ملصقات السلسلة',
    gamesInSeries: 'الألعاب في السلسلة',
    bestBadge: 'الأفضل',
  },
  requests: {
    pageTitle: 'طلبات الألعاب والأدوات',
    formTitle: 'إرسال طلب جديد',
    formSubtitle: 'اطلب الألعاب المفقودة أو التحديثات والإضافات أو أبلغ عن رابط معطّل.',
    titleLabel: 'العنوان',
    titlePlaceholder: 'مثال: Ghost of Yotei أو Forza Horizon 6',
    categoryLabel: 'الفئة',
    coverUrlLabel: 'رابط صورة الغلاف (اختياري)',
    detailsLabel: 'التفاصيل والملاحظات',
    detailsPlaceholder: 'اذكر الريباك المفضّل أو رقم الإصدار أو الإضافات المطلوبة...',
    sending: 'جارٍ الإرسال...',
    submitRequest: 'إرسال الطلب',
    recentRequests: 'الطلبات الأخيرة',
    noRequestsYet: 'لم يتم إرسال أي طلبات بعد.',
    syncedNotice: 'تم إرسال الطلب وحفظه بنجاح!',
    localNotice: 'تم حفظ الطلب في قائمتك المحلية.',
    communitySupportTitle: 'المجتمع ودعم المشروع',
    joinCommunityTitle: 'انضم إلى مجتمعنا',
    joinCommunityDesc: 'احصل على تنبيهات الإصدارات الجديدة وتحديثات الطلبات والدعم المباشر عبر تيليجرام وديسكورد.',
    telegramLabel: 'مجتمع تيليجرام',
    telegramSub: 'تحديثات وإصدارات جديدة ودردشة سريعة',
    discordLabel: 'مجتمع ديسكورد',
    discordSub: 'دعم مباشر وطلبات ومجتمع اللاعبين',
    joinBtn: 'انضم',
    supportBadge: 'ادعم SecretArea',
    supportHeadline: 'ادعم رسالتنا وساعدنا على الاستمرار',
    supportDesc: 'كل مساهمة تساعد في إبقاء مشغّل SecretArea وتحديثات الكتالوج والطلبات مجانية تماماً للجميع.',
    anonMonero: 'مجهول · عملات رقمية و Monero (XMR)',
    openInBrowser: 'فتح في المتصفح',
  },
  studios: {
    backToHome: 'العودة للرئيسية',
    topStudios: 'أفضل الاستوديوهات',
    searchPlaceholder: 'ابحث عن استوديو...',
    noMatch: 'لا توجد استوديوهات مطابقة لبحثك.',
    gameSingular: 'لعبة',
    gamePlural: 'ألعاب',
    aboutStudio: 'حول هذا الاستوديو',
    noOverview: 'لا يوجد وصف متاح لهذا الاستوديو.',
    all: 'الكل',
    back: 'رجوع',
    totalTitleSingular: 'عنوان إجمالي',
    totalTitlePlural: 'عناوين إجمالية',
    noItemsInCategory: 'لا توجد عناوين في هذه الفئة.',
    previous: 'السابق',
    next: 'التالي',
    next20Games: 'الـ 20 لعبة التالية',
    pageOf: 'صفحة',
  },
  detail: {
    back: 'رجوع',
    home: 'الرئيسية',
    releaseDetails: 'تفاصيل الإصدار',
    gameId: 'معرّف اللعبة',
    version: 'الإصدار',
    originalSize: 'الحجم الأصلي',
    downloadSize: 'حجم التحميل',
    repackSize: 'حجم الريباك',
    downloadChannels: 'روابط التحميل',
    channelSingular: 'قناة',
    channelPlural: 'قنوات',
    license: 'الترخيص',
    pinned: 'مثبت',
    standard: 'قياسي',
    free: 'مجاني',
    dateAdded: 'تاريخ الإضافة',
    developerStudio: 'استوديو التطوير',
    repacker: 'الناشر',
    languages: 'اللغات',
    genres: 'التصنيفات',
    watchTrailer: 'مشاهدة العرض',
    trailerGallery: 'العرض والمعرض',
    switchToTrailer: 'الانتقال إلى العرض',
    openTrailer: 'فتح العرض',
    description: 'الوصف',
    noDescription: 'لا يوجد وصف متاح في الكتالوج.',
    requirementsAndCanRun: 'متطلبات التشغيل وفحص التوافق',
    requirementsOnly: 'متطلبات التشغيل',
    tools: 'الأدوات',
    steps: 'خطوات التثبيت',
    completed: 'مكتمل',
    linkedEntries: 'إدخالات مرتبطة',
    hvWarningTitle: 'ما هو Hypervisor Bypass؟',
    hvWarningBody: 'يرجى قراءة هذا الدليل قبل التحميل والتثبيت:',
    noChannels: 'لا توجد روابط تحميل مرفقة بهذا العنصر.',
    recommendedTag: 'موصى به',
    recommendedForYou: 'موصى به لك',
    canRunItTitle: 'هل يعمل على جهازك؟',
    thisPcAuto: 'هذا الجهاز (تلقائي)',
    customPc: 'جهاز مخصص',
    detectedPc: 'المواصفات المكتشفة',
    thisPcVsMinimum: 'جهازك مقابل الحد الأدنى',
    scan: 'فحص',
    myPc: 'جهازي',
    close: 'إغلاق',
    yourPcCanRun: 'جهازك · التوافق',
    runsWell: 'يعمل بكفاءة',
    cantRun: 'لا يعمل',
    checkSpecs: 'فحص المواصفات',
    weakPrefix: 'نقطة ضعف',
    estimated: 'تقديري',
    needsPrefix: 'يتطلب',
    pcSpecsHeading: 'مواصفات جهازك',
    resetAuto: 'استعادة الكشف التلقائي',
    gpuInput: 'كرت الشاشة (GPU)',
    cpuInput: 'المعالج (CPU)',
    ramInput: 'الذاكرة العشوائية (GB)',
    spaceInput: 'المساحة الحرة (GB، اختياري)',
    cancel: 'إلغاء',
    compareSpecs: 'مقارنة المواصفات',
    osLabel: 'نظام التشغيل',
    ramLabel: 'الذاكرة / RAM',
    cpuLabel: 'المعالج / CPU',
    gpuLabel: 'كرت الشاشة / GPU',
    noReqsListed: 'لم يتم إدراج متطلبات تشغيل محددة.',
    positive: 'إيجابي',
    negative: 'سلبي',
  },
  qbitSetup: {
    modalTitle: 'التثبيت التلقائي لبرنامج qBittorrent',
    modalSubtitle: 'الكشف التلقائي على ويندوز، التحقق من التوقيع وSHA-256، وإعداد واجهة الويب المحلية.',
    stepChecking: 'جارٍ فحص المتطلبات...',
    stepDetecting: 'جارٍ الكشف عن qBittorrent...',
    stepDownloading: 'جارٍ تنزيل qBittorrent...',
    stepVerifying: 'جارٍ التحقق من ملف التثبيت...',
    stepInstalling: 'جارٍ تثبيت qBittorrent...',
    stepConfiguring: 'جارٍ تهيئة التكامل...',
    stepCompleted: 'اكتمل الإعداد.',
    installedLabel: 'الإصدار المثبت',
    notInstalledValue: 'غير مثبت',
    latestLabel: 'أحدث إصدار رسمي',
    processLabel: 'الحالة',
    processRunning: 'قيد التشغيل',
    processStopped: 'متوقف',
    statusUpToDate: 'برنامج qBittorrent محدّث بالفعل إلى أحدث إصدار. لا حاجة لإعادة التثبيت.',
    statusNewerInstalled: 'الإصدار المثبت لديك أحدث من الإصدار الرسمي الحالي. لن يقوم SecretArea بالرجوع لإصدار أقدم.',
    statusUpdateAvailable: 'يتوفر تحديث رسمي مستقر جديد لبرنامج qBittorrent جاهز للتثبيت.',
    statusNotInstalled: 'لم يتم العثور على qBittorrent على هذا الجهاز. يمكن لـ SecretArea تنزيل المثبت الرسمي 64-بت، التحقق من سلامته، وتثبيته تلقائياً.',
    statusRunningBlocked: 'برنامج qBittorrent يعمل حالياً. يرجى إغلاقه بشكل طبيعي حتى لا تنقطع التحميلات الجارية، ثم اضغط فحص مرة أخرى.',
    statusLookupFailed: 'تعذر الوصول إلى بيانات أحدث إصدار رسمي حالياً.',
    consentNote: 'بالضغط على تثبيت/تحديث، يقوم SecretArea بتنزيل مثبت 64-بت الرسمي مباشرة من GitHub/qbittorrent.org والتحقق من SHA-256 قبل تشغيله.',
    installBtn: 'تنزيل وتثبيت qBittorrent',
    updateBtn: 'تحديث qBittorrent الآن',
    recheckBtn: 'فحص مرة أخرى',
    retryBtn: 'إعادة المحاولة',
    skipBtn: 'ليس الآن',
    closeBtn: 'تم',
    officialDownloadBtn: 'صفحة التنزيل الرسمية',
    launchQbitBtn: 'فتح qBittorrent',
    shaVerifiedLabel: 'تم التحقق من SHA-256',
    sigVerifiedLabel: 'تم التحقق من التوقيع الرقمي',
    unsignedVerifiedNote: 'مثبت مفتوح المصدر · تم التحقق من بصمة SHA-256 الرسمية',
    webUiSectionTitle: 'إعداد واجهة الويب لـ qBittorrent (127.0.0.1 فقط)',
    webUiDetectedEnabled: 'واجهة الويب مفعلة في إعدادات qBittorrent.',
    webUiNotEnabledHint: 'واجهة الويب غير مفعلة بعد. اتبع الخطوات التالية داخل qBittorrent ثم اضغط حفظ والتحقق من الاتصال:',
    webUiLoopbackWarning: 'عنوان IP لواجهة الويب غير مقيد على 127.0.0.1. اضبط IP على 127.0.0.1 لحماية جهازك.',
    webUiGuide1: '1. افتح qBittorrent ← Tools (الأدوات) ← Options (الخيارات) ← Web UI.',
    webUiGuide2: '2. فعّل خيار "Web User Interface (Remote control)".',
    webUiGuide3: '3. اضبط عنوان IP على 127.0.0.1 والمنفذ (Port) على 8080.',
    webUiGuide4: '4. أدخل اسم المستخدم وكلمة المرور (أو أنشئ كلمة مرور قوية أدناه) ثم اضغط Apply / OK.',
    webUiGuide5: '5. أدخل نفس البيانات أدناه واضغط حفظ والتحقق من الاتصال.',
    generatePasswordBtn: 'توليد كلمة مرور قوية',
    saveAndVerifyBtn: 'حفظ والتحقق من الاتصال',
    verifyingBtn: 'جارٍ التحقق...',
    webUiConnectedMsg: 'متصل وموثق! SecretArea جاهز لتحميل روابط Magnet وملفات .torrent.',
    openSettingsBtn: 'فتح الإعدادات',
    webPreviewNotice: 'يعمل التثبيت التلقائي داخل تطبيق سطح المكتب SecretArea.exe على ويندوز فقط.',
  },
  presentMonSetup: {
    sectionTitle: 'أداة Intel PresentMon (محرك قياس FPS ووقت الإطار)',
    sectionSubtitle: 'كشف تلقائي، تحديثات رسمية من GitHub Releases، وتحقق أمني من التوقيع الرقمي وبصمة SHA-256.',
    modalTitleInstall: 'تفعيل مراقبة أداء الألعاب',
    modalTitleUpdate: 'تحديث Intel PresentMon',
    modalTitleRepair: 'إصلاح تثبيت PresentMon',
    modalTitleManage: 'مدير أداة Intel PresentMon',
    modalSubtitle: 'محرك قياس ETW الرسمي من Intel بإدارة تلقائية كاملة داخل SecretArea لسطح المكتب.',
    benefitsHeading: 'ما يقدمه PresentMon داخل SecretArea',
    benefit1: 'قياس حقيقي لمعدل الإطارات FPS و 1% Low و 0.1% Low عبر ETW بدون حقن في الألعاب',
    benefit2: 'مراقبة وقت الإطار Frame Time واكتشاف التقطيع والتهنيج ووقت الاستجابة',
    benefit3: 'تحليل اختناقات المعالج وكرت الشاشة CPU/GPU أثناء جلسات اللعب',
    stepChecking: 'جارٍ فحص التثبيت الحالي والبحث عن أحدث إصدار رسمي على GitHub...',
    stepDownloading: 'جارٍ تنزيل ملف PresentMon x64 الرسمي...',
    stepVerifying: 'جارٍ التحقق من بصمة SHA-256 وتوقيع شركة Intel الرقمي...',
    stepInstalling: 'جارٍ التثبيت وفحص توافق أوامر التشغيل...',
    stepCompleted: 'تم تثبيت PresentMon والتحقق منه بنجاح وهو جاهز لمراقبة FPS.',
    stepCancelled: 'تم إلغاء التنزيل بأمان دون أي تعديل على ملفاتك.',
    statusReady: 'مثبت وجاهز',
    statusNotInstalled: 'غير مثبت',
    statusUpdateAvailable: 'يتوفر تحديث جديد',
    statusRepairRequired: 'يحتاج إلى إصلاح',
    statusNewerInstalled: 'محدث (إصدار محلي أحدث)',
    statusDeclined: 'معطل باختيار المستخدم (اختياري)',
    statusChecking: 'جارٍ الفحص...',
    statusWebPreview: 'متاح لتطبيق ويندوز فقط',
    installedVersionLabel: 'الإصدار المثبت',
    latestVersionLabel: 'أحدث إصدار رسمي',
    downloadSizeLabel: 'حجم التنزيل',
    installPathLabel: 'مسار التثبيت',
    sourceLabel: 'المصدر الرسمي',
    notInstalledValue: 'غير مثبت',
    allowInstallBtn: 'السماح والتثبيت',
    notNowBtn: 'ليس الآن',
    updateNowBtn: 'تحديث الآن',
    laterBtn: 'لاحقاً',
    repairBtn: 'إصلاح التثبيت',
    reinstallBtn: 'إعادة تثبيت PresentMon',
    checkUpdatesBtn: 'التحقق من التحديثات',
    checkingBtn: 'جارٍ الفحص...',
    cancelDownloadBtn: 'إلغاء',
    retryBtn: 'إعادة المحاولة',
    doneBtn: 'تم',
    officialReleasesBtn: 'إصدارات GitHub الرسمية',
    enablePresentMonBtn: 'تثبيت / تفعيل PresentMon',
    managePresentMonBtn: 'إدارة PresentMon',
    shaVerifiedLabel: 'تم التحقق من بصمة SHA-256',
    sigVerifiedLabel: 'تم التحقق من توقيع Intel Corporation الرقمي',
    consentNote: 'لا يقوم SecretArea بتنزيل أو تثبيت PresentMon أبداً بدون موافقتك الصريحة. يتم جلب الملفات حصرياً عبر HTTPS من GitHub Releases مع التحقق من SHA-256 وتوقيع Intel.',
    runningConflictMsg: 'توجد نسخة أخرى من PresentMon تعمل حالياً على جهازك. أغلقها ثم اضغط إعادة المحاولة.',
    corruptedIssuePrefix: 'مشكلة مكتشفة',
    declinedBannerTitle: 'تم تأجيل تفعيل مراقبة FPS عبر PresentMon',
    declinedBannerDesc: 'يستمر SecretArea بالعمل بشكل كامل لمراقبة المعالج وكرت الشاشة والرام والتخزين والبنغ. يمكنك تثبيت PresentMon في أي وقت.',
    lookupErrorMsg: 'تعذر الوصول إلى GitHub Releases للتحقق من أحدث إصدار لـ PresentMon حالياً.',
  },
  onboarding: {
    stepWelcome: 'الترحيب',
    stepAppearance: 'المظهر واللغة',
    stepQbitCheck: 'فحص qBittorrent',
    stepQbitIntegration: 'ربط التكامل',
    stepReady: 'جاهز',
    firstTimeNotice: 'إعداد لمرة واحدة عند أول تشغيل بعد التثبيت',
    welcomeEyebrow: 'SecretArea لسطح المكتب',
    welcomeTitle: 'مرحباً بك في SecretArea',
    welcomeSubtitle: 'خصّص المظهر واللغة وأدوات التحميل في أقل من دقيقة قبل الدخول إلى مساحة العمل.',
    welcomeFeature1Title: '01. المظهر واللغة',
    welcomeFeature1Desc: 'اختر الوضع الداكن أو الفاتح أو PS5 أو Xbox Nexus أو أنشئ مظهرك المخصص بـ 4 لغات.',
    welcomeFeature2Title: '02. فحص qBittorrent',
    welcomeFeature2Desc: 'يكتشف التثبيت المسبق على جهازك تلقائياً أو يثبّت النسخة الرسمية الموثوقة 64-بت.',
    welcomeFeature3Title: '03. المزامنة و PresentMon',
    welcomeFeature3Desc: 'ربط مشفّر لواجهة الويب المحلية، تنبيهات الكتالوج المباشرة، وتفعيل Intel PresentMon لقياس الإطارات.',
    getStartedBtn: 'ابدأ الإعداد الآن',
    skipAllBtn: 'الدخول مباشرة',
    appearanceTitle: 'تخصيص المظهر واللغة',
    appearanceSubtitle: 'تُطبق كل اختياراتك مباشرة هنا. ويمكنك تغيير أي شيء لاحقاً من صفحة الإعدادات.',
    themePickerLabel: 'مظهر التطبيق',
    languagePickerLabel: 'لغة الواجهة',
    themeDarkName: 'الوضع الداكن',
    themeDarkDesc: 'مظهر داكن مريح بتباين احترافي',
    themeLightName: 'الوضع الفاتح',
    themeLightDesc: 'تصميم نهاري مشرق وواضح',
    themePs5Name: 'بلايستيشن 5',
    themePs5Desc: 'أضواء ياقوتية زرقاء وأصوات الكونسول',
    themeXboxName: 'إكس بوكس نيكسوس',
    themeXboxDesc: 'شبكة زمردية خضراء وتوهج Xbox الكلاسيكي',
    settingsEditableNote: 'يمكنك تعديل الصوتيات وتخطيط الشريط والمظهر لاحقاً من الإعدادات.',
    backBtn: 'السابق',
    continueBtn: 'متابعة',
    qbitCheckTitle: 'فحص تثبيت qBittorrent',
    qbitCheckSubtitle: 'يتحقق SecretArea من جهازك أولاً للحفاظ على أي تثبيت سابق لبرنامج qBittorrent.',
    scanningText: 'جارٍ فحص الجهاز بحثاً عن تثبيت qBittorrent...',
    alreadyInstalledTitle: 'برنامج qBittorrent مثبت بالفعل على جهازك',
    alreadyInstalledDesc: 'رائع! بما أن qBittorrent كان مثبتاً قبل SecretArea، انتقل إلى الخطوة التالية لإضافة إعدادات التكامل والربط.',
    goIntegrationBtn: 'إضافة إعدادات تكامل qBittorrent',
    updateFirstBtn: 'تحديث qBittorrent أولاً',
    notInstalledTitle: 'برنامج qBittorrent غير مثبت بعد',
    notInstalledDesc: 'قم بتنزيل وتثبيت النسخة الرسمية 64-بت الموثوقة تلقائياً، ثم انتقل مباشرة إلى إعدادات التكامل.',
    installAndNextBtn: 'تثبيت qBittorrent والمتابعة',
    installCompleteAdvanceMsg: 'تم تثبيت qBittorrent والتحقق منه بنجاح! جارٍ الانتقال لإعدادات التكامل...',
    skipTorrentBtn: 'تخطي إعداد التورنت (التنزيل المباشر فقط)',
    integrationTitle: 'إعدادات تكامل qBittorrent',
    integrationSubtitle: 'أضف بيانات واجهة الويب المحلية لمتابعة السرعة، البذور، الأقران، الوقت المتبقي، ونسبة التقدم.',
    hostLoopbackHint: 'مقيد على 127.0.0.1 فقط (اتصال محلي) ومحفوظ بتشفير Electron safeStorage.',
    finishSetupBtn: 'إنهاء الإعداد',
    skipIntegrationBtn: 'تخطي والإعداد لاحقاً من الإعدادات',
    finalizingPhase1: 'حفظ المظهر واللغة...',
    finalizingPhase2: 'تجهيز التنزيلات والتورنت...',
    finalizingPhase3: 'تم تجهيز كل شيء بنجاح!',
    congratsEyebrow: 'اكتمل الإعداد',
    congratsTitle: 'تهانينا! SecretArea Desktop جاهز الآن.',
    congratsSubtitle: 'جاهز للتنزيلات السريعة ومراقبة الإطارات والعتاد.',
    summaryThemeLabel: 'المظهر النشط',
    summaryLanguageLabel: 'اللغة',
    summaryTorrentLabel: 'qBittorrent',
    summaryTorrentConnected: 'متصل وموثق',
    summaryTorrentInstalled: 'مثبت (ربط من الإعدادات)',
    summaryTorrentSkipped: 'تم التخطي (اختياري)',
    changeLaterHint: 'يمكنك تغيير المظهر واللغة والمجلد وإعدادات qBittorrent في أي وقت من الإعدادات.',
    enterAppBtn: 'الدخول إلى SecretArea',
    openSettingsPageBtn: 'مراجعة في الإعدادات',
    whatIsSecretAreaTitle: 'ما هو برنامج SecretArea؟',
    whatIsSecretAreaBody: 'هدفنا بسيط: جمع أفضل الألعاب في مكان واحد، لتقضي وقتاً أقل في البحث ووقتاً أطول في اللعب.',
    whatIsSecretAreaPoint1: 'تصفح أقسام الألعاب و Hypervisor و SteamTools و PS5 والأدوات والتخزينات مع فحص تشغيل الألعاب ومراقبة الإطارات والعتاد مباشرة.',
    whatIsSecretAreaPoint2: 'تنزيل سلس مع دعم الإيقاف والاستئناف للروابط المباشرة و MediaFire و Mega والمتصفح المدمج، بالإضافة إلى مزامنة qBittorrent الاختيارية.',
    whatIsSecretAreaPoint3: 'التبديل في أي وقت بين الوضع الداكن والفاتح و PS5 و Xbox Nexus أو منشئ المظهر المخصص بـ 4 لغات منها العربية RTL مع مركز الإشعارات وسجل التحديثات.',
    whatIsSecretAreaPoint4: 'أداة Intel PresentMon (اختيارية): يعتمد التطبيق على أداة Intel PresentMon الرسمية الموقّعة عبر ETW لقياس الإطارات الحقيقية FPS و 1% Low وزمن الإطار دون حقن الألعاب — وسيُطلب إذنك قبل تثبيتها.',
    presentMonNotice: 'حول PresentMon: بعد دخول التطبيق قد يطلب SecretArea إذنك لتثبيت Intel PresentMon (اختيارياً) لتمكين قياس FPS الحقيقي وزمن الإطار في مراقب العتاد.',
    readySummaryHeading: 'ملخص مساحة العمل',
    readyClickToEdit: 'اضغط للتعديل',
    readyLaunchHeading: 'منصة التشغيل الذكية',
    readyDestinationHint: 'اختر واجهة البدء',
    readyStartStoreTitle: 'المتجر والكتالوج',
    readyStartStoreDesc: 'تصفح الألعاب والأدوات والتنزيلات',
    readyStartSettingsTitle: 'الإعدادات والتكامل',
    readyStartSettingsDesc: 'ضبط المجلدات والصوت وواجهة الويب',
    presentMonShortLabel: 'Intel PresentMon',
    presentMonShortDesc: 'طلب تفعيل اختياري لقياس FPS بعد الدخول',
    readyEditableShortLabel: 'قابل للتعديل دائماً',
    readyEditableShortDesc: 'المظهر واللغة والمسارات متاحة دائماً',
    readyStatusDone: 'جاهز',
    readyStatusSyncing: 'تجهيز',
    stepGuideLabel: 'ماذا تفعل في هذه الخطوة؟',
    step1Guide: 'يعرّفك هذا الدليل السريع من 5 خطوات على برنامج SecretArea ويساعدك في ضبط المظهر واللغة ومحرك التحميل الاختياري مع التعريف بأداة PresentMon قبل الدخول للتطبيق.',
    step2Guide: 'اختر مظهراً جاهزاً أو افتح منشئ المظهر المخصص لتعديل الألوان والأزرار والحواف مع اختيار لغة الواجهة — وتظهر النتيجة فوراً أمامك.',
    step3Guide: 'يفحص SecretArea جهازك للتحقق مما إذا كان qBittorrent مثبتاً مسبقاً للحفاظ على إعداداتك دون مساس، أو تثبيت النسخة الرسمية بضغطة زر عند الحاجة.',
    step4Guide: 'اربط SecretArea بواجهة الويب المحلية (127.0.0.1 فقط) لمتابعة روابط Magnet وملفات .torrent بالسرعة والبذور والأقران والوقت المتبقي مباشرة.',
    step5Guide: 'راجع ملخص الاختيارات التي قمت بضبطها الآن. ويمكنك تعديل أي إعداد منها لاحقاً في أي وقت من صفحة الإعدادات.',
    platformHint: 'تصميم متجاوب للشاشات الصغيرة والكبيرة',
  },
  updater: {
    title: 'حول التطبيق والتحديثات',
    subtitle: 'تطبيق سطح المكتب SecretArea',
    currentVersionLabel: 'الإصدار المثبت حالياً',
    checkBtn: 'التحقق من التحديثات',
    checkingBtn: 'جارٍ التحقق...',
    upToDateMsg: 'أنت تستخدم أحدث إصدار بالفعل.',
    checkingMsg: 'جارٍ فحص GitHub Releases للبحث عن إصدار أحدث...',
    newVersionAvailable: 'يتوفر إصدار جديد',
    whatsNewTitle: 'ما الجديد في هذا التحديث',
    whatsNewCountSuffix: 'تحديثات',
    categoryFeature: 'جديد',
    categoryImprovement: 'تحسين',
    categoryFix: 'إصلاح',
    downloadUpdateBtn: 'تنزيل التحديث',
    downloadingPrefix: 'جارٍ التنزيل',
    readyToInstall: 'جاهز للتثبيت الآن',
    readyToInstallDesc: 'اضغط التثبيت وإعادة التشغيل لتحديث نسختك السابقة الآن، أو قم بالتأجيل لمواصلة العمل وتثبيت التحديث عند إغلاق التطبيق.',
    installRestartBtn: 'تثبيت وإعادة التشغيل',
    postponeBtn: 'تأجيل',
    laterBtn: 'لاحقاً',
    detailsBtn: 'ما الجديد',
    toastUpdateAvailable: 'يتوفر تحديث جديد',
    toastUpdateReady: 'التحديث جاهز',
    toastDownloading: 'جارٍ التنزيل',
    installedVersionLabel: 'الإصدار المثبت',
    restartHint: 'أعد تشغيل SecretArea لإكمال التثبيت.',
    lastCheckedLabel: 'آخر فحص',
    errorFallback: 'تعذر التحقق من التحديثات حالياً.',
    preparingDownload: 'جارٍ تجهيز التنزيل...',
  },
  hardware: {
    pageTitle: 'مراقب العتاد',
    pageSubtitle: 'قراءات حية لأداء المعالج والرسوميات والذاكرة والتخزين والشبكة ودرجات الحرارة.',
    startMonitoring: 'بدء المراقبة',
    stopMonitoring: 'إيقاف المراقبة',
    refreshNow: 'تحديث الآن',
    statusActive: 'المراقبة نشطة',
    statusStopped: 'المراقبة متوقفة',
    statusWebPreview: 'معاينة الويب',
    intervalLabel: 'معدل التحديث',
    interval1s: '1ث',
    interval1500ms: '1.5ث',
    interval2s: '2ث',
    interval3s: '3ث',
    interval5s: '5ث',
    naValue: 'غير متاح',
    unsupportedHint: 'الحساس غير مدعوم أو غير متاح على هذا النظام',
    webPreviewTitle: 'يتطلب تطبيق سطح المكتب',
    webPreviewBody: 'لا يمكن لمعاينة الويب الوصول إلى مستشعرات العتاد مباشرة. شغّل تطبيق SecretArea Desktop لقراءة بيانات المعالج وكرت الشاشة والذاكرة والأقراص والشبكة.',
    sectionOverview: 'نظرة عامة على النظام',
    sectionPerformance: 'الأداء المباشر',
    sectionDetails: 'تفاصيل العتاد',
    cpuTitle: 'المعالج (CPU)',
    gpuTitle: 'بطاقة الرسوميات (GPU)',
    ramTitle: 'الذاكرة العشوائية (RAM)',
    storageTitle: 'أقراص التخزين',
    networkTitle: 'نشاط الشبكة',
    modelLabel: 'الطراز',
    manufacturerLabel: 'الشركة المصنّعة',
    usageLabel: 'الاستهلاك',
    temperatureLabel: 'درجة الحرارة',
    clockSpeedLabel: 'التردد',
    coresThreadsLabel: 'الأنوية / المسارات',
    coresUnit: 'أنوية',
    threadsUnit: 'مسارات',
    powerLabel: 'استهلاك الطاقة',
    perCoreUsageLabel: 'حمل المسارات المنطقية',
    vramLabel: 'ذاكرة الفيديو VRAM',
    fanSpeedLabel: 'سرعة المروحة',
    noGpuDetected: 'لم يتم رصد قراءات كرت الشاشة على هذا الجهاز.',
    totalRamLabel: 'إجمالي الذاكرة',
    usedRamLabel: 'المستخدم',
    availableRamLabel: 'المتاح',
    memoryTypeLabel: 'نوع الذاكرة',
    memorySpeedLabel: 'تردد الذاكرة',
    driveTypeLabel: 'نوع القرص',
    capacityLabel: 'السعة الإجمالية',
    usedSpaceLabel: 'المساحة المستخدمة',
    freeSpaceLabel: 'المساحة الحرة',
    readSpeedLabel: 'سرعة القراءة',
    writeSpeedLabel: 'سرعة الكتابة',
    noStorageDetected: 'لم يتم رصد أقراص تخزين.',
    activeInterfaceLabel: 'المحول النشط',
    linkStateLabel: 'حالة الاتصال',
    linkSpeedLabel: 'سرعة الرابط',
    downloadSpeedLabel: 'سرعة التنزيل',
    uploadSpeedLabel: 'سرعة الرفع',
    totalRxLabel: 'إجمالي المستلم',
    totalTxLabel: 'إجمالي المرسل',
    noNetworkDetected: 'لا يوجد محول شبكة نشط.',
    uptimeLabel: 'مدة التشغيل',
    hostLabel: 'الجهاز',
    chartCpuRamTitle: 'نسبة استخدام المعالج والذاكرة (%)',
    chartGpuTempTitle: 'حمل كرت الشاشة (%) ودرجات الحرارة (°C)',
    chartNetworkTitle: 'معدل نقل الشبكة',
    chartCpuLoad: 'حمل المعالج',
    chartRamLoad: 'حمل الذاكرة',
    chartGpuLoad: 'حمل الرسوميات',
    chartCpuTemp: 'حرارة المعالج',
    chartGpuTemp: 'حرارة كرت الشاشة',
    chartNetDownload: 'التنزيل',
    chartNetUpload: 'الرفع',
    peakLabel: 'الذروة',
    avgLabel: 'المتوسط',
    lastUpdatedLabel: 'آخر قراءة',
    tabOverview: 'مراقبة العتاد',
    tabGaming: 'أداء الألعاب والاختناق',
    tabTechnologies: 'تقنيات الرسوميات والشاشة',
    tabCleaner: 'تنظيف الجهاز الآمن',
    cpuSeriesLabel: 'السلسلة',
    cpuGenerationLabel: 'الجيل',
    ramChannelsLabel: 'القنوات',
    ramSlotsLabel: 'المنافذ المستخدمة',
    gamingTitle: 'مركز مراقبة أداء الألعاب',
    gamingSubtitle: 'قياس الإطارات (FPS) وزمن الإطار عبر PresentMon ETW دون حقن، مع قياس Ping وتحليل اختناق العتاد متعدد العينات.',
    gamingSelectProcess: 'اللعبة أو العملية المستهدفة',
    gamingAllProcesses: 'النافذة النشطة حالياً',
    gamingRefreshProcesses: 'تحديث العمليات',
    gamingPingHost: 'عنوان قياس Ping',
    gamingStartSession: 'بدء جلسة مراقبة',
    gamingStopSession: 'إيقاف الجلسة',
    gamingSessionActive: 'الجلسة نشطة',
    gamingSessionDuration: 'المدة',
    gamingPresentMonMissingTitle: 'أداة PresentMon ETW غير مثبتة — قراءات FPS غير متاحة',
    gamingPresentMonMissingDesc: 'لا يقوم SecretArea بتزييف الإطارات أو حقن الألعاب أبداً. ضع PresentMon.exe في resources/bin/PresentMon.exe أو %LOCALAPPDATA%\\Intel\\PresentMon لالتقاط FPS الحقيقي و 1% Low و Frame Time.',
    gamingPresentMonReady: 'PresentMon ETW جاهز',
    gamingFpsCurrent: 'FPS الحالي',
    gamingFpsAvg: 'متوسط FPS',
    gamingFps1Low: '1% Low FPS',
    gamingFps01Low: '0.1% Low FPS',
    gamingFpsMax: 'أعلى FPS',
    gamingFrameTimeAvg: 'متوسط زمن الإطار',
    gamingFrameTimeP95: 'زمن الإطار P95',
    gamingFramePacing: 'استقرار الإطارات',
    gamingSpikes: 'القفزات المفاجئة',
    gamingStutters: 'التقطيع (Stutters)',
    gamingDroppedFrames: 'إطارات مفقودة',
    gamingFrameTimeChartTitle: 'مخطط زمن الإطار الحي (مللي ثانية)',
    gamingNetworkLatencyTitle: 'الشبكة والحالة الحرارية',
    gamingPingLabel: 'زمن الاستجابة Ping',
    gamingPacketLossLabel: 'فقدان الحزم',
    gamingInputLatencyLabel: 'زمن استجابة الإدخال',
    gamingThrottlingLabel: 'الاختناق الحراري',
    gamingThrottlingDetected: 'تم رصد اختناق حراري',
    gamingThrottlingNormal: 'الحرارة ضمن الحد الآمن',
    gamingBottleneckTitle: 'تحليل اختناق الأداء (Bottleneck)',
    gamingBottleneckWarming: 'جارٍ جمع 5 عينات متتالية على الأقل قبل إصدار تحليل الاختناق لضمان الدقة...',
    gamingHistoryTitle: 'سجل جلسات اللعب المحفوظة',
    gamingHistoryEmpty: 'لا توجد جلسات محفوظة بعد. ابدأ جلسة وأنهِها لحفظ الأداء والحرارة.',
    gamingClearHistory: 'مسح السجل',
    gamingCompareTitle: 'مقارنة جلستين',
    gamingCompareSelectA: 'الجلسة الأولى',
    gamingCompareSelectB: 'الجلسة الثانية',
    techTitle: 'تقنيات كروت الشاشة وقدرات النظام',
    techSubtitle: 'مصفوفة الدعم الفعلية لتقنيات NVIDIA و AMD و Intel مع التوضيح الدقيق لما يتطلب دعماً داخل اللعبة.',
    techStatusSupported: 'مدعوم',
    techStatusDetected: 'تم الرصد',
    techStatusActive: 'مفعّل',
    techStatusUnsupported: 'غير مدعوم',
    techStatusUnavailable: 'غير متاح',
    techStatusRequiresGame: 'يتطلب دعم اللعبة',
    techStatusRequiresDriver: 'يتطلب تعريف / SDK',
    techArchitectureLabel: 'المعمارية',
    techDriverLabel: 'إصدار التعريف',
    techRebarLabel: 'Resizable BAR / SAM',
    displayTitle: 'الشاشة وإعدادات الألعاب في ويندوز',
    displayPrimaryLabel: 'الشاشة الأساسية',
    displayResolutionLabel: 'الدقة',
    displayRefreshRateLabel: 'معدل التحديث',
    displayConnectionLabel: 'نوع التوصيل',
    displayActiveGpuLabel: 'كرت الشاشة النشط',
    displayDirectXLabel: 'دعم DirectX',
    displayHagsLabel: 'جدولة GPU المسرّعة (HAGS)',
    displayGameModeLabel: 'وضع الألعاب في ويندوز',
    displayHdrLabel: 'دعم HDR',
    displayVrrLabel: 'معدل التحديث المتغير VRR',
    laptopTitle: 'بطارية اللابتوب وإدارة الطاقة',
    laptopBatteryLabel: 'نسبة الشحن',
    laptopPowerStateLabel: 'مصدر الطاقة',
    laptopPluggedIn: 'متصل بالشاحن',
    laptopOnBattery: 'على البطارية',
    laptopCharging: 'جارٍ الشحن',
    laptopHealthLabel: 'صحة البطارية',
    laptopPowerPlanLabel: 'خطة الطاقة النشطة',
    laptopHybridGpuLabel: 'وضع الرسوميات الهجين',
    laptopDesktopNotice: 'لم يتم رصد بطارية — يعمل الجهاز ككمبيوتر مكتبي.',
    cleanerTitle: 'منظف الجهاز الآمن والذاكرة المؤقتة',
    cleanerSubtitle: 'افحص الملفات المؤقتة أولاً، راجع المسارات والأحجام الدقيقة، ثم أكّد التنظيف بأمان.',
    cleanerSafetyBannerTitle: 'حماية صارمة للملفات الشخصية والألعاب',
    cleanerSafetyBannerDesc: 'لا يقترب SecretArea أبداً من سطح المكتب أو المستندات أو التنزيلات أو الصور أو الفيديو أو الألعاب أو ملفات الحفظ أو المودات أو النظام أو كلمات مرور وسجل المتصفح.',
    cleanerScanBtn: 'فحص المسارات الآمنة',
    cleanerScanningBtn: 'جارٍ الفحص...',
    cleanerCleanBtn: 'مراجعة وتنظيف المحدد',
    cleanerCleaningBtn: 'جارٍ التنظيف...',
    cleanerSelectSafeDefaults: 'تحديد الآمن الموصى به',
    cleanerEstimatedTotal: 'المساحة المتوقعة',
    cleanerOptInBadge: 'اختياري بحذر',
    cleanerOptInWarningDesc: 'خيار إضافي غير محدد تلقائياً. حذف كاش التظليل قد يسبب تقطيعاً مؤقتاً لإعادة البناء، وإفراغ سلة المحذوفات نهائي.',
    cleanerPathsLabel: 'المسارات المشمولة',
    cleanerConfirmTitle: 'تأكيد تنظيف الجهاز',
    cleanerConfirmDesc: 'راجع الفئات المحددة أدناه قبل حذف الملفات المؤقتة نهائياً.',
    cleanerConfirmAction: 'تأكيد وتنفيذ التنظيف',
    cleanerCancelAction: 'إلغاء',
    cleanerProgressCleaning: 'جارٍ تنظيف المسارات المحددة...',
    cleanerReportTitle: 'اكتمل التنظيف بنجاح',
    cleanerReportFreed: 'المساحة المحررة',
    cleanerReportRemoved: 'الملفات المحذوفة',
    cleanerReportSkipped: 'ملفات مقيدة تم تخطيها',
    cleanerCatOldTempTitle: 'ملفات النظام المؤقتة القديمة (>48 ساعة)',
    cleanerCatOldTempDesc: 'الملفات المؤقتة الأقدم من 48 ساعة في مجلد النظام المؤقت.',
    cleanerCatUserTempTitle: 'مجلد المستخدم المؤقت',
    cleanerCatUserTempDesc: 'الملفات المؤقتة لتطبيقات المستخدم داخل %TEMP%.',
    cleanerCatAppCacheTitle: 'ذاكرة التطبيقات المؤقتة',
    cleanerCatAppCacheDesc: 'تقارير الأعطال والملفات المؤقتة الآمنة.',
    cleanerCatSecretAreaCacheTitle: 'ذاكرة SecretArea المؤقتة',
    cleanerCatSecretAreaCacheDesc: 'كاش المتصفح والرسوميات الداخلي لتطبيق SecretArea فقط.',
    cleanerCatThumbnailTitle: 'كاش صور المصغرات في ويندوز',
    cleanerCatThumbnailDesc: 'ملفات thumbcache_*.db التي يعيد ويندوز بناءها تلقائياً.',
    cleanerCatShaderTitle: 'كاش تظليل DirectX وبطاقة الشاشة',
    cleanerCatShaderDesc: 'ملفات D3DSCache وكاش التعريفات. ستعيد الألعاب بناءه تلقائياً.',
    cleanerCatRecycleTitle: 'سلة المحذوفات',
    cleanerCatRecycleDesc: 'إفراغ سلة المحذوفات في ويندوز بشكل نهائي.',
    cleanerCatBrowserTitle: 'كاش المتصفح المؤقت فقط (دون السجل)',
    cleanerCatBrowserDesc: 'يحذف كاش HTTP في Edge و Chrome و Firefox فقط مع الحفاظ الكامل على الحسابات والكوكيز والمفضلة والسجل.',
    tabHealth: 'الصحة والتشخيص',
    tabInventoryPorts: 'النظام والمنافذ',
    tabAdvisors2030: 'المستشار و 2030+',
    tabBenchmarksDb: 'الاختبارات وقاعدة البيانات',
    provDetected: 'مكتشف',
    provMeasured: 'مُقاس',
    provSpec: 'مواصفة مصنعية',
    provEstimated: 'تقديري',
    provNotSupported: 'غير مدعوم',
    provNotDetected: 'غير مكتشف',
    provSensorUnavailable: 'المستشعر غير متاح',
    provRequiresAdmin: 'يتطلب صلاحيات المسؤول',
    provUnknown: 'غير معروف',
    workloadProfileLabel: 'نوع الاستخدام الأساسي',
    workloadGaming: 'الألعاب',
    workloadOffice: 'العمل المكتبي واليومي',
    workloadProgramming: 'البرمجة والأنظمة الوهمية',
    workload3d: 'التصميم والتصيير ثلاثي الأبعاد',
    workloadVideo: 'مونتاج الفيديو',
    workloadDesign: 'التصميم الجرافيكي',
    workloadAi: 'الذكاء الاصطناعي',
    workloadPro: 'الاستخدام الاحترافي العام',
    workloadMixed: 'استخدام مختلط',
    intelRefreshDeepScan: 'إعادة فحص العتاد',
    loadingDeepScan: 'جارٍ جمع الفحص التفصيلي للعتاد...',
    intelPrivacyOn: 'درع الخصوصية: مُفعّل',
    intelPrivacyOff: 'درع الخصوصية: مُعطّل',
    intelExportJson: 'تصدير JSON',
    intelExportPdf: 'تصدير PDF',
    intelExportHtml: 'تصدير التقرير',
    intelExportSuccess: 'تم تصدير تقرير العتاد بنجاح',
    intelExportHtmlWebNote: 'تم تنزيل التقرير بصيغة HTML للطباعة أو الحفظ كـ PDF.',
    intelUnknown: 'غير معروف',
    intelUnavailable: 'غير متاح',
    intelNotDetected: 'غير مكتشف',
    intelSensorUnavailable: 'المستشعر غير متاح',
    intelSourceLabel: 'مصدر المستشعر',
    desktopOnlyHint: 'متاح في تطبيق سطح المكتب SecretArea Desktop (Windows / Linux).',
    healthPhysicalTitle: 'الصحة الفيزيائية',
    healthMeasuredCoverage: 'مكونات تم قياسها',
    healthPerformanceTitle: 'القدرة الأدائية',
    healthAgeTitle: 'عمر الجيل العتادي',
    healthAgeNote: 'محسوب وفق سنوات إصدار المعالج وكرت الشاشة والذاكرة',
    healthLifespanTitle: 'العمر الافتراضي التقديري',
    healthLifespanDisclaimer: 'يعتمد على طبيعة الاستخدام والتبريد وحالة القطع',
    healthBreakdownTitle: 'تفاصيل صحة المكونات وعنق الزجاجة',
    thermalCoolingTitle: 'المراوح والتبريد والتشخيص الحراري',
    fanNoSourceHint: 'لا يوجد جسر لقراءة سرعة المراوح (يفضّل تشغيل LibreHardwareMonitor على Windows)',
    fansDetectedHeader: 'المراوح المكتشفة',
    fansUnavailableBody: 'لم يكشف النظام عن مستشعرات RPM. تشغيل LibreHardwareMonitor على Windows أو hwmon على Linux يتيح قراءة سرعة المراوح بدقة دون تخمين.',
    fanStatusRunning: 'تعمل',
    fanStatusStopped: 'متوقفة — مؤكد',
    fanStatusAbnormal: 'سرعة غير طبيعية',
    fanStatusNotDetected: 'غير مكتشفة',
    fanStatusUnavailable: 'المستشعر غير متاح',
    thermalSensorsHeader: 'مستشعرات الحرارة',
    thermalPhysicalNoticeTitle: 'فحص يدوي مطلوب',
    errorsDriversTitle: 'أخطاء العتاد، السجلات والتعريفات',
    errorsDriversSubtitle: 'أخطاء إدارة الأجهزة وسجلات WHEA/القرص/الشاشة والتعريفات الموقّعة',
    pnpErrorsHeader: 'أخطاء إدارة الأجهزة (PnP)',
    pnpNoErrors: 'لا توجد أخطاء أجهزة مكتشفة.',
    eventLogsHeader: 'سجلات النظام (آخر 14 يوماً)',
    eventLogsEmpty: 'لا توجد أحداث حرجة مسجلة لـ WHEA أو القرص أو الشاشة.',
    signedDriversHeader: 'تعريفات العتاد الموقّعة',
    searchDriversPlaceholder: 'ابحث عن تعريف أو فئة...',
    driverDeviceCol: 'الجهاز',
    driverClassCol: 'الفئة',
    driverVersionCol: 'الإصدار',
    driverDateCol: 'التاريخ',
    driverSignedCol: 'التوقيع',
    driverSigned: 'موقّع',
    driverUnsigned: 'غير موقّع',
    sysIdTitle: 'هوية النظام',
    sysFormFactor: 'نوع الجهاز',
    sysSku: 'المنتج / SKU',
    sysSerialMasked: 'الرقم التسلسلي (مخفي)',
    sysOsBuild: 'نظام التشغيل والبناء',
    sysArch: 'المعمارية',
    sysBootMode: 'وضع الإقلاع',
    sysSecureBoot: 'الإقلاع الآمن',
    sysTpm: 'أمان TPM',
    sysSensorBackends: 'محركات القياس النشطة',
    moboTitle: 'تشخيص اللوحة الأم',
    moboChipset: 'الشريحة (Chipset)',
    moboSocket: 'مقبس المعالج',
    moboBios: 'إصدار BIOS / UEFI',
    moboBiosDate: 'تاريخ BIOS',
    moboRamSupport: 'دعم الذاكرة',
    moboPcieSlots: 'منافذ التوسعة PCIe',
    portsTitle: 'المنافذ، الوصلات والمتحكمات',
    portsSubtitle: 'فصل صارم بين المنافذ الفيزيائية ومتحكمات USB/PCI والأجهزة المتصلة فعلياً',
    portsHonestyBanner: 'قاعدة الدقة: متحكم USB لا يُحسب كمنفذ فيزيائي واحد. المنافذ غير المؤكدة تُعرض بشكل منفصل دون تخمين.',
    portsTabConfirmed: 'منافذ فيزيائية مؤكدة',
    portsTabControllers: 'متحكمات العتاد',
    portsTabConnected: 'أجهزة متصلة حالياً',
    portsTabUnconfirmed: 'منافذ داخلية / غير مؤكدة',
    portsBucketEmpty: 'لم يُبلغ النظام أو جداول SMBIOS عن عناصر في هذه الفئة.',
    storageSmartTitle: 'صحة التخزين وبيانات SMART',
    storageSmartSubtitle: 'الأقراص التي لا توفر بيانات SMART تُصنّف كغير متاح ولا تُعتبر سليمة تلقائياً',
    smartUnavailable: 'SMART غير متاح',
    smartWearLabel: 'الاستهلاك / العمر',
    smartPohLabel: 'ساعات التشغيل',
    smartCyclesLabel: 'دورات التشغيل',
    smartErrorsLabel: 'أخطاء غير مصححة',
    cpuGpuDeepTitle: 'تفاصيل المعالج وأدوار كروت الشاشة',
    cpuCacheLabel: 'ذاكرة الكاش',
    cpuVirtLabel: 'المحاكاة الافتراضية',
    cpuVoltageLabel: 'جهد النواة',
    multiGpuRolesHeader: 'توزيع الأدوار (مدمج مقابل منفصل)',
    ramDimmsTitle: 'الذاكرة وتفاصيل الشرائح (DIMM)',
    ramEccLabel: 'دعم ECC',
    ramPagefileLabel: 'الذاكرة الافتراضية (Pagefile)',
    ramDimmsUnavailable: 'تفاصيل شرائح SMBIOS غير متاحة في هذا الوضع.',
    displaysDeepTitle: 'الشاشات والأبعاد الفيزيائية EDID',
    powerPsuBatteryTitle: 'مزود الطاقة والبطارية',
    psuTelemetryHeader: 'توضيح قياس مزود الطاقة المكتبي',
    batteryDesignVsFull: 'السعة الحالية مقابل التصميمية',
    batteryCyclesLabel: 'دورات الشحن',
    batteryRateLabel: 'معدل الشحن / التفريغ',
    peripheralsNetTitle: 'الشبكات، الملحقات ومكونات النظام',
    adaptersLabel: 'محولات',
    peripheralsLabel: 'الملحقات',
    systemComponentsLabel: 'المتحكمات والمكونات',
    future2030Title: 'توافق المستقبل ومستشار 2030+',
    future2030Subtitle: 'يفصل بين الحقائق العتادية المؤكدة والتقديرات المستقبلية (2027–2030+)',
    futureProjectedVerdict: 'الجاهزية المتوقعة',
    futureVerifiedFactsTitle: 'حقائق عتادية مؤكدة',
    futureForwardEstimatesTitle: 'تقديرات وافتراضات مستقبلية',
    upgradeAdvisorTitle: 'مستشار الترقية الذكي',
    upgradeAdvisorSubtitle: 'يتحقق من المقبس، نوع/منافذ RAM، قيود اللابتوب الملحومة وقدرة مزود الطاقة',
    psuWattageInputLabel: 'قدرة مزود الطاقة المكتبي (واط)',
    psuApplyBtn: 'تأكيد القدرة',
    psuOptionalHint: 'اختياري — مزودات ATX العادية لا ترسل قدرتها برمجياً.',
    upgradeNoneNeeded: 'لا توجد ترقيات عاجلة مطلوبة لاستخدامك المحدد حالياً.',
    compatVerified: 'التوافق مؤكد',
    compatCheckNeeded: 'تحقق من الحجم / المزود',
    gamingCompatTitle: 'توافق الألعاب وفحص كتالوج SecretArea',
    gamingCompatSubtitle: 'تقييم واقعي للدقات والإعدادات مع اختبار ألعاب الكتالوج (دون أرقام FPS وهمية)',
    catalogGamesCheckTitle: 'فحص ألعاب كتالوج SecretArea',
    catalogSearchPlaceholder: 'ابحث عن لعبة في الكتالوج...',
    proCompatTitle: 'توافق البرامج الاحترافية',
    maintenanceTitle: 'مستشار الصيانة والوقاية',
    maintenanceSafetyNote: 'إرشادات آمنة للقراءة فقط — لا يعدّل BIOS أو الفولتية ولا يحذف بياناتك',
    benchTitle: 'اختبارات أداء آمنة واختيارية',
    benchSubtitle: 'اختبارات قصيرة وغير مُتلفة قابلة للإيقاف مع حماية حرارية تلقائية',
    benchSafetyNotice: 'الاختبارات اختيارية وبإذنك فقط. يتوقف الاختبار تلقائياً عند CPU >= 92°C أو GPU >= 88°C. اختبار التخزين يستخدم ملفاً مؤقتاً يُحذف فوراً.',
    benchCpuSingle: 'المعالج نواة واحدة',
    benchCpuMulti: 'المعالج متعدد الأنوية',
    benchRamThroughput: 'سرعة الذاكرة RAM',
    benchStorageSeq: 'التخزين المتسلسل (مؤقت)',
    benchStorage4k: 'قراءة عشوائية 4K (مؤقت)',
    benchNetLatency: 'استجابة الشبكة',
    benchStartBtn: 'بدء الاختبارات المحددة',
    benchStartWebBtn: 'بدء اختبارات المتصفح الآمنة',
    benchCancelBtn: 'إيقاف الاختبار',
    benchStarting: 'جارٍ تجهيز الاختبار الآمن...',
    benchRunningWeb: 'جارٍ تشغيل اختبارات المتصفح الآمنة...',
    benchCompleted: 'اكتمل الاختبار بنجاح.',
    benchAbortedThermal: 'تم الإيقاف لحماية الحرارة.',
    benchCancelled: 'تم إلغاء الاختبار بواسطة المستخدم.',
    dbTitle: 'قاعدة بيانات أجيال العتاد والتحديث التلقائي',
    dbVersionLabel: 'إصدار القاعدة',
    dbEntriesLabel: 'عنصر',
    dbSourceLabel: 'المصدر النشط',
    dbCheckUpdateBtn: 'فحص تحديث HTTPS',
    dbCustomFeedConsentLabel: 'أثق في رابط HTTPS المخصص هذا وأوافق على استبدال القاعدة الرسمية.',
    dbImportJsonBtn: 'استيراد JSON',
    dbRollbackBtn: 'استرجاع النسخة الاحتياطية',
    dbSearchPlaceholder: 'تصفية المعالجات، الكروت، الذاكرة...',
    dbWebOfflineNote: 'يتم استخدام قاعدة البيانات المدمجة محلياً في وضع معاينة الويب.',
    dbUpdateApplied: 'تم تحديث قاعدة بيانات العتاد والتحقق منها.',
    dbUpToDate: 'قاعدة البيانات المحلية الموثقة نشطة حالياً.',
    dbImportSuccess: 'تم استيراد قاعدة بيانات JSON والتحقق من صحتها.',
    dbRollbackSuccess: 'تمت الاستعادة إلى آخر نسخة احتياطية صالحة.',
    tabOpenSourceTools: 'أدوات مفتوحة المصدر',
    ossTitle: 'إدارة أدوات العتاد مفتوحة المصدر والتحديثات التلقائية',
    ossSubtitle: 'محركات استشعار مفتوحة المصدر وموثوقة يتم جلبها مباشرة من إصدارات GitHub الرسمية وNuGet مع تحقق SHA-256.',
    ossPolicyBadge: 'مفتوح المصدر OSI فقط',
    ossPolicyDesc: 'يتم اعتماد البرمجيات الحرة ومفتوحة المصدر بالكامل فقط (مثل LibreHardwareMonitorLib برخصة MPL-2.0). يتم استبعاد الأدوات التجارية أو المغلقة المصدر بالكامل.',
    ossCheckUpdatesBtn: 'فحص آخر إصدار',
    ossCheckingBtn: 'جاري التحقق من الإصدارات...',
    ossInstallBtn: 'تثبيت الإصدار الرسمي',
    ossUpdateBtn: 'تحديث إلى الأحدث',
    ossReinstallBtn: 'إعادة التثبيت والتحقق',
    ossRollbackBtn: 'الرجوع للنسخة السابقة',
    ossCancelBtn: 'إلغاء',
    ossConfirmDownloadTitle: 'تأكيد تنزيل الإصدار الرسمي مفتوح المصدر',
    ossConfirmDownloadDesc: 'سيقوم SecretArea بتنزيل الحزمة الرسمية مباشرة من GitHub Releases أو NuGet والتحقق من بصمة SHA-256 وسلامة الملف، وتثبيت LibreHardwareMonitorLib محلياً دون واجهة مستقلة.',
    ossConfirmRollbackDesc: 'استعادة النسخة الاحتياطية السابقة من LibreHardwareMonitorLib إلى المجلد النشط.',
    ossConfirmProceedBtn: 'موافقة ومتابعة',
    ossInstalledVersionLabel: 'الإصدار المثبت',
    ossLatestVersionLabel: 'أحدث إصدار مستقر',
    ossStatusLabel: 'الحالة',
    ossLastCheckedLabel: 'آخر فحص للتحديثات',
    ossReleaseDateLabel: 'تاريخ الإصدار',
    ossReleaseNotesLabel: 'ملاحظات الإصدار الرسمية',
    ossNoReleaseNotes: 'اضغط على «فحص آخر إصدار» لجلب رقم الإصدار وتاريخه وملاحظاته مباشرة من GitHub.',
    ossStatusNotInstalled: 'غير مثبت',
    ossStatusUpToDate: 'محدّث',
    ossStatusUpdateAvailable: 'يتوفر تحديث',
    ossStatusNewerInstalled: 'إصدار محلي أحدث',
    ossStatusRepairRequired: 'يتطلب إصلاحاً',
    ossStageDownloading: 'جاري تنزيل الحزمة الرسمية',
    ossStageVerifying: 'جاري التحقق من SHA-256 وسلامة المكتبة',
    ossStageInstalling: 'جاري فك الضغط وتفعيل المكتبة',
    ossLinkRepo: 'مستودع GitHub',
    ossLinkReleases: 'الإصدارات الرسمية',
    ossLinkNuget: 'حزمة NuGet',
    ossLinkLicense: 'رخصة MPL-2.0',
    ossLinkSource: 'الشيفرة المصدرية',
    ossDirectLibBadge: 'مكتبة DLL مباشرة · بدون واجهة مستقلة',
    ossShaVerifiedBadge: 'تم التحقق عبر SHA-256',
    ossAdminTitle: 'أمان المستخدم القياسي وصلاحيات الاستشعار',
    ossAdminDescStandard: 'لا يعمل SecretArea أبداً بشكل دائم بصلاحيات المسؤول. تعمل مستشعرات كرت الشاشة وNVMe والذاكرة بأمان كمستخدم عادي، بينما تتطلب مستشعرات اللوحة الأم منخفضة المستوى (VRM والفولتية وسرعة المراوح) صلاحية وصول إضافية عند الحاجة.',
    ossAdminDescElevated: 'الجلسة الحالية تمتلك صلاحيات المسؤول؛ يمكن قراءة مستشعرات اللوحة الأم وVRM والفولتية والمراوح مباشرة عبر LibreHardwareMonitorLib.',
    ossThirdPartyTitle: 'إشعار تراخيص البرمجيات مفتوحة المصدر (MPL-2.0)',
    ossThirdPartyDesc: 'مكتبة LibreHardwareMonitorLib مرخصة بموجب رخصة Mozilla Public License 2.0 (MPL-2.0) من مساهمي LibreHardwareMonitor. يتم حفظ إشعارات الرخصة الرسمية محلياً وفي ملف THIRD_PARTY_LICENSES.md.',
    ossWebPreviewNote: 'التنزيل معطّل في معاينة الويب: افتح تطبيق SecretArea Desktop على Windows 10/11 لتنزيل المكتبة والتحقق من بصمتها وتشغيلها.',
    ossPlatformUnsupportedNote: 'التكامل المباشر مع LibreHardwareMonitorLib (.NET DLL) مخصص لنظام Windows 10/11. على نظام Linux يستخدم التطبيق واجهة sysfs hwmon/DRM تلقائياً.',
  },
  updateHistory: {
    title: 'سجل التحديثات',
    subtitle: 'استعرض جميع الإصدارات السابقة والتغييرات المضافة في كل نسخة من SecretArea',
    settingsCardTitle: 'إصدار التطبيق وسجل التحديثات',
    settingsCardDesc: 'تصفح جميع الإصدارات السابقة من SecretArea Desktop واطّلع على المزايا والتحسينات في كل إصدار.',
    openHistoryBtn: 'سجل التحديثات',
    searchPlaceholder: 'ابحث برقم الإصدار أو اسم الميزة...',
    filterAll: 'الكل',
    filterFeature: 'المزايا',
    filterImprovement: 'التحسينات',
    filterFix: 'الإصلاحات',
    currentBadge: 'المثبت حالياً',
    latestBadge: 'الأحدث',
    refreshBtn: 'تحديث',
    refreshingBtn: 'جارٍ المزامنة...',
    checkUpdatesBtn: 'التحقق من التحديثات',
    emptyState: 'لا توجد إصدارات أو تغييرات مطابقة لبحثك.',
    changesSuffix: 'تغييرات',
    closeBtn: 'إغلاق',
    devBadge: 'قيد التطوير',
    updateAvailableBadge: 'تحديث متاح',
    installedDevBadge: 'قيد التشغيل (تطوير)',
    devModeEnvLabel: 'وضع التطوير',
    prodEnvLabel: 'الإصدار المثبت',
    unpublishedNote: 'لم يُنشر بعد على GitHub',
    syncingAutoLabel: 'مزامنة تلقائية للإصدارات...',
    newCountLabel: 'جديد',
    changedCountLabel: 'تحسينات',
    fixedCountLabel: 'إصلاحات',
    justUpdatedTitle: 'الجديد في هذا الإصدار',
    justUpdatedFromPrefix: 'تم التحديث تلقائياً من الإصدار',
    newlyInstalledBadge: 'مثبّت حديثاً',
  },
  notificationCenter: {
    buttonLabel: 'الإشعارات',
    title: 'مركز الإشعارات',
    subtitle: 'آخر 3 تحديثات أو ألعاب مضافة حديثاً',
    syncNowBtn: 'مزامنة الآن',
    syncingBtn: 'جارٍ المزامنة...',
    markAllReadBtn: 'تحديد الكل كمقروء',
    updateHistoryBtn: 'سجل التحديثات',
    lastSyncedPrefix: 'آخر مزامنة',
    neverSynced: 'محفوظ محلياً',
    searchPlaceholder: 'تصفية العناوين أو الإصدارات أو التبويبات...',
    filterAll: 'الكل',
    filterImportant: 'التبويبات المهمة',
    filterNews: 'الأخبار فقط',
    importantHint: 'التحديثات الأساسية من تبويبات: الألعاب، Hypervisor، SteamTools، PS5، الأدوات والتخزينات',
    newsHint: 'إعلانات وأخبار من تبويبات: القادم، قائمة القادم، والأكثر شعبية',
    liveBadge: 'مباشر',
    newBadge: 'جديد',
    updatedBadge: 'محدّث',
    upcomingBadge: 'قادم',
    popularBadge: 'شائع',
    openItemHint: 'فتح',
    openExtrasHint: 'فتح في الإضافات',
    emptyTitle: 'لا توجد إشعارات جديدة',
    emptyDesc: 'لا توجد تحديثات أو ألعاب مضافة حديثاً حتى الآن.',
    syncedToast: 'تمت مزامنة الكتالوج بنجاح',
    newUpdatesToastPrefix: 'تحديثات جديدة في الكتالوج',
    tabLabels: {
      all: 'كل التبويبات',
      game: 'الألعاب',
      hypervisor: 'Hypervisor',
      steamtools: 'SteamTools',
      ps5: 'PS5',
      architect: 'الأدوات',
      extra: 'التخزينات',
      upcoming: 'القادم',
      upcominglist: 'قائمة القادم',
      popularrepacks: 'الأكثر شعبية',
    },
  },
  spinWheel: {
    title: 'عجلة الحظ للألعاب الشائعة',
    subtitle: 'أدر العجلة لاختيار لعبة عشوائية من قائمة الألعاب الأكثر شعبية',
    spinBtn: 'أدر العجلة',
    spinningLabel: 'جارٍ التدوير...',
    spinAgainBtn: 'تدوير مجدداً',
    viewGameBtn: 'عرض تفاصيل اللعبة',
    poolCountSuffix: 'لعبة متاحة',
    filterAll: 'كل الشائعة',
    filterGames: 'الألعاب',
    filterHv: 'Hypervisor',
    filterCanRun: 'يعمل على جهازي',
    readyTitle: 'مستعد لاكتشاف لعبتك القادمة؟',
    readyDesc: 'اضغط على SPIN في وسط العجلة لاختيار لعبة عشوائية من قائمة الألعاب الأكثر شعبية.',
    winnerLabel: 'اللعبة المختارة',
    recentTitle: 'السحوبات الأخيرة',
    emptyPool: 'لا توجد ألعاب مطابقة لهذا الفلتر في قائمة الأكثر شعبية.',
    repackSizeLabel: 'حجم الريباك',
    originalSizeLabel: 'الحجم الأصلي',
    canRunPass: 'يعمل بسلاسة على جهازك',
    canRunFail: 'أقل من مواصفات جهازك',
    addFavorite: 'مفضلة',
    removeFavorite: 'بالمفضلة',
    congratsTitle: 'تهانينا!',
    congratsSubtitle: 'تم اختيار هذه اللعبة الشائعة لك عشوائياً.',
  },
  deals: {
    pageTitle: 'مركز عروض واكتشاف الألعاب',
    pageSubtitle: 'تخفيضات ألعاب الحاسوب المباشرة، مقارنة الأسعار بين المتاجر، والألعاب المجانية الموثقة.',
    refreshBtn: 'تحديث',
    refreshingBtn: 'جاري التحديث',
    lastUpdatedPrefix: 'آخر تحديث',
    regionLabel: 'المنطقة',
    currencyLabel: 'العملة',
    allCurrenciesLabel: 'جميع العملات',
    liveFxRateLabel: 'صرف مباشر',
    fxLoadingLabel: 'جاري التحديث...',
    fxUnavailableLabel: 'الصرف غير متاح · USD',
    sourcePriceHint: 'سعر المتجر',
    currencyNames: {
      USD: 'الدولار الأمريكي',
      MAD: 'الدرهم المغربي',
      EUR: 'اليورو الأوروبي',
      GBP: 'الجنيه الإسترليني',
      CAD: 'الدولار الكندي',
      SAR: 'الريال السعودي',
      AED: 'الدرهم الإماراتي',
      TRY: 'الليرة التركية',
      BRL: 'الريال البرازيلي',
      JPY: 'الين الياباني',
    },
    tabOverview: 'نظرة عامة',
    tabAllDeals: 'كل العروض',
    tabFreeGames: 'الألعاب المجانية',
    tabStores: 'مستكشف المتاجر',
    featuredDealsTitle: 'عروض مميزة',
    bestDiscountsTitle: 'أكبر الخصومات',
    trendingDealsTitle: 'العروض الرائجة',
    recentlyUpdatedTitle: 'المحدثة مؤخراً',
    freeGamesSpotlightTitle: 'ألعاب مجانية وهدايا',
    popularGamesTitle: 'الألعاب الشائعة',
    viewAllBtn: 'عرض الكل',
    searchPlaceholder: 'ابحث عن ألعاب الحاسوب بالاسم...',
    storeFilterAll: 'كل المتاجر الموثقة',
    minPriceLabel: 'أدنى سعر',
    maxPriceLabel: 'أقصى سعر',
    minDiscountLabel: 'الخصم',
    discountAny: 'أي نسبة',
    sortLabel: 'الترتيب',
    sortDealRating: 'أفضل تقييم صفقة',
    sortSavings: 'أعلى خصم',
    sortPriceAsc: 'الأقل سعراً',
    sortPriceDesc: 'الأعلى سعراً',
    sortRecent: 'المحدثة حديثاً',
    sortMetacritic: 'تقييم Metacritic',
    sortTitle: 'الاسم أ–ي',
    resetFiltersBtn: 'إعادة ضبط',
    resultsCountSuffix: 'عرض',
    pageLabel: 'صفحة',
    ofLabel: 'من',
    prevPageBtn: 'السابق',
    nextPageBtn: 'التالي',
    freeCatLimited: 'مجانية لفترة محدودة',
    freeCatGiveaways: 'هدايا ومفاتيح مجانية',
    freeCatFreeToPlay: 'مجانية دائماً (Free-to-Play)',
    freeCatLimitedDesc: 'ألعاب مدفوعة مجانية 100% مؤقتاً — مرتبة حسب الأقرب انتهاءً.',
    freeCatGiveawaysDesc: 'إضافات وحزم ومفاتيح ترويجية موثقة.',
    freeCatFreeToPlayDesc: 'ألعاب حاسوب مجانية للعب بشكل دائم من ناشرين موثوقين.',
    expiresPrefix: 'ينتهي خلال',
    noExpiryLabel: 'مجانية للعب دائماً',
    originalWorthPrefix: 'السعر الأصلي',
    claimFreeBtn: 'احصل عليها مجاناً',
    playFreeBtn: 'فتح في المتجر',
    viewDealBtn: 'عرض الصفقة',
    compareOffersBtn: 'مقارنة المتاجر',
    dealRatingLabel: 'التقييم',
    freeBadge: 'مجاني',
    storesTitle: 'المتاجر الرقمية الموثقة',
    storesSubtitle: 'متاجر رسمية يتم جلبها تلقائياً من مزودي العروض المتكاملين.',
    storeActiveDealsSuffix: 'عرضاً نشطاً',
    storeTopDiscountPrefix: 'خصم حتى',
    browseStoreBtn: 'تصفح عروض المتجر',
    detailOffersTitle: 'مقارنة الأسعار عبر المتاجر',
    detailHistoricalLowLabel: 'أدنى سعر تاريخي',
    detailHistoricalDatePrefix: 'تاريخ التسجيل',
    detailBestPriceLabel: 'أفضل سعر حالي',
    detailLoadingOffers: 'جاري تحميل عروض المتاجر والسعر التاريخي...',
    detailCurrencyNotice: 'التحويلات تعتمد على أسعار الصرف المباشرة مع إظهار السعر الأصلي بجانبها.',
    detailStoreCol: 'المتجر',
    detailOriginalCol: 'الأصلي',
    detailCurrentCol: 'الحالي',
    detailDiscountCol: 'الخصم',
    detailActionCol: 'الرابط',
    detailCloseBtn: 'إغلاق',
    emptyDealsTitle: 'لا توجد عروض مطابقة',
    emptyDealsDesc: 'جرب تقليل نسبة الخصم أو توسيع نطاق السعر أو مسح البحث.',
    emptyFreeTitle: 'لا توجد عروض مجانية نشطة في هذا القسم حالياً',
    emptyFreeDesc: 'تظهر العروض الموثقة تلقائياً فور توفرها من المتاجر.',
    errorTitle: 'تعذر تحميل العروض المباشرة',
    offlineDesc: 'يبدو أنك غير متصل بالإنترنت. أعد الاتصال لجلب الأسعار والألعاب المجانية.',
    retryBtn: 'إعادة المحاولة',
    tabLivePlayers: 'اللاعبون مباشرة',
    tabCompare: 'مقارنة الألعاب',
    tabAlerts: 'تنبيهات الأسعار',
    whatsHotTodayTitle: 'الأكثر رواجاً اليوم',
    whatsHotSubtitle: 'الألعاب الأكثر لعباً الآن، أكبر الارتفاعات اليومية، وأفضل التخفيضات',
    hotMostPlayed: 'الأكثر لعباً الآن',
    hotBiggestGains: 'أكبر ارتفاع خلال 24 ساعة',
    hotNewReleases: 'إصدارات جديدة رائجة',
    hotBestDiscounts: 'أعلى التخفيضات',
    kpiTopPlayers: 'إجمالي لاعبي القمة (Top 100)',
    kpiActiveDeals: 'العروض المتوفرة',
    kpiFreeNow: 'ألعاب وهدايا مجانية',
    kpiFollowedAlerts: 'التنبيهات النشطة',
    livePlayersTitle: 'تعداد لاعبي Steam المباشر والاتجاهات',
    livePlayersSubtitle: 'قائمة أفضل 100 لعبة، تغير 24 ساعة، وحركة تقييمات اللاعبين',
    liveTabTop100: 'أفضل 100 الآن',
    liveTabGainers: 'الأكثر ارتفاعاً',
    liveTabDecliners: 'الأكثر تراجعاً',
    liveTabReviewMovers: 'حركة المراجعات',
    liveSearchPlaceholder: 'ابحث باسم اللعبة أو رقم Steam App...',
    liveColRank: 'الترتيب',
    liveColGame: 'اللعبة',
    liveColPlayers: 'اللاعبون الآن',
    liveColPeak24h: 'ذروة 24س',
    liveColChange24h: 'تغير 24س',
    liveColTrend7d: 'منحنى 7أ',
    liveColPrice: 'سعر Steam',
    liveColActions: 'إجراءات',
    healthLegendTitle: 'مؤشرات صحة واستقرار الألعاب',
    healthLegendDesc: 'تُحسب وفق استقرار اللاعبين خلال 30 يوماً وبيانات The Game Census التاريخية بدقة تامة.',
    healthTiers: {
      thriving: 'مزدهرة',
      healthy: 'مستقرة',
      cooling: 'متراجعة',
      quiet: 'هادئة',
      dormant: 'خاملة',
      unknown: 'غير مصنفة',
    },
    freeFilterAll: 'كل المتاجر',
    freeFilterEpic: 'Epic Games',
    freeFilterSteam: 'Steam',
    freeFilterGog: 'GOG',
    freeFilterPcDlc: 'إضافات ومكافآت',
    compareTitle: 'مقارنة الألعاب جنباً إلى جنب',
    compareSubtitle: 'قارن اللاعبين الحاليين، مراجعات Steam، تقييمات النقاد المنفصلة، والأسعار (2–4 ألعاب)',
    compareSearchPlaceholder: 'ابحث عن أي لعبة PC لإضافتها للمقارنة...',
    compareAddBtn: 'مقارنة',
    compareAddedBadge: 'مضافة',
    compareRemoveBtn: 'إزالة',
    compareClearBtn: 'مسح الكل',
    compareEmptyTitle: 'اختر ألعاباً للمقارنة',
    compareEmptyDesc: 'ابحث بالأعلى أو اضغط على زر المقارنة من أي بطاقة عرض أو لعبة.',
    compareMaxNotice: 'يمكن مقارنة ما يصل إلى 4 ألعاب في نفس الوقت.',
    compareMetricCol: 'المعيار',
    alertsTitle: 'تنبيهات هبوط الأسعار',
    alertsSubtitle: 'تابع الألعاب واحصل على تنبيه محلي فوري عند انخفاض السعر',
    alertsCheckNowBtn: 'فحص الأسعار الآن',
    alertsCheckingBtn: 'جارٍ الفحص...',
    alertsFollowBtn: 'تتبع السعر',
    alertsFollowingBadge: 'التنبيه مفعل',
    alertsTargetPriceLabel: 'السعر المستهدف',
    alertsAnyDropOption: 'أي انخفاض',
    alertsLastCheckedLabel: 'آخر فحص',
    alertsTriggeredTitle: 'تنبيهات الانخفاض المُسجلة',
    alertsFollowedTitle: 'الألعاب المتابعة',
    alertsMarkAllReadBtn: 'تحديد الكل كمقروء',
    alertsClearEventsBtn: 'مسح السجل',
    alertsEmptyFollowed: 'لم تقم بمتابعة أي لعبة بعد. اضغط على أيقونة الجرس في أي عرض.',
    alertsEmptyTriggered: 'لا توجد انخفاضات أسعار مسجلة بعد.',
    alertsDropDetectedToast: 'تم رصد انخفاض سعر لـ',
    modalTabOverview: 'نظرة عامة والمتاجر',
    modalTabCharts: 'مخططات اللاعبين والأسعار',
    modalTabReviewsCritics: 'المراجعات والنقاد',
    modalTabStatsNews: 'الإحصائيات والإنجازات والأخبار',
    playerChartTitle: 'السجل التاريخي للاعبي Steam',
    priceChartTitle: 'السجل التاريخي للأسعار والتخفيضات',
    noChartData: 'لا تتوفر بيانات تاريخية لهذه اللعبة حالياً.',
    discountShameWarning: 'تنبيه تسعير: تم رفع السعر الأساسي قبل بدء هذا التخفيض.',
    criticsSectionTitle: 'تقييمات النقاد واللاعبين المستقلة',
    criticsSeparateNote: 'كل تقييم يُعرض بمقياسه الرسمي ومصدره بشكل منفصل دون دمج.',
    steamRatingCardTitle: 'تقييم لاعبي Steam',
    metacriticScoreCardTitle: 'Metacritic Metascore',
    metacriticUserCardTitle: 'تقييم مستخدمي Metacritic',
    openCriticCardTitle: 'تقييم OpenCritic',
    keyRequiredBadge: 'يتطلب مفتاح API اختياري',
    configureKeyAction: 'إعداد مفتاح API',
    reviewsPositiveLabel: 'إيجابي',
    reviewsNegativeLabel: 'سلبي',
    reviewsDailyTrendTitle: 'منحنى المراجعات اليومي',
    reviewsRecentTitle: 'مراجعات اللاعبين',
    reviewsSnapshotNote: 'البيانات الإحصائية ومنحنى المراجعات من The Game Census (thegamecensus.com · CC BY 4.0).',
    achievementsTitle: 'نسب فتح الإنجازات العالمية',
    newsUpdatesTitle: 'الأخبار وتأثير التحديثات',
    updateImpactLabel: 'اللاعبون بعد التحديث',
    developerLabel: 'المطور',
    publisherLabel: 'الناشر',
    releaseDateLabel: 'تاريخ الإصدار',
    platformsLabel: 'المنصات',
    healthStatusLabel: 'حالة اللعبة',
    sourcesLabel: 'مصادر البيانات',
    apiKeysBtn: 'مفاتيح API',
    apiKeysTitle: 'مزودو البيانات ومفاتيح API الاختيارية',
    apiKeysSubtitle: 'المزودات المجانية تعمل تلقائياً. المفاتيح الاختيارية تفعل Steam Index وMetacritic Users وOpenCritic بأمان.',
    apiKeysFreeLabel: 'المزودات العامة النشطة (بدون مفتاح)',
    apiKeysOptionalLabel: 'مزودات اختيارية بمفتاح مشفر محلياً',
    apiKeysSaveBtn: 'حفظ المفتاح المشفر',
    apiKeysClearBtn: 'إزالة المفتاح',
    apiKeysConfiguredBadge: 'مُفعّل',
    apiKeysNotSetBadge: 'غير مُعد',
    apiKeysSafeStorageNote: 'يُحفظ مشفراً بالكامل داخل Electron safeStorage ولا يُكشف لملفات الواجهة.',
  },
  settingsHub: {
    searchPlaceholder: 'ابحث في الإعدادات أو المظاهر أو الأدوات (مثل qBittorrent، FPS، API، الكاش)...',
    searchResultsCount: 'أقسام مطابقة',
    searchEmptyTitle: 'لا توجد إعدادات أو أدوات مطابقة',
    searchEmptyDesc: 'جرّب البحث عن اللغة، المظهر، المؤشر، الأداء، qBittorrent، PresentMon، المنظف، أو مفاتيح API.',
    clearSearchBtn: 'مسح البحث',
    catAll: 'كل الإعدادات',
    catTools: 'الأدوات والتكاملات',
    catLanguage: 'اللغة والمنطقة',
    catStartup: 'البدء والنظام',
    catAppearance: 'المظهر والسمات',
    catAudio: 'الصوت والمشهد الصوتي',
    catPerformance: 'الأداء والطاقة',
    catStorage: 'التخزين والكاش والنسخ',
    catUpdates: 'التحديثات والسجل',
    summaryThemeLabel: 'المظهر النشط',
    summaryPerfLabel: 'وضع الأداء',
    summaryToolsLabel: 'الأدوات والمحركات',
    summarySystemLabel: 'العتاد والتخزين',
    toolsReadySuffix: 'جاهزة',
    themeStudioTitle: 'استوديو المظهر السريع',
    themeStudioDesc: 'تنقل بسهولة بين الوضع الداكن والفاتح، أو مظاهر الكونسول، أو مظهرك المخصص.',
    themeDefaultDark: 'داكن قياسي',
    themeCrispLight: 'فاتح ساطع',
    themePs5: 'PlayStation 5',
    themeXbox: 'Xbox Nexus',
    themeCustom: 'مظهر مخصص',
    traySmartTip: 'نصيحة: قمت بتفعيل التشغيل مع الكمبيوتر. يُنصح بتغيير الإغلاق إلى «تصغير إلى شريط النظام» ليبقى SecretArea جاهزاً بالخلفية.',
    traySmartBtn: 'تفعيل التصغير للنظام',
    audioStatusConsoleActive: 'الموسيقى المحيطة للكونسول وأصوات الواجهة قيد التشغيل.',
    audioStatusStandby: 'أصوات النقر مفعّلة. تعمل الموسيقى المحيطة تلقائياً عند اختيار مظهر PS5 أو Xbox.',
    audioPreviewBtn: 'اختبار الصوت',
    volumeMute: 'كتم',
    volumeLow: 'منخفض',
    volumeBalanced: 'متوازن',
    volumeMax: 'أقصى',
    effectiveParamsTitle: 'القيم الفعالة حالياً',
    effectiveHwPoll: 'فحص العتاد',
    effectiveUiCoalesce: 'مزامنة الواجهة',
    effectiveTorrentPoll: 'خمول التورنت',
    effectiveCacheCap: 'سقف الصور',
    diskFreeLabel: 'المساحة الحرة المتاحة',
    cacheSectionTitle: 'الذاكرة المؤقتة والنسخ الاحتياطي',
    cacheSectionDesc: 'امسح ذاكرة العروض والصور أو قم بتصدير واستيراد إعدادات المشغّل بملف JSON.',
    clearDealsCacheBtn: 'مسح كاش العروض',
    dealsCacheCleared: 'تم مسح الذاكرة المؤقتة للعروض والبيانات.',
    clearImageCacheBtn: 'مسح كاش الأغلفة',
    imageCacheCleared: 'تم مسح صور الأغلفة المخزنة مؤقتاً.',
    exportSettingsBtn: 'تصدير الإعدادات',
    importSettingsBtn: 'استيراد الإعدادات',
    importSettingsSuccess: 'تم استيراد الإعدادات وتطبيقها بنجاح.',
    importSettingsError: 'ملف الإعدادات غير صالح.',
    hubTitle: 'مركز الأدوات الإضافية والتكاملات',
    hubSubtitle: 'جميع الأدوات المدمجة ومحركات العتاد وبرامج التنزيل ومزودات API في مكان واحد: تعرّف على وظيفة كل أداة واضبط إعداداتها مباشرة.',
    hubFilterAll: 'كل الأدوات',
    hubFilterHardware: 'العتاد والتشخيص',
    hubFilterDownloads: 'التنزيلات والشبكة',
    hubFilterDeals: 'العروض و API',
    hubFilterUtilities: 'أدوات وأدلة',
    hubConfigureBtn: 'إعداد الأداة',
    hubHideConfigBtn: 'إخفاء الإعدادات',
    hubPurposeLabel: 'وظيفة الأداة',
    hubStatusReady: 'جاهزة',
    hubStatusAttention: 'تحتاج إجراء',
    hubStatusStandby: 'في الانتظار',
    hubStatusBuiltin: 'أداة مدمجة',
    hubStatusWebPreview: 'يتطلب تطبيق سطح المكتب',
    toolQbitName: 'ربط qBittorrent Web UI (API v2 / 5.0+)',
    toolQbitPurpose: 'يرسل روابط Magnet وملفات .torrent مباشرة من SecretArea إلى qBittorrent المحلي ويتابع سرعة التحميل والرفع والوقت المتبقي.',
    toolPresentMonName: 'Intel PresentMon (مراقبة FPS وزمن الإطار)',
    toolPresentMonPurpose: 'يلتقط زمن الإطار بدقة عالية لألعاب DX11/DX12/Vulkan/OpenGL مع قياس 1% و 0.1% Low FPS وإشغال GPU.',
    toolLhmName: 'LibreHardwareMonitorLib (محرك الحساسات)',
    toolLhmPurpose: 'محرك مفتوح المصدر MPL-2.0 لقراءة درجات حرارة المعالج والكرت، الترددات، الطاقة، الفولتية، NVMe SMART وسرعة المراوح.',
    toolCleanerName: 'منظف الجهاز الآمن والذاكرة المؤقتة',
    toolCleanerPurpose: 'يفحص وينظف بأمان الملفات المؤقتة للنظام وكاش التطبيقات وكاش SecretArea والصور المصغرة وكاش DirectX Shader.',
    toolDealsApiName: 'مزودات عروض الألعاب ومفاتيح API',
    toolDealsApiPurpose: 'يشغّل قسم العروض واللاعبين المباشرين وتقييمات النقاد عبر 6 واجهات مجانية بالإضافة إلى 3 مفاتيح اختيارية مشفرة.',
    toolCanRunItName: 'فاحص التوافق Can Run It وملف العتاد',
    toolCanRunItPurpose: 'يقارن متطلبات المعالج وكرت الشاشة والذاكرة والمساحة لكل لعبة مع مواصفات جهازك المكتشفة أو المخصصة.',
    toolBenchDbName: 'اختبارات الأداء وقاعدة بيانات العتاد',
    toolBenchDbPurpose: 'يجري اختبارات أداء آمنة للمعالج والذاكرة والتخزين والشبكة مع تحديث قاعدة بيانات الكروت والمعالجات (hardware-db.json).',
    toolHypervisorName: 'دليل Hypervisor والأنظمة الافتراضية',
    toolHypervisorPurpose: 'مرجع شامل لتفعيل VT-x / AMD-V من البيوس وإعداد Hyper-V والتعريفات للألعاب التي تتطلب ذلك.',
    toolSpinWheelName: 'عجلة الاختيار العشوائي (ماذا ألعب؟)',
    toolSpinWheelPurpose: 'أداة سريعة لاختيار لعبة عشوائية من مكتبتك والبدء باللعب فوراً دون حيرة.',
    toolUpdaterName: 'مُحدّث التطبيق وسجل الإصدارات والإشعارات',
    toolUpdaterPurpose: 'يتحقق من إصدارات SecretArea على GitHub ويعرض سجل التغييرات الكامل ومركز إشعارات الكتالوج.',
    specsAutoDetected: 'كشف تلقائي (أصلي)',
    specsCustomOverride: 'مواصفات مخصصة',
    specsBrowserMode: 'تقدير المتصفح',
    specsRescanBtn: 'إعادة فحص العتاد',
    specsCustomizeBtn: 'تخصيص المواصفات',
    specsSaveBtn: 'حفظ المواصفات',
    specsResetAutoBtn: 'استعادة التلقائي',
    specsCpuLabel: 'المعالج (CPU)',
    specsGpuLabel: 'كرت الشاشة (GPU)',
    specsVramLabel: 'ذاكرة الكرت VRAM (GB)',
    specsRamLabel: 'الذاكرة العشوائية RAM (GB)',
    specsDiskFreeLabel: 'المساحة الحرة (GB)',
    cleanerQuickScanBtn: 'فحص سريع الآن',
    cleanerQuickCleanBtn: 'تنظيف المحدد',
    cleanerWebNote: 'تنظيف ملفات النظام يتطلب تشغيل تطبيق سطح المكتب SecretArea.exe.',
    dbEntriesLabel: 'عناصر القاعدة',
    dbVersionLabel: 'إصدار القاعدة',
    dbCheckUpdateBtn: 'تحديث القاعدة',
    openHardwareMonitorBtn: 'فتح مراقب العتاد',
    openPcCleanerBtn: 'فتح المنظف الكامل',
    openBenchmarksBtn: 'فتح الاختبارات والقاعدة',
    openDealsBtn: 'فتح عروض الألعاب',
    openHypervisorBtn: 'فتح دليل Hypervisor',
    openSpinWheelBtn: 'تشغيل عجلة الألعاب',
    openUpdaterBtn: 'التحقق من التحديثات',
  },
};

const TRANSLATIONS: Record<AppLanguage, LauncherTranslations> = {
  en: EN,
  fr: FR,
  es: ES,
  ar: AR,
};

export function getTranslations(language: AppLanguage = 'en'): LauncherTranslations {
  return TRANSLATIONS[language] || EN;
}
