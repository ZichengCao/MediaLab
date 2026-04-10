/**
 * MediaLab - 模块加载器
 * 负责根据配置动态加载工具模块
 */

(function () {
  'use strict';

  class ModuleLoader {
    constructor() {
      this.loadedModules = new Map();
      this.config = null;
    }

    /**
     * 加载菜单配置
     */
    async loadConfig() {
      try {
        const response = await fetch('config/menu.json');
        if (!response.ok) {
          throw new Error('配置文件加载失败');
        }
        this.config = await response.json();
        return this.config;
      } catch (error) {
        console.error('加载配置失败:', error);
        MediaLab.toast('配置文件加载失败', 'error');
        throw error;
      }
    }

    /**
     * 获取图标 SVG
     */
    getIcon(iconName) {
      if (!this.config || !this.config.icons) {
        return '';
      }
      return this.config.icons[iconName] || this.config.icons['file'];
    }

    /**
     * 扁平化菜单项，获取所有叶子节点
     */
    getFlatMenuItems() {
      if (!this.config || !this.config.menu) {
        return [];
      }

      const items = [];

      function traverse(menuItems, parentId = null) {
        menuItems.forEach(item => {
          if (item.children && item.children.length > 0) {
            // 有子项的为分类
            traverse(item.children, item.id);
          } else if (item.module) {
            // 有 module 的为具体工具
            items.push({
              ...item,
              parentId: parentId
            });
          }
        });
      }

      traverse(this.config.menu);
      return items;
    }

    /**
     * 获取菜单树结构（用于渲染导航）
     */
    getMenuTree() {
      return this.config ? this.config.menu : [];
    }

    /**
     * 动态加载工具模块
     */
    async loadModule(modulePath) {
      // 如果已经加载过，直接返回
      if (this.loadedModules.has(modulePath)) {
        return this.loadedModules.get(modulePath);
      }

      try {
        // 创建模块上下文对象
        const mod = {
          id: this.extractModuleId(modulePath),
          init: null,
          destroy: null
        };

        // 通过全局临时变量传递 module 对象给模块 IIFE
        window.__MediaLabModule = mod;

        // 动态创建 script 标签加载模块
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = modulePath;
          script.onload = resolve;
          script.onerror = () => reject(new Error(`模块加载失败: ${modulePath}`));
          document.head.appendChild(script);
          // 加载完后移除 script 标签，代码已在 IIFE 中执行完毕
          script.onload = () => {
            document.head.removeChild(script);
            resolve();
          };
        });

        this.loadedModules.set(modulePath, mod);

        // 如果模块有 init 方法，调用它
        if (typeof mod.init === 'function') {
          await mod.init();
        }

        return mod;
      } catch (error) {
        console.error('模块加载失败:', error);
        MediaLab.toast(`模块加载失败: ${error.message}`, 'error');
        throw error;
      }
    }

    /**
     * 从模块路径提取模块 ID
     */
    extractModuleId(modulePath) {
      const parts = modulePath.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace('.js', '');
    }

    /**
     * 卸载模块
     */
    async unloadModule(modulePath) {
      const module = this.loadedModules.get(modulePath);
      if (module && typeof module.destroy === 'function') {
        await module.destroy();
      }
      this.loadedModules.delete(modulePath);
    }

    /**
     * 检查模块是否已加载
     */
    isModuleLoaded(modulePath) {
      return this.loadedModules.has(modulePath);
    }

    /**
     * 获取已加载的模块
     */
    getLoadedModule(modulePath) {
      return this.loadedModules.get(modulePath);
    }
  }

  // 导出为全局单例
  window.MediaLab = window.MediaLab || {};
  window.MediaLab.ModuleLoader = new ModuleLoader();

})();
