import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from './app.vue';
import Character from './Pages/Character.vue';
import Init from './Pages/Init.vue';
import Inventory from './Pages/Inventory.vue';
import Layout from './Pages/Layout.vue';
import Stage from './Pages/Stage.vue';
import System from './Pages/System.vue';
import Tasks from './Pages/Tasks.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', component: Stage },
        { path: 'character', component: Character },
        { path: 'tasks', component: Tasks },
        { path: 'inventory', component: Inventory },
        { path: 'system', component: System },
        { path: 'init', component: Init },
      ],
    },
  ],
});
router.replace('/');

// 统一的iframe高度管理
function setIframeHeight(px: number = 715) {
  try {
    const frame = window.frameElement as HTMLElement | null;
    if (!frame) return;
    // 全屏时不干预
    if (frame.getAttribute('data-dnd-fs') === '1') return;

    frame.style.setProperty('height', `${px}px`, 'important');
    frame.style.setProperty('max-height', 'none', 'important');
    frame.style.setProperty('width', '100%', 'important');
  } catch (e) {
    // ignore
  }
}

// 暴露给Layout.vue使用
(window as any).__dndSetIframeHeight = setIframeHeight;

// 存储原始样式，用于恢复
const originalHostStyles = new Map<HTMLElement, Record<string, string>>();

function saveOriginalStyle(el: HTMLElement, props: string[]) {
  if (originalHostStyles.has(el)) return;
  const styles: Record<string, string> = {};
  for (const prop of props) {
    styles[prop] = el.style.getPropertyValue(prop) || '';
  }
  originalHostStyles.set(el, styles);
}

function restoreOriginalStyle(el: HTMLElement) {
  const styles = originalHostStyles.get(el);
  if (!styles) return;
  for (const [prop, value] of Object.entries(styles)) {
    if (value) {
      el.style.setProperty(prop, value);
    } else {
      el.style.removeProperty(prop);
    }
  }
  originalHostStyles.delete(el);
}

function manageHostScrollbars(hide: boolean = true) {
  try {
    const frame = window.frameElement as HTMLElement | null;
    if (!frame) return;

    const hostDoc = frame.ownerDocument;
    if (!hostDoc) return;

    const chat = hostDoc.querySelector('#chat') as HTMLElement | null;
    const sheld = hostDoc.querySelector('#sheld') as HTMLElement | null;
    const mesText = (frame.parentElement?.closest('.mes_text') || frame.closest('.mes_text')) as HTMLElement | null;
    const mes = (frame.parentElement?.closest('.mes') || frame.closest('.mes')) as HTMLElement | null;
    const block = (frame.parentElement?.closest('.mes_block') || frame.closest('.mes_block')) as HTMLElement | null;

    const elements = [chat, sheld, mesText, mes, block].filter(Boolean) as HTMLElement[];

    if (hide) {
      // 隐藏滚动条，但保存原始样式
      for (const el of elements) {
        if (el === chat || el === sheld) {
          saveOriginalStyle(el, ['overflow', 'max-height']);
          el.style.setProperty('overflow', 'hidden', 'important');
          if (el === chat) el.style.setProperty('max-height', 'none', 'important');
        } else {
          saveOriginalStyle(el, ['overflow', 'max-height', 'height', 'padding-bottom']);
          el.style.setProperty('overflow', 'visible', 'important');
          el.style.setProperty('max-height', 'none', 'important');
          el.style.setProperty('height', 'auto', 'important');
          if (el === mesText) el.style.setProperty('padding-bottom', '0', 'important');
        }
      }
    } else {
      // 恢复原始样式，并确保宿主主要滚动容器可滚动
      for (const el of elements) {
        restoreOriginalStyle(el);
        try {
          // 关键：让 #chat 与 #sheld 恢复滚动能力
          if (el === chat || el === sheld) {
            el.style.setProperty('overflow', 'auto', 'important');
            if (el === chat) el.style.setProperty('max-height', 'none', 'important');
          }
        } catch (e) {
          void 0; // noop
        }
      }
    }
  } catch (e) {
    /* ignore */
  }
}

// 暴露给Layout.vue使用
(window as any).__dndManageHostScrollbars = manageHostScrollbars;

function adoptHostTypography() {
  try {
    const pdoc = (window.frameElement as any)?.ownerDocument as Document;
    if (!pdoc) return;
    const pick = (el: Element | null, names: string[]) => {
      const out: Record<string, string> = {};
      if (!el) return out;
      const cs = pdoc.defaultView!.getComputedStyle(el as HTMLElement);
      for (const n of names) out[n] = cs.getPropertyValue(n);
      return out;
    };
    const findInChat = (sel: string) =>
      (pdoc.querySelector(`#chat .mes .mes_text ${sel}`) || pdoc.querySelector(sel)) as Element | null;
    const pEl = findInChat('p');
    const emEl = findInChat('em');
    const qEl = findInChat('q');
    const base = ['color', 'font-family', 'font-size', 'font-style', 'font-weight', 'line-height'];
    const block = ['margin-top', 'margin-bottom'];
    // 同步宿主的基础排版；q 不使用引号，保持纯文本
    const p = pick(pEl, [...base, ...block]);
    const em = pick(emEl, base);
    const q = pick(qEl, base);
    const css = [
      pEl
        ? `p{color:${p['color']};font-family:${p['font-family']};font-size:${p['font-size']};font-style:${p['font-style']};font-weight:${p['font-weight']};line-height:${p['line-height']};margin-top:${p['margin-top']};margin-bottom:${p['margin-bottom']};}`
        : '',
      // em：保持斜体/字重/行高与颜色，但继承父级字号
      emEl
        ? `em{color:${em['color']};font-family:${em['font-family']};font-style:${em['font-style']};font-weight:${em['font-weight']};line-height:${em['line-height']};}`
        : '',
      qEl
        ? `q{color:${q['color']};font-family:${q['font-family']};font-size:${q['font-size']};font-style:${q['font-style']};font-weight:${q['font-weight']};line-height:${q['line-height']};}`
        : '',
      // 禁用 q 标签的自动引号
      `q::before{content:none !important}q::after{content:none !important}`,
    ]
      .filter(Boolean)
      .join('');
    let styleEl = document.getElementById('synced-host-typography') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'synced-host-typography';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    console.log('DnD typography synced:', css); // 调试用
  } catch (e) {
    console.error('Failed to sync typography:', e); // 调试用
  }
}

function tryMount() {
  const host = document.getElementById('app');
  if (!host) return false;
  const app = createApp(App);
  app.use(router);
  app.use(createPinia());
  app.mount(host);
  try {
    host.setAttribute('data-dnd-ui', 'ready');
    host.style.display = 'block';
    if (!host.style.minHeight) host.style.minHeight = '240px';
    // 管理宿主滚动条：允许宿主滚动
    manageHostScrollbars(false);
    // 采用宿主 q/p/em 的样式（优先执行，避免字体闪动）
    adoptHostTypography();
    // 固定 iframe 高度，避免进度条丢失（延迟执行，减少初始闪动）
    setTimeout(() => setIframeHeight(715), 16);
    // 首次进入且没有任何用户消息时，跳转到初始化页面
    try {
      const last = getLastMessageId();
      let hasUser = false;
      for (let i = last; i >= 0 && i >= last - 10; i--) {
        try {
          const m = (getChatMessages(i)[0] || ({} as any)) as any;
          if (m?.role === 'user') {
            hasUser = true;
            break;
          }
        } catch (e) {
          // ignore read errors
        }
      }
      if (!hasUser) router.replace('/init');
    } catch (e) {
      // ignore when SillyTavern APIs are unavailable
    }
  } catch (e) {
    // ignore
  }
  return true;
}

const start = () => {
  if (tryMount()) return;
  const obs = new MutationObserver(() => {
    if (tryMount()) {
      obs.disconnect();
    }
  });
  obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'loading') start();
  });
} else {
  start();
}
