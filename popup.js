const toggleBtn = document.getElementById("toggle");
const channels = ['L', 'R', 'C', 'Sub', 'SL', 'SR', 'BL', 'BR'];
let vuLevels = new Array(8).fill(0);
let muteStates = new Array(8).fill(false);
let soloStates = new Array(8).fill(false);
let sourceMuteLeft = false;
let sourceMuteRight = false;
let channelRoute = 'firefox';
let currentTheme = 'midnight-club';
let lastVUUpdate = 0;

const POPUP_WIDTH = 441
const POPUP_HEIGHT = 600

;(async function captureOnOpen() {
  await new Promise(r => requestAnimationFrame(r))

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  })

  let orderpos = 0;

  const popupX = window.outerWidth - POPUP_WIDTH - 47 - (40 * orderpos)
  const popupY = -4

  const dpr = window.devicePixelRatio

  const res = await browser.runtime.sendMessage({
    type: "CAPTURE_TAB",
    windowId: tab.windowId   // ✅ explicit
  })

  if (!res?.image) return

  const img = new Image()
  img.src = res.image

  img.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = POPUP_WIDTH
    canvas.height = POPUP_HEIGHT

    const ctx = canvas.getContext("2d")

    ctx.drawImage(
      img,
      popupX * dpr,
      popupY * dpr,
      POPUP_WIDTH * dpr,
      POPUP_HEIGHT * dpr,
      0,
      0,
      POPUP_WIDTH,
      POPUP_HEIGHT
    )

    document.getElementById("bg").style.backgroundImage =
      `url(${canvas.toDataURL()})`
  }
})()


const themes = {
  'midnight-club': {
    '--bg-color': 'linear-gradient(to bottom,rgba(7, 7, 32, 0.97),rgba(7, 7, 32, 0.97),rgba(7, 7, 32, 0.78))',
    '--text-color': '#15ff00',
    '--border-color': '#ffae00',

    '--toggle-disabled': '#fff',
    '--toggle-enabled': '#fff',
    '--toggle-enabled-bg': '#4CAF50',
    '--toggle-disabled-bg': '#f44336',

    '--vu-bg': '#0005',
    '--vu-border': '#555',
    '--vu-fill': 'linear-gradient(to right, #4CAF50, #FFC107, #f44336)',
    '--btn-border': 'rgb(255, 0, 255)',
    '--btn-bg': '#01002b',
    '--btn-color': 'rgb(255, 0, 255)',
    '--btn-mute-active': 'rgb(255, 255, 255)',
    '--btn-solo-active': 'rgb(255, 255, 255)',
    '--btn-source-mute-active': 'rgb(255, 255, 255)',
    '--mute-active-bg': '#f44336',
    '--solo-active-bg': '#2196F3',
    '--source-mute-bg': '#01002b',
    '--source-mute-active-bg': '#f44336',
    '--theme-label-color': '#15ff00'
  },
  'chilling-twilight': {
    '--bg-color': 'linear-gradient(to bottom,#1a1a2eef,#1a1a2eef,#1a1a2ecc)',
    '--text-color': 'rgb(200, 69, 233)',
    '--border-color':'rgb(0, 0, 240)',
    '--toggle-disabled-bg': 'rgb(200, 69, 233)',
    '--toggle-disabled': '#1a1a2e',
    '--toggle-enabled': 'rgb(200, 69, 233)',
    '--toggle-enabled-bg': '#f44336',
    '--vu-bg': '#16213e99',
    '--vu-border': '#0f3460',
    '--vu-fill': 'linear-gradient(to right,rgb(200, 69, 233),rgb(119, 0, 255),rgb(55, 0, 255))',
    '--btn-border': '#0f3460',
    '--btn-bg': '#16213e',
    '--btn-color': 'rgb(200, 69, 233)',
    '--btn-mute-active': '#1a1a2e',
    '--btn-solo-active': '#1a1a2e',
    '--btn-source-mute-active': '#1a1a2e',
    '--mute-active-bg': '#e74c3c',
    '--solo-active-bg': '#3498db',
    '--source-mute-bg': '#16213e',
    '--source-mute-active-bg': 'rgb(55, 0, 255)',
    '--theme-label-color': 'rgb(200, 69, 233)'
  },
  'fresh-lemonade': {
    '--bg-color': 'linear-gradient(to bottom,#f7f1e3f5,#f7f1e3bb)',
    '--text-color': '#f39c12',
    '--border-color': '#f39c12',
    '--toggle-enabled-bg': '#f1c40f',
    '--toggle-disabled': 'rgb(241, 255, 163)',
    '--toggle-enabled': '#27ae60',
    '--toggle-disabled-bg': '#e74c3c',
    '--vu-bg': 'transparent',
    '--vu-border': '#f39c12',
    '--vu-fill': 'linear-gradient(to right, #27ae60, #f1c40f,rgb(241, 255, 163))',
    '--btn-border': '#f39c12',
    '--btn-bg': 'transparent',
    '--btn-color': '#f39c12',
    '--mute-active-bg': '#27ae60',
    '--solo-active-bg': '#3498db',
    '--source-mute-bg': 'transparent',
    '--btn-source-mute-active': '#27ae60',
    '--source-mute-active-bg': '#27ae60',
    '--theme-label-color': '#f39c12'
  },
  'dark-chocolate': {
    '--bg-color': 'linear-gradient(to bottom,#2c1810ef,#2c1810ef,#2c1810cc)',
    '--text-color': '#d4a574',
    '--border-color': '#8b4513',
    '--toggle-disabled': 'rgb(255, 215, 169)',
    '--toggle-enabled': 'rgb(59, 24, 24)',
    '--toggle-enabled-bg': 'rgb(255, 215, 169)',
    '--toggle-disabled-bg': 'rgb(59, 24, 24)',
    '--vu-bg': '#3e272399',
    '--vu-border': '#5d4037',
    '--vu-fill': 'linear-gradient(to right,rgb(156, 115, 91), rgb(59, 24, 24),rgb(255, 215, 169))',
    '--btn-border': '#8b4513',
    '--btn-bg': '#3e2723',
    '--btn-color': '#d4a574',
    '--mute-active-bg': 'rgb(255, 215, 169)',
    '--btn-mute-active': 'rgb(59, 24, 24)',
    '--btn-solo-active': 'rgb(59, 24, 24)',
    '--btn-source-mute-active': 'rgb(59, 24, 24)',
    '--solo-active-bg': '#daa520',
    '--source-mute-bg': '#3e2723',
    '--source-mute-active-bg': 'rgb(255, 215, 169)',
    '--theme-label-color': '#d4a574'
  },
  'light-cappuccino': {
    '--bg-color': 'linear-gradient(to bottom,#f5f5dcf5,#f5f5dcbb)',
    '--text-color': '#8b4513',
    '--border-color': '#daa520',
    '--toggle-enabled-bg': '#8b4513',
    '--toggle-disabled': '#d3d3d3',
    '--toggle-enabled': '#ffd700',
    '--toggle-disabled-bg': '#dc143c',
    '--vu-bg': '#fff8dc99',
    '--vu-border': '#f5deb3',
    '--vu-fill': 'linear-gradient(to right, #cd853f, #ffd700, #8b4513)',
    '--btn-border': '#daa520',
    '--btn-bg': '#fff8dc',
    '--btn-color': '#8b4513',
    '--mute-active-bg': '#8b4513',
    '--btn-mute-active': '#ffd700',
    '--solo-active-bg': '#4682b4',
    '--source-mute-bg': '#fff8dc',
    '--btn-source-mute-active': 'rgb(255, 215, 169)',
    '--source-mute-active-bg': '#8b4513',
    '--theme-label-color': '#8b4513'
  },
  'cherry-blossom': {
    '--bg-color': 'linear-gradient(to bottom,#ffe4e1f5,#ffe4e1bb)',
    '--text-color': '#dc143c',
    '--border-color': '#ffb6c1',
    '--toggle-enabled-bg': '#ff69b4',
    '--toggle-disabled': '#d3d3d3',
    '--toggle-enabled': '#ffe4e1',
    '--toggle-disabled-bg': '#8b0000',
    '--vu-bg': '#fff0f599',
    '--vu-border': '#ffb6c1',
    '--vu-fill': 'linear-gradient(to right, #ff69b4, #ffa500, #ff1493)',
    '--btn-border': '#ffb6c1',
    '--btn-bg': '#fff0f5',
    '--btn-color': '#dc143c',
    '--mute-active-bg': '#8b0000',
    '--btn-mute-active': '#ff69b4',
    '--solo-active-bg': '#00ced1',
    '--source-mute-bg': '#fff0f5',
    '--btn-source-mute-active': '#ffa500',
    '--source-mute-active-bg': '#ff69b4',
    '--theme-label-color': '#dc143c'
  },
  'colourful-wonderland': {
    '--bg-color':'linear-gradient(to bottom,#00FFFFef,#00FFFFbb)',
    '--text-color': '#ff0000',
    '--border-color': '#00ff00',
    '--toggle-enabled-bg': '#00dd00',
    '--toggle-disabled': '#0000ff',
    '--toggle-enabled': '#ffff00',
    '--toggle-disabled-bg': '#ff0000',
    '--vu-bg': 'transparent',
    '--vu-border': '#ffff00',
    '--vu-fill': 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)',
    '--btn-border': '#ff0000',
    '--btn-bg': 'transparent',
    '--btn-color': '#ff0000',
    '--btn-mute-active': '#00ff00',
    '--mute-active-bg': '#ff0000',
    '--solo-active-bg': '#0000ff',
    '--source-mute-bg': 'transparent',
    '--btn-source-mute-active': '#ff00ff',
    '--source-mute-active-bg': '#ff0000',
    '--theme-label-color': '#0000ff'
  }
};

browser.storage.local.get(["upmixEnabled", "muteStates", "soloStates", "currentTheme", "channelRoute"]).then(result => {
  const enabled = result.upmixEnabled || false;
  muteStates = result.muteStates || new Array(8).fill(false);
  soloStates = result.soloStates || new Array(8).fill(false);
  currentTheme = result.currentTheme || 'midnight-club';
  channelRoute = result.channelRoute || 'firefox';
  document.getElementById('channel-route-select').value = channelRoute;
  applyTheme(currentTheme);
  document.getElementById('theme-select').value = currentTheme;
  updateButton(enabled);
  updateMuteSoloButtons();
  sendChannelStates();
  sendChannelRoute();
});

toggleBtn.addEventListener("click", () => {
  browser.storage.local.get("upmixEnabled").then(result => {
    const enabled = result.upmixEnabled || false;
    const newEnabled = !enabled;
    updateButton(newEnabled);
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      browser.runtime.sendMessage({ type: "TOGGLE_UPMIX", enabled: newEnabled, tabId: tabs[0].id });
    });
  });
});

// Mute/Solo buttons
document.querySelectorAll('.mute-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const channel = channels.indexOf(btn.dataset.channel);
    muteStates[channel] = !muteStates[channel];
    updateMuteSoloButtons();
    saveMuteSoloStates();
    sendChannelStates();
  });
});

document.querySelectorAll('.solo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const channel = channels.indexOf(btn.dataset.channel);
    soloStates[channel] = !soloStates[channel];
    updateMuteSoloButtons();
    saveMuteSoloStates();
    sendChannelStates();
  });
});

// VU meters update
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "VU_LEVELS_RESPONSE") {
    vuLevels = msg.levels;
    updateVUMeters();
  }
});

function pollVULevels() {
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    browser.tabs.sendMessage(tabs[0].id, { type: "GET_VU_LEVELS" });

    
    
    setTimeout(pollVULevels, 42); // 24fps
  });
}
pollVULevels();

function updateButton(enabled) {
  toggleBtn.textContent = enabled ? "Disable Upmix" : "Enable Upmix";
  toggleBtn.className = enabled ? "enabled" : "disabled";
}

function updateMuteSoloButtons() {
  document.querySelectorAll('.mute-btn').forEach((btn, i) => {
    btn.classList.toggle('active', muteStates[i]);
  });
  document.querySelectorAll('.solo-btn').forEach((btn, i) => {
    btn.classList.toggle('active', soloStates[i]);
  });
}

function updateVUMeters() {
  channels.forEach((ch, i) => {
    const fill = document.getElementById(`vu-${ch}`);
    const level = Math.min(100, vuLevels[i] * 180);
    fill.style.width = `${level}%`;
  });
}

function saveMuteSoloStates() {
  browser.storage.local.set({ muteStates, soloStates });
}

function sendChannelStates() {
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    browser.tabs.sendMessage(tabs[0].id, { type: "SET_CHANNEL_STATES", muteStates, soloStates, sourceMuteLeft, sourceMuteRight });
  });
}

function sendChannelRoute() {
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    browser.tabs.sendMessage(tabs[0].id, { type: "SET_CHANNEL_ROUTE", route: channelRoute });
  });
}

// Source mute buttons (temporary, no storage)
document.getElementById('mute-source-left').addEventListener('click', () => {
  sourceMuteLeft = !sourceMuteLeft;
  updateSourceMuteButtons();
  sendChannelStates();
});

document.getElementById('mute-source-right').addEventListener('click', () => {
  sourceMuteRight = !sourceMuteRight;
  updateSourceMuteButtons();
  sendChannelStates();
});

// Channel order selector (Firefox 7.1 vs ALSA device order)
document.getElementById('channel-route-select').addEventListener('change', (e) => {
  channelRoute = e.target.value;
  browser.storage.local.set({ channelRoute });
  sendChannelRoute();
});

// Theme selector
document.getElementById('theme-select').addEventListener('change', (e) => {
  currentTheme = e.target.value;
  applyTheme(currentTheme);
  browser.storage.local.set({ currentTheme });
});

function applyTheme(theme) {
  const themeVars = themes[theme];
  Object.keys(themeVars).forEach(key => {
    document.documentElement.style.setProperty(key, themeVars[key]);
  });
}

function updateSourceMuteButtons() {
  document.getElementById('mute-source-left').classList.toggle('active', sourceMuteLeft);
  document.getElementById('mute-source-right').classList.toggle('active', sourceMuteRight);
}
