<template>
  <div class="panel glass">
    <h2>背包</h2>
    <pre>{{ JSON.stringify(bag, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useChatStore } from '../stores/chat';
const chat = useChatStore();
const { mainChar } = storeToRefs(chat);
const bag = computed(() => mainChar.value?.['物品栏'] ?? {});
</script>

<style scoped>
.panel {
  padding: 16px;
}
</style>
