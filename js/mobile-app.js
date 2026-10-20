/**
 * MediaLab - 移动端应用
 * 手机 / 触屏小屏设备上的独立界面：首页是按分类排列的工具卡片，
 * 工具以全屏页打开，页面状态记录在 location.hash 里，配合系统返回手势使用。
 * 工具模块的契约不变：往 #content 挂 .tool-page，导出 init / destroy。
 */

(function () {
  'use strict';

  if (!document.documentElement.classList.contains('ml-mobile')) return;

  const TOOL_HASH_PREFIX = '#/tool/';

  function hexToRgba(hex, alpha) {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!match) return `rgba(108, 123, 240, ${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  class MobileApp {
    constructor() {
      this.config = null;
      this.tools = [];
      this.currentToolId = null;
      this.els = {};
      // 从首页点进工具页时有历史记录可退；直接深链接打开时没有，返回要改写当前记录
      this.openedFromHome = false;
    }

    async init() {
      this.buildShell();

      try {
        this.config = await MediaLab.ModuleLoader.loadConfig();
      } catch (error) {
        this.els.home.innerHTML = '<div class="m-error">配置加载失败，请刷新重试</div>';
        return;
      }

      this.tools = MediaLab.ModuleLoader.getFlatMenuItems();
      this.renderHome();
      this.els.version.textContent = `v${this.config.version}`;

      window.addEventListener('hashchange', () => this.handleRoute());
      this.handleRoute();

      console.log('[MediaLab] 移动端初始化完成');
    }

    buildShell() {
      const content = document.getElementById('content');
      const shell = document.createElement('div');
      shell.id = 'm-shell';
      shell.innerHTML = `
        <header class="m-header">
          <div class="m-logo">ML</div>
          <div class="m-brand">
            <h1>MediaLab</h1>
            <p>媒体工具集 · 所有处理都在本机完成</p>
          </div>
        </header>
        <main class="m-home" id="m-home"></main>
        <div class="m-tool-view" id="m-tool-view" aria-hidden="true">
          <header class="m-tool-header">
            <button type="button" class="m-back" id="m-back" aria-label="返回">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <h2 class="m-tool-title" id="m-tool-title"></h2>
          </header>
        </div>
      `;
      document.body.appendChild(shell);

      const toolView = shell.querySelector('#m-tool-view');
      toolView.appendChild(content);

      this.els = {
        home: shell.querySelector('#m-home'),
        toolView,
        toolTitle: shell.querySelector('#m-tool-title'),
        content,
        version: null
      };

      shell.querySelector('#m-back').addEventListener('click', () => this.closeTool());
    }

    // ===== 首页 =====

    renderHome() {
      const home = this.els.home;
      home.innerHTML = '';

      MediaLab.ModuleLoader.getMenuTree().forEach(category => {
        if (category.children && category.children.length > 0) {
          home.appendChild(this.createGroup(category));
        }
      });

      const footer = document.createElement('footer');
      footer.className = 'm-footer';
      footer.innerHTML = `
        <span id="m-version"></span>
        <a href="?ui=desktop">切换到桌面版</a>
      `;
      home.appendChild(footer);
      this.els.version = footer.querySelector('#m-version');
    }

    createGroup(category) {
      const section = document.createElement('section');
      section.className = 'm-group';

      const accent = category.color || '#6c7bf0';
      section.style.setProperty('--group-accent', accent);
      section.style.setProperty('--group-accent-bg', hexToRgba(accent, 0.14));

      const total = category.children.length;
      const enabled = category.children.filter(tool => !tool.disabled).length;

      section.innerHTML = `
        <div class="m-group-title">
          <span class="m-group-icon">${MediaLab.ModuleLoader.getIcon(category.icon)}</span>
          <span>${category.label}</span>
          <span class="m-group-count">${enabled < total ? `${enabled}/${total} 可用` : `${total} 个工具`}</span>
        </div>
        <div class="m-grid"></div>
      `;

      const grid = section.querySelector('.m-grid');
      category.children.forEach(tool => grid.appendChild(this.createCard(tool)));

      return section;
    }

    createCard(tool) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'm-card' + (tool.disabled ? ' is-disabled' : '');
      card.dataset.toolId = tool.id;

      card.innerHTML = `
        <span class="m-card-icon">${MediaLab.ModuleLoader.getIcon(tool.icon)}</span>
        <span class="m-card-label">${tool.label}</span>
        <span class="m-card-desc">${tool.description || ''}</span>
        ${tool.disabled
          ? '<span class="m-card-badge">开发中</span>'
          : '<span class="m-card-arrow" aria-hidden="true">›</span>'}
      `;

      card.addEventListener('click', () => {
        if (tool.disabled) {
          MediaLab.toast(`「${tool.label}」正在开发中，敬请期待`, 'info');
          return;
        }
        this.openedFromHome = true;
        location.hash = TOOL_HASH_PREFIX + encodeURIComponent(tool.id);
      });

      return card;
    }

    // ===== 路由 =====

    handleRoute() {
      const hash = location.hash;
      if (hash.startsWith(TOOL_HASH_PREFIX)) {
        this.openTool(decodeURIComponent(hash.slice(TOOL_HASH_PREFIX.length)));
      } else {
        this.hideToolView();
      }
    }

    closeTool() {
      if (this.openedFromHome) {
        history.back();
      } else {
        this.resetHash();
      }
    }

    resetHash() {
      history.replaceState(null, '', location.pathname + location.search);
      this.handleRoute();
    }

    // ===== 工具页 =====

    async openTool(toolId) {
      const tool = this.tools.find(item => item.id === toolId);

      if (!tool || tool.disabled) {
        MediaLab.toast(tool ? `「${tool.label}」正在开发中` : '工具不存在', 'error');
        this.resetHash();
        return;
      }

      this.els.toolTitle.textContent = tool.label;
      this.showToolView();

      try {
        await MediaLab.ModuleLoader.loadModule(tool.module);
      } catch (error) {
        this.resetHash();
        return;
      }

      this.els.content.querySelectorAll('.tool-page').forEach(page => {
        page.classList.toggle('active', page.id === `tool-${tool.id}`);
      });
      this.currentToolId = tool.id;
    }

    showToolView() {
      this.els.toolView.classList.add('open');
      this.els.toolView.setAttribute('aria-hidden', 'false');
    }

    hideToolView() {
      if (!this.els.toolView.classList.contains('open')) return;

      this.els.content.querySelectorAll('video, audio').forEach(media => media.pause());
      this.els.toolView.classList.remove('open');
      this.els.toolView.setAttribute('aria-hidden', 'true');
      this.openedFromHome = false;
      this.currentToolId = null;
    }
  }

  const app = new MobileApp();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }

  window.MediaLab.App = app;

})();
