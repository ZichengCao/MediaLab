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
        // 动态加载 JS 文件
        const response = await fetch(modulePath);
        if (!response.ok) {
          throw new Error(`模块加载失败: ${modulePath}`);
        }

        const moduleCode = await response.text();

        // 创建模块执行上下文
        const module = {
          id: this.extractModuleId(modulePath),
          init: null,
          destroy: null
        };

        // 执行模块代码
        const moduleFunction = new Function(
          'module',
          'MediaLab',
          'document',
          'window',
          moduleCode + '\n//# sourceURL=' + modulePath
        );

        moduleFunction(module, MediaLab, document, window);

        this.loadedModules.set(modulePath, module);

        // 如果模块有 init 方法，调用它
        if (typeof module.init === 'function') {
          await module.init();
        }

        return module;
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
