# PiPGeek: Picture in Picture

Pop the main video on any page out into a small floating window that stays on top of everything else. One click on the icon, or Alt+P. Click again to put it back.

**Download and full guide:** https://techygeekshome.info/browser-extensions/pipgeek/

## What it does

- **One click or Alt+P** pops the video out. Do it again and the video goes back into the page.
- **Picks the right video for you**: the biggest one that is playing and on screen, not the small advert in the corner or the paused trailer further down.
- **Finds videos other tools miss**: inside frames from the same site, inside page components (shadow roots, open and closed) and in players that nest the two.
- **Works on players that switch it off.** Some sites add `disablePictureInPicture` to their player. PiPGeek removes it from that video, then pops it out.
- **Right-click any video** and pick **Pop out video** to choose that one.
- **Pop out when I switch tabs** (optional, Chrome, Edge and other Chromium browsers): the playing video floats out by itself when you move to another tab, using the browser's own Media Session "enterpictureinpicture" action.

## What it won't do

- It can't reach a video inside a frame from another site (an embedded player) unless you allow PiPGeek on every site in its settings. Without that, it tells you, and the browser's own right-click item still works.
- It can't run on browser pages such as settings, the extension stores or the PDF viewer. The icon shows a "!" there.
- Pop out when I switch tabs is up to the browser: Chromium only does it while the video plays with sound, and may ask you once. Firefox does not offer it to add-ons.
- In Firefox, a click on the toolbar icon does not count as you using the page, so Firefox refuses the first try. PiPGeek then puts a **Pop out video** button on the video: one more click and it floats. Alt+P and the right-click menu work straight away.

## Install

Pick the download for your browser from the [latest release](https://github.com/techygeekshome/PiPGeek/releases/latest).

| Browser | Download |
|---|---|
| Chrome, Brave, Opera, Vivaldi | `PiPGeek-chrome.zip` |
| Microsoft Edge | `PiPGeek-edge.zip` |
| Firefox (142 or newer) | `PiPGeek-firefox.zip` |

`PiPGeek.zip` is the same package as the Chrome and Edge downloads.

### Chrome, Edge, Brave, Opera and Vivaldi

1. Unzip the download somewhere you'll keep it.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and pick the `pipgeek` folder.
5. Pin the icon to your toolbar so it is one click away.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and pick `PiPGeek-firefox.zip`.

Firefox removes temporary add-ons when it closes.

### Build it yourself

The code in this repo is the Chromium version. `manifest.firefox.json` is the Firefox manifest. Run `./build.sh` to make every package in `dist/`.

## Use

1. Open a page with a video and click the PiPGeek icon, or press **Alt+P**.
2. The video floats in a small window. Move it, resize it, and carry on in other tabs or apps.
3. Click the icon or press **Alt+P** again to put it back.
4. To pick one video, right-click it and choose **Pop out video**. Some sites have their own menu: right-click a second time to get the browser's menu.
5. To change the shortcut or switch on pop out when I switch tabs, right-click the icon and open the settings.

## How it works

- `background.js` listens for the icon, the shortcut and the right-click menu. Only then does it run `pipgeek-core.js` in the tab you are on, using the browser's `activeTab` and `scripting` permissions.
- `pipgeek-core.js` looks through the page, its same-site frames and its shadow roots, scores every video (playing and on screen first, then the biggest), and calls the browser's own `requestPictureInPicture()`. If the browser says no, it shows a button on the video, because a click there always counts.
- `auto.js` is only used if you switch on pop out when I switch tabs **and** allow PiPGeek on every site. It registers the Media Session `enterpictureinpicture` action on each page. Without every-site access, the same action is registered on tabs where you have used PiPGeek.

## Privacy

PiPGeek has no account, no analytics, no adverts and sends nothing anywhere. It only looks at a page when you click its icon, press its shortcut or use its right-click item. The only thing it stores is your pop out when I switch tabs setting, on your own computer.

## Licence

GPL-3.0. Free for everyone, including commercial use.

PiPGeek is an independent tool made by [TechyGeeksHome](https://techygeekshome.info). Picture-in-picture windows are drawn by your browser.
