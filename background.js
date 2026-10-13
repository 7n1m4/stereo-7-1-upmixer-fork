// Service worker for extension lifecycle
browser.runtime.onInstalled.addListener(() => {
  console.log('Surround Upmixer 7.1 installed');
  // Set initial icon based on stored upmix state
  browser.storage.local.get(["upmixEnabled", "muteStates", "soloStates", "channelRoute"]).then(result => {
    const enabled = result.upmixEnabled || false;
    const muteStates = result.muteStates || new Array(8).fill(false);
    const soloStates = result.soloStates || new Array(8).fill(false);
    const iconPath = enabled ? "icon48on.png" : "icon48.png";
    browser.action.setIcon({ path: iconPath });
    if (enabled) {
      browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["audio_processor.js"]
          }).then(() => {
            browser.tabs.sendMessage(tab.id, { type: "SET_CHANNEL_STATES", muteStates, soloStates, sourceMuteLeft: false, sourceMuteRight: false });
            browser.tabs.sendMessage(tab.id, { type: "SET_CHANNEL_ROUTE", route: result.channelRoute || 'firefox' });
          });
        });
      });
    }
  });
});

browser.runtime.onStartup.addListener(() => {
  console.log('Surround Upmixer 7.1 started');
  // Set initial icon based on stored upmix state
  browser.storage.local.get(["upmixEnabled", "muteStates", "soloStates", "channelRoute"]).then(result => {
    const enabled = result.upmixEnabled || false;
    const muteStates = result.muteStates || new Array(8).fill(false);
    const soloStates = result.soloStates || new Array(8).fill(false);
    const iconPath = enabled ? "icon48on.png" : "icon48.png";
    browser.action.setIcon({ path: iconPath });
    if (enabled) {
      browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["audio_processor.js"]
          }).then(() => {
            browser.tabs.sendMessage(tab.id, { type: "SET_CHANNEL_STATES", muteStates, soloStates, sourceMuteLeft: false, sourceMuteRight: false });
            browser.tabs.sendMessage(tab.id, { type: "SET_CHANNEL_ROUTE", route: result.channelRoute || 'firefox' });
          });
        });
      });
    }
  });
});

browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "CAPTURE_TAB") {
    return browser.tabs.captureVisibleTab(
      msg.windowId,          // ✅ use passed value
      { format: "png" }
    ).then(image => ({ image }))
  }
  if (msg.type === "TOGGLE_UPMIX") {
    browser.storage.local.set({ upmixEnabled: msg.enabled });
    // Set icon based on upmix state
    const iconPath = msg.enabled ? "icon48on.png" : "icon48.png";
    browser.action.setIcon({ path: iconPath });
    if (msg.enabled) {
      browser.storage.local.get(["muteStates", "soloStates", "channelRoute"]).then(result => {
        const muteStates = result.muteStates || new Array(8).fill(false);
        const soloStates = result.soloStates || new Array(8).fill(false);
        browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          files: ["audio_processor.js"]
        }).then(() => {
          browser.tabs.sendMessage(msg.tabId, { type: "SET_CHANNEL_STATES", muteStates, soloStates, sourceMuteLeft: false, sourceMuteRight: false });
          browser.tabs.sendMessage(msg.tabId, { type: "SET_CHANNEL_ROUTE", route: result.channelRoute || 'firefox' });
        });
      });
    } else {
      browser.tabs.sendMessage(msg.tabId, { type: "DISABLE_UPMIX" });
    }
  }
  if (msg.type === "INJECT_UPMIX") {
    browser.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ["audio_processor.js"]
    });
  }
  if (msg.type === "VU_LEVELS_RESPONSE") {
    // Forward to popup
    browser.runtime.sendMessage(msg);
  }
});
