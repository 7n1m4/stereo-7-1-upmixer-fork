// Source mute states (temporary, reset on tab reload)
let sourceMuteLeft = false;
let sourceMuteRight = false;
let vupaused = false;

// Check storage on load
browser.storage.local.get(["upmixEnabled", "muteStates", "soloStates"]).then(result => {
  const enabled = result.upmixEnabled || false;
  const muteStates = result.muteStates || new Array(8).fill(false);
  const soloStates = result.soloStates || new Array(8).fill(false);
  if (enabled) {
    browser.runtime.sendMessage({ type: "INJECT_UPMIX" });
    // Apply saved settings after injection
    setTimeout(() => {
      if (window.__UPMIXER) {
        window.__UPMIXER.setChannelStates(muteStates, soloStates, sourceMuteLeft, sourceMuteRight);
      }
    }, 100); // Small delay to ensure upmixer is ready
  }
});

// Receive messages FROM background
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "DISABLE_UPMIX") {
    disableUpmix();
  }
  if (msg.type === "GET_VU_LEVELS") {
    if (window.__UPMIXER) {
      const levels = window.__UPMIXER.getVULevels();
      browser.runtime.sendMessage({ type: "VU_LEVELS_RESPONSE", levels });
    }
  }
  if (msg.type === "SET_CHANNEL_STATES") {
    if (window.__UPMIXER) {
      window.__UPMIXER.setChannelStates(msg.muteStates, msg.soloStates, msg.sourceMuteLeft, msg.sourceMuteRight);
    }
  }
  if (msg.type === "TOGGLE_SOURCE_MUTE_LEFT") {
    sourceMuteLeft = !sourceMuteLeft;
    if (window.__UPMIXER) {
      window.__UPMIXER.setChannelStates(null, null, sourceMuteLeft, sourceMuteRight);
    }
  }
  if (msg.type === "TOGGLE_SOURCE_MUTE_RIGHT") {
    sourceMuteRight = !sourceMuteRight;
    if (window.__UPMIXER) {
      window.__UPMIXER.setChannelStates(null, null, sourceMuteLeft, sourceMuteRight);
    }
  }
  if (msg.type === "GET_SOURCE_MUTE_STATES") {
    browser.runtime.sendMessage({ type: "SOURCE_MUTE_STATES_RESPONSE", sourceMuteLeft, sourceMuteRight });
  }
  if (msg.type === "SET_CHANNEL_ROUTE") {
    if (window.__UPMIXER && window.__UPMIXER.setChannelRoute) {
      window.__UPMIXER.setChannelRoute(msg.route);
    }
  }
  if (msg.type === "UPMIXER_CTRL") {
    window.postMessage(msg, "*");
  }
});

// Receive messages FROM page
window.addEventListener("message", e => {
  if (e.source !== window) return;

  if (e.data?.type === "UPMIXER_LEVELS") {
    browser.runtime.sendMessage(e.data);
  }
});

function disableUpmix() {
  if (window.__UPMIXER) {
    window.__UPMIXER.disconnect();
  }
}
