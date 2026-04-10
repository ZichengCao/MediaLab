# MediaLab 项目结构说明

## 项目概述

MediaLab 是一个模块化的媒体工具集，采用 JSON 配置驱动的架构，支持无限层级的工具分类和动态模块加载。

## 目录结构

```
MediaLab/
├── config/
│   └── menu.json              # 菜单配置文件（核心配置）
├── css/
│   └── main.css               # 全局样式
├── js/
│   ├── app.js                 # 应用主入口和路由管理
│   └── module-loader.js       # 模块加载器
├── tools/                     # 工具模块目录
│   ├── video/
│   │   └── frame-extractor.js # 视频帧提取工具
│   ├── image/
│   │   └── editor.js          # 图片编辑工具（占位）
│   ├── audio/
│   │   └── editor.js          # 音频编辑工具（占位）
│   └── document/
│       └── pdf.js             # PDF 工具（占位）
├── index.html                 # 主页面（精简版）
└── README.md                  # 本文档
```

## 核心设计

### 1. JSON 配置驱动

所有菜单结构通过 `config/menu.json` 配置：

```json
{
  "version": "1.0.0",
  "menu": [
    {
      "id": "video",
      "label": "视频工具",
      "icon": "video",
      "children": [
        {
          "id": "video-frame-extractor",
          "label": "帧提取工具",
          "icon": "film",
          "module": "tools/video/frame-extractor.js"
        }
      ]
    }
  ]
}
```

### 2. 动态模块加载

- 模块按需加载，首次点击时才加载对应 JS 文件
- 支持模块的初始化和销毁
- 模块间相互隔离，互不干扰

### 3. 无限层级支持

虽然实际使用中最多 3 级，但架构支持任意层级的菜单结构。

## 添加新工具

### 步骤 1：创建工具模块

在 `tools/` 目录下创建新的 JS 文件：

```javascript
(function (module, MediaLab, document, window) {
  'use strict';

  let isInitialized = false;

  async function init() {
    if (isInitialized) return;
    createToolDOM();
    bindEvents();
    isInitialized = true;
  }

  function createToolDOM() {
    const container = document.getElementById('content');
    const toolSection = document.createElement('section');
    toolSection.id = 'tool-your-tool-id';
    toolSection.className = 'tool-page';
    toolSection.innerHTML = `<!-- 你的工具 HTML -->`;
    container.appendChild(toolSection);
  }

  function destroy() {
    // 清理代码
  }

  module.init = init;
  module.destroy = destroy;

})({}, MediaLab, document, window);
```

### 步骤 2：更新配置文件

在 `config/menu.json` 中添加你的工具配置：

```json
{
  "id": "your-tool-id",
  "label": "你的工具名称",
  "icon": "your-icon",
  "module": "tools/your-path/your-tool.js"
}
```

### 步骤 3：添加图标（可选）

在 `config/menu.json` 的 `icons` 部分添加自定义 SVG 图标。

## 技术栈

- **纯原生技术**：不依赖任何框架
- **ES6+**：使用现代 JavaScript 特性
- **CSS Grid/Flexbox**：现代布局技术
- **Web API**：利用浏览器原生能力

## 全局工具函数

### MediaLab.toast(message, type)

显示通知消息：

```javascript
MediaLab.toast('操作成功', 'success');
MediaLab.toast('操作失败', 'error');
```

### MediaLab.formatTime(seconds)

格式化时间显示：

```javascript
MediaLab.formatTime(123.456); // "00:02:03.456"
```

## 模块开发规范

1. **模块封装**：所有代码封装在立即执行函数中
2. **导出接口**：必须导出 `init` 和 `destroy` 方法
3. **DOM 管理**：模块负责创建和清理自己的 DOM 元素
4. **事件处理**：模块初始化时绑定事件，销毁时清理
5. **命名规范**：
   - 模块文件名使用小写字母和连字符
   - 工具 ID 使用小写字母和连字符
   - DOM 元素 ID 使用 `tool-{工具ID}` 格式

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 开发建议

1. 使用浏览器开发者工具查看控制台日志
2. 模块加载失败时会显示错误提示
3. 可以通过 `MediaLab.ModuleLoader` 和 `MediaLab.App` 访问核心功能
