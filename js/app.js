/**
 * MediaLab - 应用主入口
 * 负责配置加载、导航路由和全局工具函数
 */

(function () {
  'use strict';

  // ===== 全局工具函数 =====
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

  // ===== 应用管理器 =====
  class AppManager {
    constructor() {
      this.currentToolId = null;
      this.loadedTools = new Map();
      this.menuConfig = null;
    }

    /**
     * 初始化应用
     */
    async init() {
      try {
        // 显示加载状态
        this.showLoadingState();

        // 加载配置
        this.menuConfig = await MediaLab.ModuleLoader.loadConfig();

        // 渲染导航菜单
        this.renderNavigation();

        // 更新版本号
        document.getElementById('app-version').textContent = `v${this.menuConfig.version}`;

        // 隐藏加载状态
        this.hideLoadingState();

        console.log('[MediaLab] 应用初始化完成');
      } catch (error) {
        console.error('[MediaLab] 初始化失败:', error);
        this.showErrorState();
      }
    }

    /**
     * 显示加载状态
     */
    showLoadingState() {
      // 可以添加加载动画
    }

    /**
     * 隐藏加载状态
     */
    hideLoadingState() {
      // 移除加载动画
    }

    /**
     * 显示错误状态
     */
    showErrorState() {
      const container = document.getElementById('nav-menu-container');
      container.innerHTML = '<li class="nav-item-error">配置加载失败</li>';
    }

    /**
     * 渲染导航菜单
     */
    renderNavigation() {
      const container = document.getElementById('nav-menu-container');
      const menuTree = MediaLab.ModuleLoader.getMenuTree();

      container.innerHTML = '';

      menuTree.forEach(category => {
        if (category.children && category.children.length > 0) {
          const categoryItem = this.createCategoryItem(category);
          container.appendChild(categoryItem);
        }
      });
    }

    /**
     * 创建分类菜单项（含子项容器）
     */
    createCategoryItem(category) {
      const li = document.createElement('li');
      li.className = 'nav-category';
      li.dataset.categoryId = category.id;

      // 分类头部
      const header = document.createElement('div');
      header.className = 'nav-category-header';
      header.innerHTML = `
        <span class="nav-category-icon">${MediaLab.ModuleLoader.getIcon(category.icon)}</span>
        <span>${category.label}</span>
        <svg class="nav-category-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      `;

      // 子项容器
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'nav-category-children';

      category.children.forEach(tool => {
        if (!tool.disabled) {
          const toolItem = this.createToolItem(tool, category.id);
          childrenWrap.appendChild(toolItem);
        }
      });

      // 点击头部切换展开/收起
      header.addEventListener('click', () => {
        li.classList.toggle('collapsed');
      });

      li.appendChild(header);
      li.appendChild(childrenWrap);

      return li;
    }

    /**
     * 创建工具菜单项
     */
    createToolItem(tool, categoryId) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.dataset.toolId = tool.id;
      li.dataset.categoryId = categoryId;

      const icon = MediaLab.ModuleLoader.getIcon(tool.icon);

      li.innerHTML = `
        ${icon}
        <span>${tool.label}</span>
      `;

      // 添加点击事件
      li.addEventListener('click', () => this.switchTool(tool.id, li));

      return li;
    }

    /**
     * 切换工具
     */
    async switchTool(toolId, navItem) {
      try {
        // 更新导航激活状态
        this.updateNavigationState(navItem);

        // 如果切换到欢迎页面
        if (toolId === 'welcome') {
          this.showWelcomePage();
          return;
        }

        // 获取工具配置
        const flatItems = MediaLab.ModuleLoader.getFlatMenuItems();
        const toolConfig = flatItems.find(item => item.id === toolId);

        if (!toolConfig) {
          throw new Error(`工具配置未找到: ${toolId}`);
        }

        // 检查是否已加载
        if (this.currentToolId === toolId) {
          return; // 已经是当前工具
        }

        // 加载工具模块
        await this.loadToolModule(toolConfig);

      } catch (error) {
        console.error('[MediaLab] 工具切换失败:', error);
        MediaLab.toast(`工具加载失败: ${error.message}`, 'error');
      }
    }

    /**
     * 更新导航激活状态
     */
    updateNavigationState(activeItem) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });

      if (activeItem) {
        activeItem.classList.add('active');
      }
    }

    /**
     * 显示欢迎页面
     */
    showWelcomePage() {
      // 隐藏所有工具页面
      document.querySelectorAll('.tool-page').forEach(page => {
        if (page.id !== 'welcome-page') {
          page.classList.remove('active');
        }
      });

      // 显示欢迎页面
      const welcomePage = document.getElementById('welcome-page');
      if (welcomePage) {
        welcomePage.classList.add('active');
      }

      this.currentToolId = null;
    }

    /**
     * 加载工具模块
     */
    async loadToolModule(toolConfig) {
      // 隐藏当前工具页面
      if (this.currentToolId) {
        const currentPage = document.getElementById(`tool-${this.currentToolId}`);
        if (currentPage) {
          currentPage.classList.remove('active');
        }
      }

      // 检查模块是否已加载
      const module = MediaLab.ModuleLoader.getLoadedModule(toolConfig.module);

      if (module) {
        // 模块已加载，直接显示
        this.showToolPage(toolConfig.id);
      } else {
        // 加载新模块
        const newModule = await MediaLab.ModuleLoader.loadModule(toolConfig.module);
        this.loadedTools.set(toolConfig.id, newModule);
        this.showToolPage(toolConfig.id);
      }

      this.currentToolId = toolConfig.id;
    }

    /**
     * 显示工具页面
     */
    showToolPage(toolId) {
      // 隐藏欢迎页面
      const welcomePage = document.getElementById('welcome-page');
      if (welcomePage) {
        welcomePage.classList.remove('active');
      }

      // 隐藏所有工具页面
      document.querySelectorAll('.tool-page').forEach(page => {
        page.classList.remove('active');
      });

      // 显示目标工具页面
      const toolPage = document.getElementById(`tool-${toolId}`);
      if (toolPage) {
        toolPage.classList.add('active');
      }
    }

    /**
     * 卸载工具模块
     */
    async unloadTool(toolId) {
      const flatItems = MediaLab.ModuleLoader.getFlatMenuItems();
      const toolConfig = flatItems.find(item => item.id === toolId);

      if (toolConfig) {
        await MediaLab.ModuleLoader.unloadModule(toolConfig.module);
        this.loadedTools.delete(toolId);
      }
    }
  }

  // ===== 初始化应用 =====
  const app = new AppManager();

  // 等待 DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }

  // 导出应用实例
  window.MediaLab.App = app;

})();
