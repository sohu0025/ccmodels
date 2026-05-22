import { BrowserWindow, Tray, nativeImage, Notification, app, shell, screen, ipcMain } from 'electron';
import type { NativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { getAllAds } from './database/ads';
import { getProvidersForTool, getToolActiveProviderId, setToolActiveProvider } from './database/providers';
import { getSettings, updateSettings } from './database/settings';
import { getCliTools, getMessages } from '@ccmodels/shared';
import type { Locale } from '@ccmodels/shared';

const MENU_W = 200;
const SUB_W = 210;
const POPUP_W = MENU_W + SUB_W;

let tray: Tray | null = null;
let popup: BrowserWindow | null = null;
let showing = false;
let flipped = false;
let blurTimer: ReturnType<typeof setTimeout> | null = null;

function getIcon(): NativeImage {
  // Packaged: extraResources puts icon.png at process.resourcesPath/icon.png
  // Dev: resources/icon.png is at __dirname/../../resources/icon.png
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../resources/icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  }
  // Fallback: blue 1x1 pixel
  const blue1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(blue1x1).resize({ width: 16, height: 16 });
}

function buildHtml(websiteUrl: string, maxHeight?: number): string {
  const s = getSettings();
  const loc = (s.locale ?? 'zh-CN') as Locale;
  const t = getMessages(loc);
  const tools = getCliTools();

  const toolSec = tools.map(tool => {
    const provs = getProvidersForTool(tool.name);
    if (!provs.length) return '';
    const activeId = getToolActiveProviderId(tool.name);
    const items = provs.map(p => `
      <div class="si" data-a="set-provider" data-t="${tool.name}" data-p="${p.id}">
        <span class="ck">${p.id === activeId ? '✓' : ''}</span><span>${esc(p.name)}</span>
      </div>`).join('');
    return `
      <div class="ti">
        <span class="ck"></span><span>${esc(tool.displayName)}</span>
        <span class="cv">›</span>
        <div class="sw">${items}</div>
      </div>`;
  }).filter(Boolean).join('');

  const textAds = getAllAds().filter(a => a.type === 'text' && a.enabled && a.textContent);
  const textAd = textAds.length > 0 ? textAds[0] : null;
  const adUrl = textAd?.linkUrl || '';
  const adText = textAd ? textAd.textContent.slice(0, 8) : null;
  const mcAttr = maxHeight ? ` data-mh="${maxHeight}"` : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,"Microsoft YaHei UI","Segoe UI",sans-serif;font-size:13px;color:#1a1a1a;background:transparent;overflow:hidden;user-select:none}
.wrap{position:relative;width:${POPUP_W}px;background:transparent}
.mm{width:${MENU_W}px;margin-left:0;padding:4px 0;background:rgba(250,250,250,0.98);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15)}
.wrap.fl .mm{margin-left:${SUB_W}px}
.item,.ti{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 8px;cursor:default;white-space:nowrap;min-height:28px}
.item:hover{background:#e5e5e5}
.ck{width:14px;text-align:center;font-size:12px;color:#0078d4;flex-shrink:0}
.ti{position:relative;padding-right:4px}
.ti:hover{background:#e5e5e5}
.cv{margin-left:auto;font-size:12px;color:#888;flex-shrink:0;padding-left:4px}
.sw{display:none;position:absolute;top:-4px;background:rgba(250,250,250,0.98);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);min-width:${SUB_W}px;padding:4px 0;z-index:20}
.wrap:not(.fl) .sw{left:100%}
.wrap.fl .sw{right:100%;left:auto}
.ti.hov .sw{display:block}
.si{display:flex;align-items:center;gap:6px;padding:5px 12px 5px 8px;cursor:default;white-space:nowrap;min-height:26px}
.si:hover{background:#e5e5e5}
.si .ck{width:14px;text-align:center;font-size:12px;color:#0078d4;flex-shrink:0}
.sep{height:1px;background:#e0e0e0;margin:3px 8px}
</style></head><body>
<div class="wrap${flipped ? ' fl' : ''}">
<div class="mm">
<div class="mc"${mcAttr}>
<div class="item" data-a="show-window"><span class="ck"></span><span>${esc(t.tray.openWindow)}</span></div>
${websiteUrl
  ? `<div class="item" data-a="visit-website" data-url="${esc(websiteUrl)}"><span class="ck"></span><span>${esc(t.tray.visitWebsite)}</span></div>`
  : ''
}
<div class="sep"></div>
${adText
  ? `<div class="item" data-a="${adUrl ? 'open-ad-url' : 'hide-popup'}" data-url="${esc(adUrl)}" style="color:#e67e22;font-weight:600"><span class="ck">◆</span><span>${esc(adText)}</span></div>`
  : ''
}
${adText && toolSec ? `<div class="sep"></div>` : ''}${toolSec ? toolSec : ''}
${adText || toolSec ? '<div class="sep"></div>' : ''}
<div class="item" data-a="quit"><span class="ck"></span><span>${esc(t.tray.quit)}</span></div>
</div>
</div>
</div>
<script>
(function(){
var mc=document.querySelector('.mc');
var mh=mc?parseInt(mc.getAttribute('data-mh')||'0'):0;
if(mh>0){
  var pos=0,mp=0;
  function clamp(){
    mp=Math.max(0,mc.scrollHeight-mh);
    pos=Math.max(0,Math.min(mp,pos));
    mc.style.transform='translateY('+(-pos)+'px)';
  }
  mc.addEventListener('wheel',function(e){
    // If event target is inside a scrollable submenu, let it scroll naturally
    for(var el=e.target;el&&el!==mc;el=el.parentElement){
      if(el.classList&&el.classList.contains('sw')&&el.scrollHeight>el.clientHeight){
        var prev=el.scrollTop;
        el.scrollTop+=e.deltaY;
        if(prev!==el.scrollTop) return;
        break;
      }
    }
    e.preventDefault();pos+=e.deltaY;clamp();
  },{passive:false});
  clamp();
}
document.querySelectorAll('.item[data-a],.si[data-a]').forEach(function(el){
  el.addEventListener('click',function(e){e.stopPropagation();window.trayPopup.action(this.dataset.a,{tool:this.dataset.t,providerId:this.dataset.p,url:this.dataset.url})})
});
document.querySelectorAll('.ti').forEach(function(el){
  var t;
  var sw=el.querySelector('.sw');
  var onIn=function(){
    clearTimeout(t);el.classList.add('hov');
    if(sw){
      // Estimate submenu height from provider count
      var n=sw.querySelectorAll('.si').length;
      var est=n*28;
      var r=el.getBoundingClientRect();
      var mm=document.querySelector('.mm').getBoundingClientRect();
      var below=mm.bottom-r.top-6;
      var above=r.bottom-mm.top-6;
      if(below>=above&&est<=below){
        sw.style.top='-4px';sw.style.bottom='auto';sw.style.maxHeight='';sw.style.overflowY='';
      }else if(above>below&&est<=above){
        sw.style.top='auto';sw.style.bottom='0';sw.style.maxHeight='';sw.style.overflowY='';
      }else if(below>=above){
        sw.style.top='-4px';sw.style.bottom='auto';sw.style.maxHeight=Math.max(80,below-4)+'px';sw.style.overflowY='auto';
      }else{
        sw.style.top='auto';sw.style.bottom='0';sw.style.maxHeight=Math.max(80,above-4)+'px';sw.style.overflowY='auto';
      }
    }
  };
  var onOut=function(){t=setTimeout(function(){el.classList.remove('hov')},300)};
  el.addEventListener('mouseenter',onIn);
  el.addEventListener('mouseleave',onOut);
  if(sw){sw.addEventListener('mouseenter',onIn);sw.addEventListener('mouseleave',onOut)}
});
})();
</script></body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getPos(): { x: number; y: number; w: number } {
  const wa = screen.getPrimaryDisplay().workArea;
  const tb = tray!.getBounds();
  let x: number;
  flipped = false;

  // Center popup horizontally relative to tray icon
  x = Math.round(tb.x + tb.width / 2 - MENU_W / 2);

  // Check if there's room for the full popup (menu + submenu)
  if (x + POPUP_W > wa.x + wa.width) {
    flipped = true;
    // Popup right edge 5px from screen, with submenu on left side
    x = wa.x + wa.width - POPUP_W - 5;
  }

  if (x < wa.x) x = wa.x;
  // y = bottom edge of tray icon
  return { x, y: tb.y + tb.height, w: POPUP_W };
}

function ensurePopup(): BrowserWindow {
  if (popup && !popup.isDestroyed()) return popup;
  popup = new BrowserWindow({
    width: POPUP_W, height: 1, show: false,
    frame: false, transparent: true, resizable: false,
    skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/tray-popup.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  });
  popup.on('blur', () => {
    if (!showing || !popup || popup.isDestroyed()) return;
    // Delay hide so clicking scrollbar doesn't immediately dismiss
    blurTimer = setTimeout(() => {
      if (popup && !popup.isDestroyed() && showing) {
        const cursor = screen.getCursorScreenPoint();
        const b = popup.getBounds();
        // Only hide if mouse is outside the popup
        if (cursor.x < b.x || cursor.x > b.x + b.width || cursor.y < b.y || cursor.y > b.y + b.height) {
          showing = false;
          popup.hide();
        }
      }
    }, 120);
  });
  return popup;
}

async function showPopup(): Promise<void> {
  const w = ensurePopup();
  const { x, y: trayBottomY, w: winW } = getPos();
  const wa = screen.getPrimaryDisplay().workArea;
  showing = true;

  // Fetch website URL from backend for conditional menu item
  let websiteUrl = '';
  try {
    const s = getSettings();
    if (s.serverUrl) {
      const res = await fetch(`${s.serverUrl}/api/system-settings`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json() as any;
        if (data.websiteUrl) websiteUrl = data.websiteUrl;
      }
    }
  } catch {}

  const maxMenuH = wa.height - 40;
  w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildHtml(websiteUrl, maxMenuH)));
  w.webContents.once('did-finish-load', () => {
    if (w.isDestroyed() || !showing) return;
    w.webContents.executeJavaScript('document.querySelector(".mc").offsetHeight').then((h: number) => {
      if (w.isDestroyed() || !showing) return;

      const popupH = Math.min(h + 8, maxMenuH + 8);

      // Try above tray icon first
      let posY = trayBottomY - popupH - 4;
      if (posY < wa.y) {
        // Not enough room above → place below tray icon
        posY = trayBottomY + 4;
      }
      // Clamp to work area bottom
      if (posY + popupH > wa.y + wa.height) {
        posY = wa.y + wa.height - popupH - 4;
      }
      if (posY < wa.y) posY = wa.y;

      w.setBounds({ x, y: posY, width: winW, height: popupH });
      w.show(); w.focus();
    }).catch(() => {
      if (w.isDestroyed() || !showing) return;
      w.setPosition(x, trayBottomY); w.show(); w.focus();
    });
  });
}

function hidePopup(): void {
  if (blurTimer) clearTimeout(blurTimer);
  showing = false;
  if (popup && !popup.isDestroyed()) popup.hide();
}

/** Rebuild and show the popup if currently visible — call after provider mutations */
export function refreshPopup(): void {
  if (popup && !popup.isDestroyed() && popup.isVisible()) {
    showPopup();
  }
}

export function initTray(mainWindow: BrowserWindow): void {
  registerHandlers(mainWindow);
  try {
    const icon = getIcon();
    tray = new Tray(icon);
    tray.setToolTip('CC Models');
    tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
    tray.on('click', () => {
      if (popup && !popup.isDestroyed() && popup.isVisible()) hidePopup(); else showPopup();
    });
    tray.on('right-click', () => showPopup());
  } catch (e: any) { console.error('[Tray] failed:', e.message); }
}

function registerHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('tray:action', async (_e, action: string, payload?: any) => {
    switch (action) {
      case 'show-window': mainWindow.show(); mainWindow.focus(); hidePopup(); break;
      case 'open-ad-url':
        if (payload?.url) { shell.openExternal(payload.url); }
        hidePopup();
        break;
      case 'visit-website':
        if (payload?.url) shell.openExternal(payload.url);
        hidePopup();
        break;
      case 'toggle-lightweight': {
        const cur = getSettings(); const nv = !cur.lightweightMode;
        updateSettings({ lightweightMode: nv });
        if (nv) mainWindow.hide(); else { mainWindow.show(); mainWindow.focus(); }
        if (popup && !popup.isDestroyed() && popup.isVisible()) showPopup();
        break;
      }
      case 'set-provider':
        if (payload?.tool && payload?.providerId) {
          setToolActiveProvider(payload.tool, payload.providerId);
          hidePopup();
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('provider:toolActiveChanged', { tool: payload.tool, providerId: payload.providerId });
          }
        }
        break;
      case 'quit': app.quit(); break;
    }
  });
}

export function updateTrayMenu(_mainWindow: BrowserWindow): void {
  if (tray) { const s = getSettings(); tray.setToolTip(getMessages((s.locale ?? 'zh-CN') as Locale).app.name || 'CC Models'); }
}

export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show();
}
