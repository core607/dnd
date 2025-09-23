<template>
  <div class="panel glass">
    <h2>系统</h2>
    <div>流式生成：<input type="checkbox" :checked="stream" @change="ui.toggleStream()" /></div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUiStore } from '../stores/ui';
const ui = useUiStore();
const { stream } = storeToRefs(ui);
</script>

<style scoped>
.panel {
  padding: 16px;
}
</style>
