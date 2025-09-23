<template>
  <div class="panel glass">
    <h2>任务</h2>
    <pre>{{ JSON.stringify(tasks, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from '../stores/chat';
const chat = useChatStore();
const { mvu } = storeToRefs(chat);
const tasks = computed(() => mvu.value?.['任务'] ?? {});
</script>

<style scoped>
.panel {
  padding: 16px;
}
</style>
