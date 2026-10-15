// PiPGeek settings page.
'use strict';
const FIREFOX = typeof browser !== 'undefined' && !!(browser.runtime && browser.runtime.getBrowserInfo);
const ALL = { origins: ['http://*/*', 'https://*/*'] };
const $ = (id) => document.getElementById(id);
const MAC = /Mac/.test(navigator.platform);

async function showKey() {
  try {
    const cmds = await chrome.commands.getAll();
    const a = cmds.find((c) => c.name === '_execute_action');
    $('key').textContent = a && a.shortcut ? a.shortcut : 'no shortcut set';
  } catch (e) { /* leave the default text */ }
}

async function refresh() {
  const { autoPip } = await chrome.storage.local.get({ autoPip: false });
  $('auto').checked = !!autoPip;
  const every = FIREFOX ? false : await chrome.permissions.contains(ALL);
  $('every').checked = every;
  $('everyBox').classList.toggle('off', !autoPip);
  $('every').disabled = !autoPip;
}

$('auto').addEventListener('change', async () => {
  await chrome.storage.local.set({ autoPip: $('auto').checked });
  $('autoNote').textContent = $('auto').checked ? 'On. Use PiPGeek once on a tab, or allow every site below.' : 'Off.';
  refresh();
});
$('every').addEventListener('change', async () => {
  if ($('every').checked) {
    const ok = await chrome.permissions.request(ALL).catch(() => false);
    $('autoNote').textContent = ok ? 'On for every site. Pages you already have open need a refresh.' : 'Access was not given, so this stays off.';
  } else {
    await chrome.permissions.remove(ALL).catch(() => false);
    $('autoNote').textContent = 'Access to every site removed.';
  }
  refresh();
});
$('keys').addEventListener('click', () => {
  if (FIREFOX) { $('keysNote').textContent = 'In Firefox: open Add-ons and themes, click the cog, then Manage Extension Shortcuts.'; return; }
  const edge = /\bEdg\//.test(navigator.userAgent);
  chrome.tabs.create({ url: edge ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts' }).catch(() => {
    $('keysNote').textContent = 'Open your browser\'s extensions page and look for Keyboard shortcuts.';
  });
});
chrome.storage.onChanged.addListener(refresh);

if (FIREFOX) {
  $('autoCard').hidden = true; $('ffCard').hidden = false;
  if (MAC) $('ffKey').textContent = 'Cmd+Option+Shift+]';
}
showKey(); refresh();
