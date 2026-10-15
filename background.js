// PiPGeek: one click (or Alt+P) pops the main video on the page out into a floating picture-in-picture window.
// Click again to put it back. Right-click a video and pick "Pop out video" for that one video.
// Nothing is sent anywhere: the only thing PiPGeek stores is your "pop out when I switch tabs" choice.
'use strict';
if (typeof importScripts === 'function') importScripts('pipgeek-core.js');   // Firefox loads it from the manifest

const FIREFOX = typeof browser !== 'undefined' && !!(browser.runtime && browser.runtime.getBrowserInfo);
const ALL = ['http://*/*', 'https://*/*'];
const SCRIPT_ID = 'pipgeek-auto';

// ---------- running the page code ----------
function inject(tabId, cmd, frameIds, allFrames) {
  const target = { tabId };
  if (frameIds) target.frameIds = frameIds; else if (allFrames) target.allFrames = true;
  return chrome.scripting.executeScript({ target, func: pipgeekRun, args: [cmd] });
}

// Shown on the icon when PiPGeek can't run on a page (browser pages, extension stores, PDF viewer).
function cannot(tabId) {
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#4f46e5' }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text: '!' }).catch(() => {});
  chrome.action.setTitle({ tabId, title: 'PiPGeek can\'t work on this page (browser pages and add-on stores are off limits)' }).catch(() => {});
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
    chrome.action.setTitle({ tabId, title: '' }).catch(() => {});
  }, 4000);
}

// The video may be inside a frame from another site. With access to that site, find the best frame and use it.
async function tryFrames(tabId, cmd) {
  let res;
  try { res = await inject(tabId, { mode: 'scan', src: cmd.src }, null, true); } catch (e) { return null; }
  const frames = (res || []).filter((r) => r.frameId !== 0 && r.result && r.result.score >= 0).sort((a, b) => b.result.score - a.result.score);
  if (!frames.length) return null;
  const r = await inject(tabId, Object.assign({}, cmd), [frames[0].frameId]);
  return r && r[0] && r[0].result;
}

async function finish(tabId, first, cmd) {
  // Called after the first run (which must start straight away so the browser counts it as your click).
  let out;
  try { out = (await first)[0].result; } catch (e) { cannot(tabId); return { ok: false, error: String(e && e.message || e) }; }
  if (out && out.reason === 'no-video' && out.foreign) {
    const f = await tryFrames(tabId, cmd).catch(() => null);
    if (f) return f;
    await inject(tabId, { mode: 'note' }, [0]).catch(() => {});
  }
  return out;
}

// Toolbar click and the keyboard shortcut (the "_execute_action" command) both arrive here.
function toggle(tab) {
  const cmd = { mode: 'toggle' };
  return finish(tab.id, inject(tab.id, cmd, [0]), cmd);
}
chrome.action.onClicked.addListener((tab) => { toggle(tab); });

// ---------- right-click menu ----------
function menus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'pop', title: 'Pop out video', contexts: ['video'] });
    if (!FIREFOX) {
      chrome.storage.local.get({ autoPip: false }).then((s) => {
        chrome.contextMenus.create({ id: 'auto', type: 'checkbox', checked: !!s.autoPip, title: 'Pop out automatically when I switch tabs', contexts: ['action'] });
      });
    }
  });
}
chrome.runtime.onInstalled.addListener(menus);
chrome.runtime.onStartup.addListener(menus);

function popOut(info, tab) {
  const cmd = { mode: 'enter', src: info.srcUrl || '' };
  return finish(tab.id, inject(tab.id, cmd, [info.frameId || 0]), cmd);
}
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'pop' && tab) popOut(info, tab);
  else if (info.menuItemId === 'auto') chrome.storage.local.set({ autoPip: !!info.checked });
});

// ---------- pop out when I switch tabs ----------
// Without extra access it works on tabs where you have used PiPGeek since the page loaded (the page code turns it on).
// With access to every site (optional, asked for in Settings), a small script turns it on for every page.
let syncing = Promise.resolve();
function syncAutoScript() {
  // one at a time, so two quick changes can't register the script twice
  syncing = syncing.then(doSyncAutoScript).catch(() => {});
  return syncing;
}
async function doSyncAutoScript() {
  if (FIREFOX || !chrome.scripting.registerContentScripts) return;
  const { autoPip } = await chrome.storage.local.get({ autoPip: false });
  const everywhere = await chrome.permissions.contains({ origins: ALL });
  const have = (await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] }).catch(() => [])).length > 0;
  if (autoPip && everywhere && !have) {
    await chrome.scripting.registerContentScripts([{ id: SCRIPT_ID, matches: ALL, js: ['pipgeek-core.js', 'auto.js'], runAt: 'document_idle', allFrames: false, persistAcrossSessions: true }]);
  } else if ((!autoPip || !everywhere) && have) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local' || !ch.autoPip) return;
  if (!FIREFOX) chrome.contextMenus.update('auto', { checked: !!ch.autoPip.newValue }, () => void chrome.runtime.lastError);
  syncAutoScript();
});
if (chrome.permissions.onAdded) chrome.permissions.onAdded.addListener(syncAutoScript);
if (chrome.permissions.onRemoved) chrome.permissions.onRemoved.addListener(syncAutoScript);
chrome.runtime.onStartup.addListener(syncAutoScript);
chrome.runtime.onInstalled.addListener(syncAutoScript);
