(function() {
  if (window.__UPMIXER) {
    vupaused = false;
    return;
  }; // already running

  // Logical index -> ChannelMerger output index.
  //   logical: 0=L 1=R 2=C 3=Sub 4=SL 5=SR 6=BL 7=BR  (index space used by
  //            gains[], analyzers[], muteStates[], soloStates[], vuLevels[])
  //   'firefox': Firefox/cubeb 8-channel order is L R C LFE REAR_LEFT REAR_RIGHT
  //              SIDE_LEFT SIDE_RIGHT (AudioConfig.cpp DefaultLayoutForChannels
  //              case 8), so side and rear must be swapped relative to the
  //              extension's logical order. This is the correct default in
  //              Firefox and on PipeWire.
  //   'alsa':    the original wiring (identity), matching an ALSA-native
  //              surround71 order FL FR FC LFE SL SR RL RR.
  const CHANNEL_ROUTES = {
    firefox: [0, 1, 2, 3, 6, 7, 4, 5],
    alsa:    [0, 1, 2, 3, 4, 5, 6, 7]
  };
  let channelRoute = 'firefox';

  const ctx = new AudioContext({ latencyHint: "interactive" });
  ctx.destination.channelCount = 8;

  const merger = ctx.createChannelMerger(8); // 7.1
  merger.connect(ctx.destination);

  const processedElements = new Set();
  const analyzers = [];
  const gains = [];
  const sourceGains = [];
  const muteStates = new Array(8).fill(false);
  const soloStates = new Array(8).fill(false);
  const vuLevels = new Array(8).fill(0);
  let vupaused = false;

  // Per-logical-channel baseline gain: L, R, C, Sub, SL, SR, BL, BR.
  // C and Sub each receive BOTH halves of the stereo signal, so they run at
  // half gain to keep the overall level constant. Single source of truth shared
  // by processElement (initial wiring) and updateChannelStates (mute/solo
  // re-apply) — they must never disagree.
  const BASE_GAINS = [1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 1.0, 1.0];

  // Create source gain nodes for left and right
  const sourceGainL = ctx.createGain();
  sourceGainL.gain.value = 1.0;
  sourceGains.push(sourceGainL);

  const sourceGainR = ctx.createGain();
  sourceGainR.gain.value = 1.0;
  sourceGains.push(sourceGainR);

  // Create global gain nodes for each channel
  for (let i = 0; i < 8; i++) {
    const g = ctx.createGain();
    g.gain.value = 1.0;
    g.connect(merger, 0, channelRoute === 'alsa' ? i : CHANNEL_ROUTES[channelRoute][i]);
    gains.push(g);

    // Add analyzer for VU meters
    const analyzer = ctx.createAnalyser();
    analyzer.fftSize = 256;
    g.connect(analyzer);
    analyzers.push(analyzer);
  }

  // A bare injection (no SET_CHANNEL_ROUTE message) must still wire correctly.
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    browser.storage.local.get(['channelRoute']).then(result => {
      setChannelRoute(result.channelRoute || 'firefox');
    });
  }

  function processElement(elem) {
    if (processedElements.has(elem)) return;
    processedElements.add(elem);

    const src = ctx.createMediaElementSource(elem);

    const splitter = ctx.createChannelSplitter(8);
    src.connect(splitter);

    // Connect splitter to source gains
    splitter.connect(sourceGains[0], 0); // L to sourceGainL
    splitter.connect(sourceGains[1], 1); // R to sourceGainR

    // Connect source gains to channel gains
    // Stereo inputs
    // Map:
    // 0: L
    sourceGains[0].connect(gains[0]);
    // 1: R
    sourceGains[1].connect(gains[1]);

    // Center = Sub = 0.5*(L + R). Both halves are connected below; the 0.5
    // comes from BASE_GAINS so it can never drift from what
    // updateChannelStates restores.
    sourceGains[0].connect(gains[2]);
    sourceGains[1].connect(gains[2]);
    gains[2].gain.value = BASE_GAINS[2];

    sourceGains[0].connect(gains[3]);
    sourceGains[1].connect(gains[3]);
    gains[3].gain.value = BASE_GAINS[3];

    // Stereo -> 7.1 upmix matrix (logical channel -> source contribution)
    //   0 L   = 1.0 * L
    //   1 R   = 1.0 * R
    //   2 C   = 0.5 * L
    //   3 Sub = 0.5 * L
    //   (R halves of C/Sub connected below)
    //   4 SL / 6 BL = 1.0 * L   (via sourceGains[0])
    //   5 SR / 7 BR = 1.0 * R   (via sourceGains[1])
    sourceGains[0].connect(gains[4]);
    sourceGains[1].connect(gains[5]);
    sourceGains[0].connect(gains[6]);
    sourceGains[1].connect(gains[7]);
  }

  // Process existing elements
  document.querySelectorAll("audio,video").forEach(processElement);

  // Observe for new elements
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
            processElement(node);
          }
          node.querySelectorAll && node.querySelectorAll("audio,video").forEach(processElement);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // VU meter update
  const dataArray = new Uint8Array(128);
  function updateVULevels() {
    if (!vupaused) {
    for (let i = 0; i < 8; i++) {
      if (analyzers[i]) {
        analyzers[i].getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        vuLevels[i] = (muteStates[i] || (soloStates.some(s => s) && !soloStates[i])) ? 0 : avg / 255;
      }
    }
  }
    setTimeout(updateVULevels, 42);
  }
  updateVULevels();

  function updateChannelStates(newMuteStates, newSoloStates, newSourceMuteLeft, newSourceMuteRight) {
    // Source-mute toggles (TOGGLE_SOURCE_MUTE_LEFT/RIGHT) pass null for the
    // mute/solo arrays to mean "leave unchanged"; the spread would throw.
    if (Array.isArray(newMuteStates)) {
      muteStates.splice(0, muteStates.length, ...newMuteStates);
    }
    if (Array.isArray(newSoloStates)) {
      soloStates.splice(0, soloStates.length, ...newSoloStates);
    }
    // Apply source mutes
    sourceGains[0].gain.value = newSourceMuteLeft ? 0 : 1;
    sourceGains[1].gain.value = newSourceMuteRight ? 0 : 1;
    // Apply mute/solo to gains
    gains.forEach((gain, i) => {
      if (!vupaused) {
      if (muteStates[i] || (soloStates.some(s => s) && !soloStates[i])) {
        gain.gain.value = 0;
      } else {
        gain.gain.value = BASE_GAINS[i];
      }
    }
    });
  }

  function setChannelRoute(route) {
    if (!CHANNEL_ROUTES[route]) return channelRoute;
    if (route === channelRoute) return channelRoute;
    channelRoute = route;
    // Re-wire only gain -> merger edges; gains/analyzers are already indexed by
    // logical channel and keep all their mute/solo state.
    gains.forEach((g, i) => {
      g.disconnect();
      g.connect(merger, 0, CHANNEL_ROUTES[route][i]);
      g.connect(analyzers[i]);
    });
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      browser.storage.local.set({ channelRoute: route });
    }
    return channelRoute;
  }

  window.__UPMIXER = {
    disconnect: () => {
      //merger.disconnect();
      gains.forEach((gain, i) => {
        if (i > 1) {
          gain.gain.value = 0;
        }
      });
      vupaused = true;
      observer.disconnect();
      processedElements.clear();
      //delete window.__UPMIXER;
    },
    getVULevels: () => vuLevels.slice(),
    setChannelStates: updateChannelStates,
    setChannelRoute: setChannelRoute,
    getChannelRoute: () => channelRoute
  };
})();

