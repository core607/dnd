import { defineStore } from 'pinia';

type UiState = {
  stream: boolean;
  showInfo: boolean;
  showSkill: boolean;
};

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    stream: false,
    showInfo: false,
    showSkill: false,
  }),
  actions: {
    startHostStreamSync() {
      try {
        const frame = window.frameElement as HTMLElement | null;
        const doc = frame?.ownerDocument || document;
        const store = this;
        const handler = (ev: Event) => {
          try {
            const target = ev.target as HTMLElement | null;
            if (!target) return;
            const isToggle = target.id === 'stream_toggle' || (target as any).closest?.('#stream_toggle');
            if (isToggle) {
              const el = (
                target.id === 'stream_toggle' ? target : doc.querySelector('#stream_toggle')
              ) as HTMLInputElement | null;
              if (el) store.stream = !!el.checked;
            }
          } catch (e) {
            // ignore
          }
        };
        // 以捕获阶段监听，能覆盖宿主内部的事件代理
        doc.addEventListener('change', handler, true);
        doc.addEventListener('input', handler, true);
        // 保存清理器到 window 以便 onBeforeUnmount 调用
        (window as any).__dnd_unbindStreamListener__ = () => {
          try {
            doc.removeEventListener('change', handler, true);
          } catch (e) {
            // ignore
          }
          try {
            doc.removeEventListener('input', handler, true);
          } catch (e) {
            // ignore
          }
        };
      } catch (e) {
        // ignore
      }
    },
    stopHostStreamSync() {
      try {
        const fn = (window as any).__dnd_unbindStreamListener__;
        if (typeof fn === 'function') fn();
      } catch (e) {
        // ignore
      }
      (window as any).__dnd_unbindStreamListener__ = undefined;
    },
    syncStreamFromHost() {
      try {
        const frame = window.frameElement as HTMLElement | null;
        const doc = frame?.ownerDocument || document;
        const el = doc.querySelector('#stream_toggle') as HTMLInputElement | null;
        if (el) this.stream = !!el.checked;
      } catch (e) {
        // ignore
      }
    },
    toggleStream() {
      this.stream = !this.stream;
      // 同步到宿主（可选）
      try {
        const frame = window.frameElement as HTMLElement | null;
        const doc = frame?.ownerDocument || document;
        const el = doc.querySelector('#stream_toggle') as HTMLInputElement | null;
        if (el && el.checked !== this.stream) {
          el.checked = this.stream;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (e) {
        // ignore
      }
    },
    openInfo() {
      this.showInfo = true;
    },
    closeInfo() {
      this.showInfo = false;
    },
    toggleInfo() {
      this.showInfo = !this.showInfo;
    },
    openSkill() {
      this.showSkill = true;
    },
    closeSkill() {
      this.showSkill = false;
    },
    toggleSkill() {
      this.showSkill = !this.showSkill;
    },
  },
});
