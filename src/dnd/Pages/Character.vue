<template>
  <div class="panel glass">
    <h2>人物</h2>
    <pre>{{ JSON.stringify(mainChar, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useChatStore } from '../stores/chat';
const chat = useChatStore();
const { mainChar } = storeToRefs(chat);
</script>

<style scoped>
.panel {
  padding: 16px;
}
</style>
