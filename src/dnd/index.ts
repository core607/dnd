// 使用 Vue 渲染同层 UI
// index 仅负责等待挂载，实际渲染在 boot.ts

import './boot';

const mount = () => {
  const root = document.getElementById('app');
  if (!root) return;
  // 渲染由 boot.ts 完成
};

// 确保在同层 iframe 内加载
if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'loading') mount();
  });
} else {
  mount();
}
