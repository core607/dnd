$(() => {
  let onlyZeroVisible = true; // 是否仅显示0楼

  async function ensureZeroLoaded() {
    try {
      if ($('.mes[mesid="0"]').length === 0) {
        await triggerSlash('/chat-jump 0');
        await triggerSlash('/chat-render 1');
      }
    } catch (e) {
      /* ignore */
    }
  }

  function hideAllButZero() {
    try {
      // 先按 mesid=0 精准选中；若不存在，则退化第一个 .mes（尽量避免空白）
      let $host = $('.mes[mesid="0"]').first();
      if ($host.length === 0) $host = $('.mes').first();
      const $all = $('.mes');
      $all.not($host).hide();
      $host.css('display', '');
    } catch (e) {
      /* ignore */
    }
  }

  function showAll() {
    try {
      $('.mes').css('display', '');
    } catch (e) {
      /* ignore */
    }
  }

  function applyMode() {
    if (onlyZeroVisible) hideAllButZero();
    else showAll();
  }

  // 将按钮加入“脚本按钮栏”，与示例一致
  replaceScriptButtons([
    { name: '仅显示0楼', visible: true },
    { name: '显示全部', visible: true },
  ]);

  // 按钮事件：切换显示模式
  eventOn(getButtonEvent('仅显示0楼'), () => {
    onlyZeroVisible = true;
    applyMode();
  });
  eventOn(getButtonEvent('显示全部'), () => {
    onlyZeroVisible = false;
    applyMode();
  });

  // 首次：若未渲染出0楼，先拉取0楼，再应用隐藏
  (async () => {
    await ensureZeroLoaded();
    applyMode();
  })();

  // 监听渲染/刷新事件
  eventOn(tavern_events.USER_MESSAGE_RENDERED, applyMode);
  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, applyMode);
  eventOn(tavern_events.MESSAGE_UPDATED, () => applyMode());
  eventOn(tavern_events.CHAT_CHANGED, async () => {
    await ensureZeroLoaded();
    applyMode();
  });
});

$(window).on('pagehide', () => {
  /* no-op */
});
