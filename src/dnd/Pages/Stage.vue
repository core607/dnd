<template>
  <div ref="wrap" class="stage-container">
    <!-- 信息条（左栏风格） -->
    <div class="hero-bar" v-if="id || attrs || hp">
      <div class="avatar" aria-hidden>🧙</div>
      <div class="hero-main">
        <div class="row line1">
          <span class="name">{{ id?.['姓名'] || '未命名' }}</span>
          <span class="sep">·</span>
          <span class="race">{{ id?.['种族'] || '-' }}</span>
          <span class="sep">·</span>
          <span class="lvl">Lv. {{ id?.['总等级'] ?? '-' }}</span>
        </div>
        <div class="row line2">
          <div class="hp">
            <span class="label">HP</span>
            <span class="val">{{ hp?.['当前生命值'] ?? '-' }}/{{ hp?.['最大生命值'] ?? '-' }}</span>
            <span class="temp" v-if="(hp?.['临时生命值'] ?? 0) > 0">(+{{ hp?.['临时生命值'] ?? 0 }})</span>
          </div>
          <div class="ac">
            <span class="label">AC</span>
            <span class="val">{{ ac ?? '-' }}</span>
          </div>
          <div class="xp">
            <span class="label">XP</span>
            <span class="val">{{ xp }}</span>
          </div>
          <div class="nxp" v-if="remainToNext !== null">
            <span class="label">距下一级</span>
            <span class="val">还需 {{ remainToNext }}</span>
          </div>
        </div>
        <div class="row line3">
          <div class="chips">
            <span class="chip" v-for="k in sixAttrs" :key="k">{{ k }}: {{ attrs?.[k] ?? '-' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 玩家发言 -->
    <div class="message-card player" v-if="true">
      <div class="card-header">
        <span class="speaker">⚔ 玩家</span>
        <div class="actions">
          <button class="edit-btn" v-if="!editingUser" @click="startEdit('user')">✎</button>
          <button class="delete-btn" v-if="!editingUser" @click="() => chat.deleteById(pairUserId || undefined)">
            🗑
          </button>
          <template v-if="editingUser">
            <button class="edit-btn" @click="saveEdit('user')">✔</button>
            <button class="delete-btn" @click="cancelEdit('user')">✖</button>
          </template>
        </div>
      </div>
      <div class="content" v-if="!editingUser" v-html="pairUserHtml"></div>
      <textarea v-else v-model="userDraft" class="edit-textarea" rows="6"></textarea>
    </div>

    <!-- 叙述者回应 -->
    <div class="message-card narrator" v-if="true">
      <div class="card-header">
        <span class="speaker">📜 叙述者</span>
        <div class="actions">
          <button class="edit-btn" v-if="!editingAssistant" @click="startEdit('assistant')">✎</button>
          <button
            class="delete-btn"
            v-if="!editingAssistant"
            @click="() => chat.deleteById(pairAssistantId || undefined)"
          >
            🗑
          </button>
          <template v-if="editingAssistant">
            <button class="edit-btn" @click="saveEdit('assistant')">✔</button>
            <button class="delete-btn" @click="cancelEdit('assistant')">✖</button>
          </template>
        </div>
      </div>
      <div class="content" v-if="!editingAssistant">
        <template v-for="seg in contentSegments" :key="seg.key">
          <div v-if="seg.kind === 'html'" v-html="seg.html"></div>
          <HtmlEmbed v-else :html="seg.html" :autoHeight="true" :allowSameOrigin="true" :key="seg.key" />
        </template>
      </div>
      <textarea v-else v-model="assistantDraft" class="edit-textarea" rows="10"></textarea>
    </div>

    <!-- 分页导航 -->
    <div class="nav-row">
      <button class="nav-btn" @click="chat.pagePrevPair">‹ 上一幕</button>
      <span class="chapter-info">#{{ pairUserId }} • #{{ pairAssistantId }}</span>
      <button class="nav-btn" @click="chat.pageNextPair">下一幕 ›</button>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <textarea v-model="input" class="text-input" rows="3" placeholder="输入你的行动..."></textarea>
      <div class="button-row">
        <button class="action-btn reroll" :disabled="chat.isGenerating" @click="() => chat.onReroll(stream)">
          🔄 重新生成
        </button>
        <button class="action-btn send" v-if="canLevelUp" :disabled="chat.isGenerating" @click="emitOpenLevelUp">
          ⬆️ 升级
        </button>
        <button
          v-if="!chat.isGenerating"
          class="action-btn send"
          :disabled="chat.isGenerating"
          @click="() => chat.onSend(stream)"
        >
          📤 发送
        </button>
        <button v-else class="action-btn stop" @click="chat.stopAll">🛑 停止</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useUiStore } from '../stores/ui';
import { useChatStore } from '../stores/chat';
import HtmlEmbed from '../components/HtmlEmbed.vue';

const ui = useUiStore();
const chat = useChatStore();
const { stream } = storeToRefs(ui);
const {
  pairUserId,
  pairAssistantId,
  pairUserHtml,
  pairAssistantHtml,
  pairUserRaw,
  pairAssistantRaw,
  input,
  mvu,
  mainChar,
} = storeToRefs(chat);

// 信息条数据
const sixAttrs = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];
const id = computed(
  () => ((mvu.value as any)?.['主角']?.['身份'] as any) || ((mainChar.value as any)?.['身份'] as any) || {},
);
const attrs = computed(
  () => ((mvu.value as any)?.['主角']?.['属性'] as any) || ((mainChar.value as any)?.['属性'] as any) || {},
);
const hp = computed(
  () =>
    ((mvu.value as any)?.['主角']?.['战斗']?.['生命值'] as any) ||
    ((mainChar.value as any)?.['战斗']?.['生命值'] as any) ||
    {},
);
const ac = computed(
  () =>
    ((mvu.value as any)?.['主角']?.['战斗']?.['护甲等级'] as any) ??
    ((mainChar.value as any)?.['战斗']?.['护甲等级'] as any),
);

// 升级阈值计算（与 Layout 中一致）
const LV_TABLE = [
  { xp: 0, prof: 2 },
  { xp: 300, prof: 2 },
  { xp: 900, prof: 2 },
  { xp: 2700, prof: 2 },
  { xp: 6500, prof: 3 },
  { xp: 14000, prof: 3 },
  { xp: 23000, prof: 3 },
  { xp: 34000, prof: 3 },
  { xp: 48000, prof: 4 },
  { xp: 64000, prof: 4 },
  { xp: 85000, prof: 4 },
  { xp: 100000, prof: 4 },
  { xp: 120000, prof: 5 },
  { xp: 140000, prof: 5 },
  { xp: 165000, prof: 5 },
  { xp: 195000, prof: 5 },
  { xp: 225000, prof: 6 },
  { xp: 265000, prof: 6 },
  { xp: 305000, prof: 6 },
  { xp: 355000, prof: 6 },
];
const nextThreshold = computed(() => {
  const lvl = Number(((mvu.value as any)?.['主角']?.['身份']?.['总等级'] as any) ?? 1);
  return LV_TABLE[Math.min(lvl, LV_TABLE.length - 1)]?.xp ?? Infinity;
});
const canLevelUp = computed(() => {
  const xp = Number(((mvu.value as any)?.['主角']?.['身份']?.['经验值'] as any) ?? 0);
  return xp >= Number(nextThreshold.value);
});

// 当前经验与距下一级所需
const xp = computed(() => Number(((mvu.value as any)?.['主角']?.['身份']?.['经验值'] as any) ?? 0));
const remainToNext = computed(() => {
  const target = Number(nextThreshold.value);
  if (!isFinite(target)) return null;
  return Math.max(0, target - xp.value);
});

const editingUser = ref(false);
const editingAssistant = ref(false);
const userDraft = ref('');
const assistantDraft = ref('');

function startEdit(which: 'user' | 'assistant') {
  if (which === 'user') {
    editingUser.value = true;
    userDraft.value = String(pairUserRaw.value || '');
  } else {
    editingAssistant.value = true;
    assistantDraft.value = String(pairAssistantRaw.value || '');
  }
}
async function saveEdit(which: 'user' | 'assistant') {
  try {
    if (which === 'user') {
      if (pairUserId.value == null) return;
      await chat.editById(pairUserId.value, userDraft.value);
    } else {
      if (pairAssistantId.value == null) return;
      await chat.editById(pairAssistantId.value, assistantDraft.value);
    }
  } finally {
    editingUser.value = false;
    editingAssistant.value = false;
  }
}
function cancelEdit(which: 'user' | 'assistant') {
  if (which === 'user') editingUser.value = false;
  else editingAssistant.value = false;
}

// 动态高度与滚动（将滚动统一到舞台容器）
const wrap = ref<HTMLElement | null>(null);
function layoutHeight() {
  const el = wrap.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight || 800;
  const bottomGap = 56; // 底部预留，避免贴底
  const h = Math.max(620, Math.floor(viewport - rect.top - bottomGap));
  el.style.height = h + 'px';
  el.style.overflow = 'auto';
}
function bindResize() {
  window.addEventListener('resize', layoutHeight);
  window.addEventListener('orientationchange', layoutHeight);
}
function unbindResize() {
  window.removeEventListener('resize', layoutHeight);
  window.removeEventListener('orientationchange', layoutHeight);
}
onMounted(() => {
  requestAnimationFrame(layoutHeight);
  bindResize();
});
watch(mainChar, () => setTimeout(layoutHeight, 0));
onBeforeUnmount(() => {
  unbindResize();
});

function emitOpenLevelUp() {
  try {
    const w: any = window;
    if (typeof w === 'object') w.dispatchEvent(new CustomEvent('dnd-open-levelup'));
  } catch {}
}

// 如果助手原文包含完整 HTML 文档，则用 HtmlEmbed 渲染
// 分段渲染：直接解析渲染后的 DOM，逐个识别 <pre><code> 中的完整 HTML 文档，保留原位置
type Segment = { kind: 'html' | 'embed'; html: string; key: string };
const contentSegments = computed<Segment[]>(() => {
  try {
    const rendered = String(pairAssistantHtml.value || '');
    const decode = (s: string) => {
      try {
        const ta = document.createElement('textarea');
        ta.innerHTML = s;
        return ta.value;
      } catch {
        return s;
      }
    };

    const doc = new DOMParser().parseFromString(rendered, 'text/html');
    const segs: Segment[] = [];
    let idx = 0;

    const processNode = (node: ChildNode) => {
      if (node.nodeType === 1) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'pre') {
          const code = el.querySelector('code');
          const text = code ? code.textContent || '' : '';
          const decoded = decode(text);
          if (/(<!DOCTYPE\s+html|<html[\s\S]*?>)/i.test(decoded)) {
            segs.push({ kind: 'embed', html: decoded, key: String(idx++) + ':embed' });
            return;
          }
        }
        segs.push({ kind: 'html', html: el.outerHTML, key: String(idx++) + ':html' });
      } else if (node.nodeType === 3) {
        const t = (node.textContent || '').trim();
        if (t) segs.push({ kind: 'html', html: (node as any).textContent, key: String(idx++) + ':text' });
      }
    };

    Array.from(doc.body.childNodes).forEach(processNode);
    if (segs.length === 0) segs.push({ kind: 'html', html: rendered, key: 'fallback:html' });
    return segs;
  } catch {
    return [{ kind: 'html', html: String(pairAssistantHtml.value || ''), key: 'fallback:html' }];
  }
});

// 将正文中的 HTML 代码块剥离，只保留非 HTML 的部分用于正常展示
const assistantHtmlStripped = computed(() => {
  try {
    const html = String(pairAssistantHtml.value || '');
    // 简单策略：去掉首个 <pre><code>…</code></pre>
    // 确保其余 Markdown 渲染不受影响
    return html.replace(/<pre\b[\s\S]*?<code\b[\s\S]*?>[\s\S]*?<\/code>[\s\S]*?<\/pre>/i, '').trim();
  } catch {
    return String(pairAssistantHtml.value || '');
  }
});
</script>

<style scoped>
.stage-container {
  padding: 20px;
  max-width: 1000px;
  overflow: auto;
  /* 高度由脚本自适应 */
  margin: 0; /* 避免在交互后出现左右 auto 导致视觉“变窄” */
  width: 100%;
  background: var(--stage-bg);
  border-radius: 12px;
  border: 2px solid var(--stage-border);
  -webkit-overflow-scrolling: touch;
  height: 100%;
  box-sizing: border-box;
  position: relative;
  box-shadow:
    0 0 0 1px rgba(212, 175, 55, 0.2),
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  /* 避免因高度/尺寸变化产生“慢慢缩回”动画 */
  transition:
    color 0.3s ease,
    background 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

/* 信息条 */
.hero-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--hero-bg);
  border: 1px solid var(--hero-border);
  border-radius: 8px;
  font-family: 'Source Code Pro', 'Consolas', monospace;
  font-weight: 500;
  letter-spacing: 0.2px;
  transition: all 0.3s ease;
}
.hero-bar:hover {
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
  border-color: rgba(139, 69, 19, 0.6);
}
.avatar {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 20px;
}
.hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hero-main .row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.name {
  font-weight: 700;
  font-size: 16px;
  color: #ffd700;
}
.sep {
  opacity: 0.5;
}
.hp .label,
.ac .label {
  opacity: 0.8;
  margin-right: 4px;
}
.hp .temp {
  margin-left: 6px;
  color: #93c5fd;
}
.chips {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.message-card {
  margin-bottom: 16px;
  padding: 18px;
  border-radius: 12px;
  border: 2px solid rgba(139, 69, 19, 0.4);
  word-break: break-word;
  position: relative;
  transition: all 0.3s ease;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.message-card::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 8px;
  pointer-events: none;
}
.message-card.player {
  background: linear-gradient(135deg, rgba(45, 24, 16, 0.7) 0%, rgba(26, 22, 18, 0.8) 100%);
  border-left: 4px solid #d4af37;
}
.message-card.narrator {
  background: linear-gradient(135deg, rgba(139, 69, 19, 0.3) 0%, rgba(45, 24, 16, 0.6) 100%);
  border-left: 4px solid #8b4513;
}
/* 夜间模式：玩家消息卡片（冷色系） */
:global(.dnd-layout.dark-mode .stage-container .message-card.player) {
  background: linear-gradient(135deg, rgba(33, 38, 46, 0.7) 0%, rgba(22, 27, 34, 0.8) 100%) !important;
  border-left-color: #58a6ff !important;
  border-color: rgba(48, 54, 61, 0.4) !important;
  box-shadow: none !important;
}
/* 夜间模式：叙述者消息卡片（警示红） */
:global(.dnd-layout.dark-mode .stage-container .message-card.narrator) {
  background: linear-gradient(135deg, rgba(48, 54, 61, 0.3) 0%, rgba(33, 38, 46, 0.6) 100%) !important;
  border-left-color: #f85149 !important;
  border-color: rgba(48, 54, 61, 0.4) !important;
  box-shadow: none !important;
}

/* 夜间模式：消息卡片边框 */
:global(.dnd-layout.dark-mode .stage-container .message-card::before) {
  border-color: rgba(48, 54, 61, 0.2) !important;
}

/* 夜间模式：输入区域 */
:global(.dnd-layout.dark-mode) .input-area {
  background: linear-gradient(135deg, rgba(33, 38, 46, 0.8) 0%, rgba(22, 27, 34, 0.9) 100%);
  border-color: rgba(48, 54, 61, 0.4);
  box-shadow:
    0 0 0 1px rgba(88, 166, 255, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}
:global(.dnd-layout.dark-mode) .input-area::before {
  border-color: rgba(88, 166, 255, 0.1);
}
:global(.dnd-layout.dark-mode) .text-input {
  background: linear-gradient(135deg, rgba(22, 27, 34, 0.9) 0%, rgba(33, 38, 46, 0.8) 100%);
  border-color: rgba(48, 54, 61, 0.3);
  color: #c9d1d9;
}
:global(.dnd-layout.dark-mode) .text-input:focus {
  border-color: rgba(88, 166, 255, 0.6);
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(88, 166, 255, 0.2);
}
:global(.dnd-layout.dark-mode) .text-input::placeholder {
  color: rgba(201, 209, 217, 0.5);
}

/* 夜间模式：英雄栏 */
:global(.dnd-layout.dark-mode) .hero-bar {
  background: linear-gradient(135deg, #21262d 0%, #161b22 100%);
  border-color: rgba(48, 54, 61, 0.4);
}
:global(.dnd-layout.dark-mode) .hero-bar:hover {
  box-shadow: 0 2px 8px rgba(88, 166, 255, 0.2);
  border-color: rgba(48, 54, 61, 0.6);
}

/* 夜间模式：按钮 */
:global(.dnd-layout.dark-mode) .action-btn.reroll {
  background: linear-gradient(145deg, #30363d 0%, #21262d 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.8);
}
:global(.dnd-layout.dark-mode) .action-btn.send {
  background: linear-gradient(145deg, #238636 0%, #1a7f37 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.8);
}
:global(.dnd-layout.dark-mode) .action-btn.stop {
  background: linear-gradient(145deg, #da3633 0%, #b91c1c 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.8);
}

/* 夜间模式：正文内容 */
:global(.dnd-layout.dark-mode) .content {
  color: #c9d1d9;
}
:global(.dnd-layout.dark-mode) .content h1,
:global(.dnd-layout.dark-mode) .content h2,
:global(.dnd-layout.dark-mode) .content h3,
:global(.dnd-layout.dark-mode) .content h4,
:global(.dnd-layout.dark-mode) .content h5,
:global(.dnd-layout.dark-mode) .content h6 {
  color: #58a6ff;
}
:global(.dnd-layout.dark-mode) .content strong {
  color: #f0f6fc;
}
:global(.dnd-layout.dark-mode) .content em {
  color: #79c0ff;
}
:global(.dnd-layout.dark-mode) .content code {
  background: rgba(110, 118, 129, 0.1);
  color: #79c0ff;
  border: 1px solid rgba(48, 54, 61, 0.3);
}
:global(.dnd-layout.dark-mode) .content pre {
  background: rgba(110, 118, 129, 0.1);
  border: 1px solid rgba(48, 54, 61, 0.3);
}
:global(.dnd-layout.dark-mode) .content blockquote {
  border-left: 4px solid #30363d;
  background: rgba(110, 118, 129, 0.05);
  color: #8b949e;
}
:global(.dnd-layout.dark-mode) .content a {
  color: #58a6ff;
}
:global(.dnd-layout.dark-mode) .content a:hover {
  color: #79c0ff;
}

/* 夜间模式：英雄栏强覆盖，确保在 scoped 下生效 */
:global(.dnd-layout.dark-mode) :deep(.hero-bar) {
  background: linear-gradient(135deg, #21262d 0%, #161b22 100%) !important;
  border-color: rgba(48, 54, 61, 0.4) !important;
}
:global(.dnd-layout.dark-mode) :deep(.hero-bar:hover) {
  box-shadow: 0 2px 8px rgba(88, 166, 255, 0.2) !important;
  border-color: rgba(48, 54, 61, 0.6) !important;
}
/* 再加一层包含 .stage-container 的更高优先级规则，避免任何后续规则覆盖 */
:global(.dnd-layout.dark-mode) :deep(.stage-container .hero-bar) {
  background: linear-gradient(135deg, #21262d 0%, #161b22 100%) !important;
  border-color: rgba(48, 54, 61, 0.6) !important;
}

/* 夜间模式：编辑区域 */
:global(.dnd-layout.dark-mode) .edit-textarea {
  background: linear-gradient(135deg, rgba(22, 27, 34, 0.9) 0%, rgba(33, 38, 46, 0.8) 100%);
  border-color: rgba(48, 54, 61, 0.3);
  color: #c9d1d9;
}
:global(.dnd-layout.dark-mode) .edit-textarea:focus {
  border-color: rgba(88, 166, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2);
}

/* 夜间模式：编辑按钮 */
:global(.dnd-layout.dark-mode) .edit-btn {
  background: linear-gradient(145deg, #238636 0%, #1a7f37 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.3);
}
:global(.dnd-layout.dark-mode) .delete-btn {
  background: linear-gradient(145deg, #da3633 0%, #b91c1c 100%);
  color: #c9d1d9;
  border-color: rgba(48, 54, 61, 0.3);
}

/* 夜间模式：说话者标签 */
:global(.dnd-layout.dark-mode) .speaker {
  color: #58a6ff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.speaker {
  font-weight: 600;
  font-size: 16px;
  color: #ffd700;
}
.actions {
  display: flex;
  gap: 8px;
}
.edit-btn,
.delete-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #5a5a5a;
  background: #4a4a4c;
  color: #e8e2d4;
  border-radius: 4px;
  cursor: pointer;
}
.edit-btn:hover,
.delete-btn:hover {
  background: #5a5a5c;
}

/* 移除正文内容的强制文字样式以继承酒馆 q/p/em 设定 */
/* .content: 不再设置颜色与行高 */

.edit-textarea {
  width: 100%;
  resize: vertical;
  min-height: 140px;
  background: #0f1216;
  color: #e8e2d4;
  border: 1px solid #3a3a3c;
  border-radius: 6px;
  padding: 8px;
}

.nav-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 0;
  padding: 0;
}
.nav-btn {
  padding: 8px 16px;
  background: #2a2a2f;
  border: 1px solid #47474a;
  color: #e8e2d4;
  border-radius: 6px;
  cursor: pointer;
}
.nav-btn:hover {
  background: #333338;
}
.chapter-info {
  color: #ffd700;
  font-weight: 500;
}

/* 输入区域 */
.input-area {
  margin-top: 16px;
  padding: 20px;
  background: var(--input-area-bg);
  border: 2px solid var(--input-area-border);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(212, 175, 55, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  position: relative;
}
.input-area::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 8px;
  pointer-events: none;
}
.text-input {
  width: 100%;
  padding: 14px;
  background: var(--text-input-bg, linear-gradient(135deg, rgba(15, 18, 22, 0.9) 0%, rgba(26, 22, 18, 0.8) 100%));
  border: 2px solid var(--text-input-border, rgba(139, 69, 19, 0.3));
  border-radius: 8px;
  color: var(--text-input-color, #e8dcc0);
  font-family: 'Libre Baskerville', 'Times New Roman', serif;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.2),
    0 0 0 0 rgba(212, 175, 55, 0);
}
.text-input:focus {
  outline: none;
  border-color: var(--text-input-border-focus, rgba(212, 175, 55, 0.6));
  box-shadow:
    inset 0 1px 3px rgba(0, 0, 0, 0.2),
    0 0 0 3px var(--text-input-outline, rgba(212, 175, 55, 0.2));
}
.text-input::placeholder {
  color: var(--text-input-placeholder, rgba(232, 220, 192, 0.5));
  font-style: italic;
}
.button-row {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.action-btn {
  padding: 12px 18px;
  border: 2px solid rgba(139, 69, 19, 0.6);
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Cinzel', 'Times New Roman', serif;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.5px;
  transition: all 0.25s ease;
  position: relative;

  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 3px 6px rgba(0, 0, 0, 0.3),
    0 1px 0 rgba(0, 0, 0, 0.2);
}
.action-btn.reroll {
  background: linear-gradient(145deg, #8b4513 0%, #2d1810 100%);
  color: #e8dcc0;
  border-color: rgba(139, 69, 19, 0.8);
}
.action-btn.send {
  background: linear-gradient(145deg, #2d4a22 0%, #1e3317 100%);
  color: #d4af37;
  border-color: rgba(139, 69, 19, 0.8);
}
.action-btn.stop {
  background: linear-gradient(145deg, #7a2d2d 0%, #4a1a1a 100%);
  color: #e8dcc0;
  border-color: rgba(139, 69, 19, 0.8);
}
.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 5px 12px rgba(0, 0, 0, 0.4),
    0 0 15px rgba(212, 175, 55, 0.2);
}
.action-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2);
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* 统一滚动条样式（舞台容器） */
.stage-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.stage-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 8px;
}
.stage-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
}
.stage-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.22) rgba(255, 255, 255, 0.06);
}

@media (max-width: 600px) {
  .stage-container {
    padding: 12px;
  }
  .hero-bar {
    padding: 10px;
  }
  .edit-btn,
  .delete-btn {
    width: 36px;
    height: 36px;
  }
  .text-input {
    font-size: 16px; /* 提升移动端可读性 */
    min-height: 120px;
  }
  .button-row {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .action-btn {
    padding: 12px 16px; /* 提升触控高度 */
    font-size: 16px;
    flex: 1 1 48%;
  }
}
</style>
