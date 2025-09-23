import { defineStore } from 'pinia';
import { computed, ref, type Ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const pairUserId = ref<number | null>(null);
  const pairAssistantId = ref<number | null>(null);
  const pairUserHtml = ref('');
  const pairAssistantHtml = ref('');
  const pairUserRaw = ref('');
  const pairAssistantRaw = ref('');
  const input = ref('');
  const isRerolling = ref(false);
  const isGenerating = ref(false);
  const mvu = ref<any>(null);
  const mainChar = computed(() => mvu.value?.['主角'] ?? null);
  const assistantDraftId = ref<number | null>(null);

  async function refreshMvuPreferMessage(messageId?: number | null) {
    // 优先读取消息级变量，读取不到或无 stat_data 时，回退到聊天级变量
    let next: any = null;
    try {
      if (Number.isFinite(messageId as number)) {
        const varsMsg = getVariables({ type: 'message', message_id: messageId as number }) as any;
        if (varsMsg && varsMsg.stat_data) next = varsMsg.stat_data;
      }
    } catch {
      // ignore
    }
    if (!next) {
      try {
        const varsChat = getVariables({ type: 'chat' }) as any;
        if (varsChat && varsChat.stat_data) next = varsChat.stat_data;
      } catch {
        // ignore
      }
    }
    mvu.value = next;
  }

  function lastUserId(): number | null {
    try {
      const last = getLastMessageId();
      for (let i = last; i >= 0; i--) {
        const m = (getChatMessages(i)[0] || ({} as any)) as any;
        if (m?.role === 'user') return i;
      }
    } catch {
      // ignore, fallback to null
    }
    return null;
  }

  async function renderPairByUserId(uid: number | null) {
    pairUserId.value = uid;
    let aid: number | null = null;
    pairUserHtml.value = '';
    pairAssistantHtml.value = '';
    pairUserRaw.value = '';
    pairAssistantRaw.value = '';
    if (uid == null) return;
    let um: any = null;
    try {
      um = (getChatMessages(uid)[0] || ({} as any)) as any;
    } catch {
      // 当前 uid 不存在，回退到最近可用的用户楼层
      const fb = lastUserId();
      if (fb != null && fb !== uid) {
        await renderPairByUserId(fb);
        return;
      }
      return;
    }
    if (um) {
      pairUserRaw.value = String(um.message || '');
      try {
        pairUserHtml.value = await formatAsDisplayedMessage(String(um.message || ''));
      } catch {
        pairUserHtml.value = String(um.message || '');
      }
    }
    try {
      const am = (getChatMessages(uid + 1)[0] || ({} as any)) as any;
      if (am && am.role === 'assistant') {
        aid = uid + 1;
        pairAssistantRaw.value = String(am.message || '');
        try {
          pairAssistantHtml.value = await formatAsDisplayedMessage(String(am.message || ''));
        } catch {
          pairAssistantHtml.value = String(am.message || '');
        }
      }
    } catch {
      // 无助手层也无妨
    }
    pairAssistantId.value = aid;

    await refreshMvuPreferMessage((aid ?? uid) as number);
  }

  function pagePrevPair() {
    if (pairUserId.value == null) return;
    for (let i = (pairUserId.value as number) - 1; i >= 0; i--) {
      try {
        const m = (getChatMessages(i)[0] || ({} as any)) as any;
        if (m?.role === 'user') {
          renderPairByUserId(i);
          return;
        }
      } catch {
        // 跳过不存在的 message_id
        continue;
      }
    }
  }

  function pageNextPair() {
    try {
      const last = getLastMessageId();
      const start = ((pairUserId.value ?? -1) as number) + 1;
      for (let i = start; i <= last; i++) {
        try {
          const m = (getChatMessages(i)[0] || ({} as any)) as any;
          if (m?.role === 'user') {
            renderPairByUserId(i);
            return;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // ignore, out of range
    }
  }

  async function deleteById(id?: number) {
    const target = typeof id === 'number' ? id : undefined;
    if (!Number.isFinite(target as number)) return;
    await deleteChatMessages([target as number], { refresh: 'none' });
    const uid = pairUserId.value;
    if (uid === target) pagePrevPair();
    else renderPairByUserId(uid);
  }

  async function editById(id?: number, newContent?: string) {
    const target = typeof id === 'number' ? id : undefined;
    if (!Number.isFinite(target as number)) return;
    const prev = ((getChatMessages(target as number)[0] || ({} as any)) as any)?.message || '';
    const next = newContent !== undefined ? String(newContent) : window.prompt('编辑内容', String(prev));
    if (next == null) return;
    await setChatMessages([{ message_id: target as number, message: String(next) }], { refresh: 'affected' });
    // 立即更新本地 UI，避免等待重新渲染期间的闪烁
    try {
      if (target === pairUserId.value) {
        pairUserRaw.value = String(next);
        try {
          pairUserHtml.value = await formatAsDisplayedMessage(String(next));
        } catch {
          pairUserHtml.value = String(next);
        }
      }
      if (target === pairAssistantId.value) {
        pairAssistantRaw.value = String(next);
        try {
          pairAssistantHtml.value = await formatAsDisplayedMessage(String(next));
        } catch {
          pairAssistantHtml.value = String(next);
        }
      }
    } catch {
      // ignore formatting errors
    }
    await new Promise(r => setTimeout(r, 120));
    renderPairByUserId(pairUserId.value);
  }

  async function onReroll(stream: boolean) {
    if (pairUserId.value == null) return;
    const userMsg = (getChatMessages(pairUserId.value)[0] || ({} as any)) as any;
    if (userMsg?.role !== 'user') return;
    // 若最新层是助手楼层：先删除该层，再创建新的助手楼层，保持与“重新发送”一致
    try {
      const next = (getChatMessages(getLastMessageId())[0] || ({} as any)) as any;
      console.log('next', next);
      if (next?.role === 'assistant') {
        console.log('getLastMessageId()', getLastMessageId());
        await deleteChatMessages([getLastMessageId()], { refresh: 'none' });
      }
    } catch {
      // ignore read/delete errors
    }
    await createChatMessages([{ role: 'assistant', message: '' }], { refresh: 'affected' });
    try {
      const newAssistantId = getLastMessageId();
      assistantDraftId.value = newAssistantId;
      pairAssistantId.value = newAssistantId;
      pairAssistantHtml.value = '';
      // 复制 MVU 变量：将“最新层的前一层”的 MVU 覆盖到“最新层”
      try {
        const prevId = Number(newAssistantId) - 1;
        if (Number.isFinite(prevId) && prevId >= 0) {
          const prevMvu = Mvu.getMvuData({ type: 'message', message_id: prevId }) || {};
          await Mvu.replaceMvuData(prevMvu, { type: 'message', message_id: newAssistantId });
        }
      } catch {
        // 忽略 MVU 读取/覆盖错误，不影响继续生成
      }
    } catch {
      // ignore id fetch errors
    }
    isRerolling.value = true;
    isGenerating.value = true;
    try {
      await generate({
        user_input: String(userMsg.message || ''),
        should_stream: stream,
      });
    } finally {
      // 即使异常或被外部中止，也要复原按钮状态
      isGenerating.value = false;
      // isRerolling 在 ended() 中也会复位，这里兜底
      // 不在此处写入消息，保持 ended 里的主路径
    }
  }

  async function onSend(stream: boolean) {
    const text = String(input.value || '').trim();
    if (!text) return;
    await createChatMessages([{ role: 'user', message: text }], { refresh: 'affected' });
    // 获取用户消息楼层 ID
    let createdUserId: number | null = null;
    try {
      createdUserId = getLastMessageId();
      pairUserId.value = createdUserId;
    } catch (e) {
      // ignore
    }
    // 预创建一条空的助手消息，并记录其楼层 ID，便于流式过程中更新
    await createChatMessages([{ role: 'assistant', message: '' }], { refresh: 'affected' });
    input.value = '';
    // 记录刚创建的助手楼层 ID，并清空 HTML 以等待流式填充
    try {
      const newAssistantId = getLastMessageId();
      assistantDraftId.value = newAssistantId;
      pairAssistantId.value = newAssistantId;
      pairAssistantHtml.value = '';
    } catch {
      // ignore
    }
    pairUserRaw.value = text;
    try {
      pairUserHtml.value = await formatAsDisplayedMessage(text);
    } catch {
      pairUserHtml.value = text;
    }
    if (stream) pairAssistantHtml.value = '';
    isGenerating.value = true;
    try {
      await generate({ user_input: text, should_stream: stream });
    } finally {
      // 兜底恢复，避免异常中断后停在“停止”按钮
      isGenerating.value = false;
    }
  }

  function init(streamRef: Ref<boolean>) {
    const renderToken = async (full: string) => {
      if (!streamRef.value) return;
      try {
        pairAssistantHtml.value = await formatAsDisplayedMessage(full || '');
      } catch {
        pairAssistantHtml.value = full || '';
      }
    };
    const ended = async (text: string) => {
      const finalText = String(text || '');
      try {
        pairAssistantHtml.value = await formatAsDisplayedMessage(finalText);
      } catch {
        pairAssistantHtml.value = finalText;
      }
      try {
        if (isRerolling.value) {
          // 放弃 triggerSlash，统一改为覆盖助手楼层
          if (assistantDraftId.value != null) {
            await setChatMessages([{ message_id: assistantDraftId.value as number, message: finalText }], {
              refresh: 'affected',
            });
          } else {
            await createChatMessages([{ role: 'assistant', message: finalText }], { refresh: 'affected' });
          }
        } else if (assistantDraftId.value != null) {
          await setChatMessages([{ message_id: assistantDraftId.value as number, message: finalText }], {
            refresh: 'affected',
          });
        } else {
          await createChatMessages([{ role: 'assistant', message: finalText }], { refresh: 'affected' });
        }
        if (parent && typeof (parent as any).handleVariablesInMessage === 'function')
          await (parent as any).handleVariablesInMessage(getLastMessageId());
      } catch {
        // ignore MVU trigger errors
      }
      isRerolling.value = false;
      isGenerating.value = false;
      assistantDraftId.value = null;
      // 仅增量更新，不做全量重渲染，避免移动端全屏被打断
      const uid = lastUserId();
      await refreshMvuPreferMessage(getLastMessageId());
      if (uid != null) {
        pairUserId.value = uid;
        const am = (getChatMessages(uid + 1)[0] || ({} as any)) as any;
        pairAssistantId.value = am?.role === 'assistant' ? uid + 1 : null;
      }
    };
    const canBind = typeof (globalThis as any).eventOn === 'function';
    if (canBind) {
      eventOn(iframe_events.GENERATION_STARTED, () => {
        isGenerating.value = true;
      });
      eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, renderToken);
      eventOn(iframe_events.GENERATION_ENDED, ended);
      // 兜底：宿主侧显式广播“停止”或“结束”时，确保按钮状态复原
      eventOn(tavern_events.GENERATION_STOPPED, () => {
        isGenerating.value = false;
        isRerolling.value = false;
      });
      eventOn(tavern_events.GENERATION_ENDED, () => {
        isGenerating.value = false;
        isRerolling.value = false;
      });
    }
    (async () => {
      await refreshMvuPreferMessage(lastUserId());
      renderPairByUserId(lastUserId());
    })();
  }

  async function stopAll() {
    try {
      await stopAllGeneration();
    } catch (e) {
      // ignore stop errors
    }
    isGenerating.value = false;
    isRerolling.value = false;
  }

  return {
    // state
    pairUserId,
    pairAssistantId,
    pairUserHtml,
    pairAssistantHtml,
    pairUserRaw,
    pairAssistantRaw,
    input,
    isRerolling,
    isGenerating,
    mvu,
    mainChar,
    // actions
    lastUserId,
    renderPairByUserId,
    pagePrevPair,
    pageNextPair,
    deleteById,
    editById,
    onReroll,
    onSend,
    stopAll,
    init,
    refreshMvuPreferMessage,
  };
});
