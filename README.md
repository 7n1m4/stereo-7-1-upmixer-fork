# Stereo to 7.1 Surround Upmixer — patched

A patched build of **Stereo to 7.1 Surround Upmixer** (`upmixer@silkworm`), a
Firefox extension that upmixes stereo audio from `<audio>`/`<video>` elements to
7.1 in real time.

[Original add-on on AMO](https://addons.mozilla.org/en-US/firefox/addon/stereo-to-7-1-surround-upmixer)
· original author: **Silkworm** · original version: 1.0.61

This repository is **not** the upstream project. It is a local fork kept so one
bug can be fixed and shared. The upstream code carries no license declaration;
it is reproduced here under the author's implicit all-rights-reserved position
for personal use. Everything added by this fork is described below.

## The bug: side and rear channels were swapped

The original wired Web Audio `ChannelMerger` output indices 4–7 as
`SL, SR, BL, BR`. That is the ALSA `surround71` order, but **Firefox uses a
different order**.

Firefox derives the channel map for any 8-channel stream in
`dom/media/AudioConfig.cpp` (`DefaultLayoutForChannels`, `case 8: // 3F4-LFE`):

```
{ FRONT_LEFT, FRONT_RIGHT, FRONT_CENTER, LFE, BACK_LEFT, BACK_RIGHT, SIDE_LEFT, SIDE_RIGHT }
```

and passes it to cubeb from `dom/media/GraphDriver.cpp`
(`AudioConfig::ChannelLayout(mOutputChannelCount).Map()`). cubeb then walks the
SMPTE bitmask in ascending order (`cubeb_pulse.c`, `layout_to_channel_map`),
which reproduces that same order.

So inside Firefox, merger output index 4 is the **rear** speaker, not the side
speaker. The original mapping therefore sent "Side Left" to the rear speaker
and "Back Left" to the side speaker. Indices 0–3 (`L`, `R`, `C`, `Sub`) were
unaffected, which is exactly the symptom reported.

This was not a detection issue — nothing in the extension detects anything. It
was a static channel-order mismatch between the ALSA convention and the
Firefox one.

## The fix

`audio_processor.js` now routes each logical channel to its device channel
through an explicit table, instead of wiring merger input `i` directly:

```js
const CHANNEL_ROUTES = {
  firefox: [0, 1, 2, 3, 6, 7, 4, 5],   // default: SL->6 SR->7, BL->4 BR->5
  alsa:    [0, 1, 2, 3, 4, 5, 6, 7]    // the original wiring
};
```

A popup selector (`Channel Order`) switches between the two, persists the
choice in `browser.storage.local.channelRoute`, and applies it live to an
already-running upmix. Both paths default to `firefox`, which is correct inside
Firefox and on PipeWire.

The change is additive: `gains[]`, `analyzers[]`, `muteStates[]`, `soloStates[]`
and `vuLevels[]` all still use the extension's own logical order, so mute, solo,
source-mute, VU meters and `disconnect()` are untouched. `setChannelRoute`
re-wires only the `gain -> merger` edges and leaves every gain's mute/solo
state intact.

## Install

Unsigned build, so load it as a **temporary add-on**:

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…**
3. Pick `manifest.json` from this directory, or build an XPI with
   `zip -r out.xpi . -x '.git/*'`

Re-apply after each Firefox restart.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest, `gecko.strict_min_version` 58 |
| `audio_processor.js` | the DSP graph and the channel-route switch |
| `content_script.js` | page ↔ extension message bridge |
| `background.js` | injection, icon state, tab capture |
| `popup.js` / `.html` / `.css` | 8-channel VU/meter UI and the selector |
| `*.ttf` | UI webfonts (both SIL OFL 1.1) |
| `icon48*.png` | extension icons |

## Known pre-existing issues, untouched

`vupaused` is assigned throughout `audio_processor.js` but never declared, so in
the browser it leaks as an implicit global. Harmless in practice; left alone
because fixing it is unrelated to the routing bug.

`updateChannelStates` overwrites `gains[2]` and `gains[3]` with a hard-coded
`0.5`, which will clobber any future per-channel center/sub balance change.
Also out of scope here.

## Credits

Upstream extension by **Silkworm** — all credit for the original design and DSP
belongs to them. This fork only reorders the output channels. Both webfonts are
SIL Open Font License 1.1 (Pacifico by the Pacifico Project Authors, Shadows
Into Light Two by Kimberly Geswein).
