<template>
  <div class="kv-tree">
    <template v-if="isObj(data)">
      <div v-for="(val, key) in data" :key="String(key)" class="node">
        <template v-if="isLeaf(val)">
          <div class="row">
            <span class="k">{{ key }}</span>
            <span class="v">{{ leaf(val) }}</span>
          </div>
        </template>
        <template v-else>
          <details class="branch" open>
            <summary class="title">
              {{ key }}
              <span class="meta">{{ brief(val) }}</span>
            </summary>
            <KvTree :data="val" />
          </details>
        </template>
      </div>
    </template>

    <template v-else-if="Array.isArray(data)">
      <template v-for="(item, idx) in data" :key="idx">
        <div v-if="isLeaf(item)" class="row">
          <span class="k">#{{ idx + 1 }}</span>
          <span class="v">{{ leaf(item) }}</span>
        </div>
        <details v-else class="branch" open>
          <summary class="title">
            #{{ idx + 1 }} <span class="meta">{{ brief(item) }}</span>
          </summary>
          <KvTree :data="item" />
        </details>
      </template>
    </template>

    <template v-else>
      <span class="v">{{ leaf(data) }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{ data: any }>();

function isObj(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function isLeaf(v: any) {
  return v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}
function brief(v: any): string {
  try {
    if (Array.isArray(v)) return `[${v.length}]`;
    if (v && typeof v === 'object') return `{${Object.keys(v).length}}`;
  } catch {}
  return '';
}
function leaf(v: any) {
  if (v == null) return '-';
  try {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return `[${v.length}]`;
    if (typeof v === 'object') return '{...}';
    return String(v);
  } catch {
    return String(v);
  }
}
</script>

<style scoped>
.kv-tree {
  display: block;
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
}
.k {
  opacity: 0.85;
  margin-right: 10px;
}
.v {
  font-weight: 600;
  word-break: break-word;
  white-space: pre-wrap;
}
.branch {
  margin: 6px 0 8px;
}
.title {
  margin: 8px 0 6px;
  font-size: 14px;
  color: #ffd700;
  cursor: pointer;
}
.meta {
  opacity: 0.6;
  font-size: 12px;
  margin-left: 6px;
}
/* 全屏时更紧凑的显示密度 */
:global(.dnd-layout.fs) .kv-tree .row {
  padding: 8px 0;
}
</style>
