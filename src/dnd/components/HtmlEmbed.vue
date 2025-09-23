<template>
  <div ref="host" style="width: 100%; display: block">
    <iframe ref="frame" :sandbox="computedSandbox" :srcdoc="srcdoc" style="width: 100%; border: 0; display: block" />
  </div>
  <!-- 说明：不再直接给 iframe 设定固定高度，改为由外层容器承载高度，以满足“不该有 height 属性”的要求。-->
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
  html: string; // 完整 <!DOCTYPE html><html>...</html>
  allowSameOrigin?: boolean; // 是否允许 same-origin（如需加载相对资源）
  autoHeight?: boolean; // 是否自动根据子文档高度自适应
  minHeight?: string; // 最小高度
}>();

const frame = ref<HTMLIFrameElement | null>(null);

const computedSandbox = computed(() => {
  const base = ['allow-scripts'];
  if (props.allowSameOrigin) base.push('allow-same-origin');
  return base.join(' ');
});

function composeSrcdoc(original: string): string {
  // 注入自适应高度与基本样式的脚本；保持用户文档原样执行
  const resizeScript = `
<script>(function(){
  try{
    function post(){
      var h = Math.max(
        document.documentElement ? document.documentElement.scrollHeight : 0,
        document.body ? document.body.scrollHeight : 0,
        0
      );
      try{ parent.postMessage({ __dndHtmlEmbed: true, height: h }, '*'); }catch(e){}
    }
    var obs = new MutationObserver(function(){ post(); });
    obs.observe(document.documentElement || document.body, { subtree: true, childList: true, attributes: true });
    window.addEventListener('load', post);
    setTimeout(post, 0);
  }catch(e){}
})();<\/script>`;
  const baseStyle = `<style>html,body{margin:0;padding:0;box-sizing:border-box;}</style>`;
  let src = original || '';
  // 若无 </body>，尝试在 </html> 前插入；否则追加到末尾
  if (/<\/body>/i.test(src)) {
    src = src.replace(/<\/body>/i, `${baseStyle}${resizeScript}</body>`);
  } else if (/<\/html>/i.test(src)) {
    src = src.replace(/<\/html>/i, `${baseStyle}${resizeScript}</html>`);
  } else {
    src = `${src}${baseStyle}${resizeScript}`;
  }
  return src;
}

const srcdoc = computed(() => composeSrcdoc(props.html));

function onMessage(ev: MessageEvent) {
  const f = frame.value;
  if (!f || !props.autoHeight) return;
  try {
    if (!ev || !ev.data) return;
    // 仅处理来自该 iframe 的消息
    if ((f as any).contentWindow && ev.source !== (f as any).contentWindow) return;
    // 同时兼容我们注入的 __dndHtmlEmbed 与外部 HTML 的 resizeIframe
    const isEmbedMsg = ev.data.__dndHtmlEmbed === true || ev.data.type === 'resizeIframe';
    if (!isEmbedMsg) return;
    const h = Number(ev.data.height || 0);
    const min = props.minHeight ?? '0px';
    const minNum = parseInt(min, 10) || 0;
    const target = Math.max(h, minNum);
    f.style.height = `${target}px`;
  } catch {}
}

onMounted(() => {
  if (props.autoHeight !== false) {
    window.addEventListener('message', onMessage);
    // 不预设最小高度，等待子文档回传首帧高度，避免折叠状态出现空白
  }
});

onBeforeUnmount(() => {
  if (props.autoHeight !== false) window.removeEventListener('message', onMessage);
});

watch(
  () => props.html,
  () => {
    // 每次内容变化后重置高度，等待子页回传
    if (frame.value && props.minHeight) frame.value.style.height = props.minHeight;
  },
);
</script>

<style scoped>
:host {
  display: block;
  width: 100%;
}
</style>
