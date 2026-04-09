/**
 * MediaLab - 应用主入口
 * 负责导航路由和全局工具函数
 */

(function () {
  'use strict';

  // ===== 导航路由 =====
  const navItems = document.querySelectorAll('.nav-item');
  const toolPages = document.querySelectorAll('.tool-page');

  function switchTool(toolName) {
    navItems.forEach(item => item.classList.toggle('active', item.dataset.tool === toolName));
    toolPages.forEach(page => page.classList.toggle('active', page.id === `tool-${toolName}`));
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => switchTool(item.dataset.tool));
  });

  // ===== Toast 通知 =====
  window.MediaLab = {
    toast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.textContent = message;
      container.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    },

    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00:00.000';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.round((seconds % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }
  };
})();
