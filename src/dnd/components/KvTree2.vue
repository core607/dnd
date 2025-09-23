<template>
  <div class="kv2" v-if="isRenderable">
    <template v-if="isArray(root)">
      <div class="arr">
        <div v-for="(item, idx) in root" :key="idx" class="row">
          <div class="k">[{{ idx }}]</div>
          <div class="v">
            <KvTree2 :data="item" />
          </div>
        </div>
      </div>
    </template>
    <template v-else-if="isObject(root)">
      <div class="obj">
        <div v-for="(val, key) in root" :key="String(key)" class="row">
          <div class="k">{{ key }}</div>
          <div class="v">
            <KvTree2 :data="val" />
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <span class="atom">{{ pretty(root) }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ data: any }>();
const root = computed(() => props.data);

function isObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function isArray(v: any) {
  return Array.isArray(v);
}
function pretty(v: any) {
  if (v == null) return '-';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
const isRenderable = computed(() => true);
</script>

<style scoped>
.kv2 {
  word-break: break-word;
  overflow-wrap: anywhere;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.kv2 .row {
  display: grid;
  grid-template-columns: minmax(80px, 35%) 1fr; /* key 稍微减少占比 */
  gap: 4px 8px; /* 减少间距避免挤压 */
  padding: 4px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
  align-items: flex-start;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
.kv2 .k {
  opacity: 0.9;
  min-width: 0;
  max-width: 100%;
  font-family: 'Crimson Text', 'Georgia', serif;
  font-weight: 600;
  color: #d4af37;
  word-break: break-word;
  overflow-wrap: anywhere;
  hyphens: auto;
}
.kv2 .v {
  min-width: 0;
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-family: 'Source Code Pro', 'Consolas', monospace;
  font-weight: 500;
  letter-spacing: 0.1px; /* 减少字符间距 */
  hyphens: auto;
}
@media (max-width: 500px) {
  .kv2 .row {
    grid-template-columns: 1fr; /* 窄屏改为上下堆叠 */
    gap: 2px;
    padding: 3px 0;
  }
  .kv2 .k {
    font-size: 13px;
    margin-bottom: 2px;
    padding-right: 0;
  }
  .kv2 .v {
    font-size: 12px;
    letter-spacing: 0;
    padding-left: 8px; /* 缩进显示层次 */
  }
}
.atom {
  opacity: 0.95;
  font-family: 'Source Code Pro', 'Consolas', monospace;
  font-weight: 500;
}
</style>
