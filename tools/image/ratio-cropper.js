/**
 * MediaLab - 图片宽高比裁切工具模块
 * 支持：常用比例选择、选区整体拖动、四角拉伸（锁定比例时自动保持）、裁切保存
 */

(function (module, MediaLab, document, window) {
  'use strict';

  const IS_MOBILE = document.documentElement.classList.contains('ml-mobile');
  const MIN_SIZE = 24; // 选区最小显示尺寸（px）

  const RATIOS = [
    { id: 'free', label: '自由', value: null },
    { id: '1-1', label: '1:1', value: 1 },
    { id: '4-3', label: '4:3', value: 4 / 3 },
    { id: '3-4', label: '3:4', value: 3 / 4 },
    { id: '16-9', label: '16:9', value: 16 / 9 },
    { id: '9-16', label: '9:16', value: 9 / 16 },
    { id: '3-2', label: '3:2', value: 3 / 2 },
    { id: '2-3', label: '2:3', value: 2 / 3 }
  ];

  let isInitialized = false;
  let elements = {};
  let state = {
    ratio: null,
    imageLoaded: false,
    srcType: '',
    objectUrl: null,
    naturalW: 0,
    naturalH: 0,
    dispW: 0,
    dispH: 0,
    scale: 1,
    rect: { x: 0, y: 0, w: 0, h: 0 },
    drag: null
  };
  let resizeTimer = null;

  /**
   * 模块初始化
   */
  async function init() {
    if (isInitialized) return;

    createToolDOM();
    bindEvents();

    isInitialized = true;
    console.log('[图片宽高比裁切] 模块已加载');
  }

  /**
   * 创建工具页面 DOM 结构
   */
  function createToolDOM() {
    const container = document.getElementById('content');
    const toolSection = document.createElement('section');
    toolSection.id = 'tool-image-ratio-cropper';
    toolSection.className = 'tool-page';

    toolSection.innerHTML = `
      <div class="toolbar">
        <h2 class="tool-title">宽高比裁切</h2>
        <button id="btn-open-image" class="btn btn-primary">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          选择图片文件
        </button>
        <input type="file" id="image-file-input" accept="image/*" hidden>
      </div>

      <!-- 未选择图片时的占位 -->
      <div id="cropper-placeholder" class="placeholder">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/>
          <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/>
        </svg>
        <p>选择或拖拽一个图片文件开始使用</p>
      </div>

      <!-- 裁切工作区 -->
      <div id="cropper-workspace" class="workspace hidden">
        <div class="cropper-stage" id="cropper-stage">
          <div class="cropper-wrap">
            <img id="cropper-image" alt="待裁切图片">
            <div class="crop-box" id="crop-box">
              <span class="crop-line crop-line-h1"></span>
              <span class="crop-line crop-line-h2"></span>
              <span class="crop-line crop-line-v1"></span>
              <span class="crop-line crop-line-v2"></span>
              <span class="crop-handle" data-handle="nw"></span>
              <span class="crop-handle" data-handle="ne"></span>
              <span class="crop-handle" data-handle="sw"></span>
              <span class="crop-handle" data-handle="se"></span>
            </div>
          </div>
        </div>

        <!-- 控制面板 -->
        <div class="controls-panel">
          <div class="ratio-row" id="ratio-row"></div>

          <div class="crop-info-bar">
            <span id="crop-size">--</span>
            <span id="crop-ratio-label">自由比例</span>
          </div>

          <div class="controls-row cropper-actions">
            <button id="btn-reset-crop" class="btn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              重置选区
            </button>
            <button id="btn-save-crop" class="btn btn-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              保存图片
            </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(toolSection);

    cacheElements();

    if (IS_MOBILE) {
      elements.placeholder.querySelector('p').textContent = '点击选择图片文件';
      const sub = document.createElement('p');
      sub.className = 'placeholder-sub';
      sub.textContent = '支持相册中的图片，所有处理都在手机本地完成';
      elements.placeholder.appendChild(sub);
    }
  }

  /**
   * 缓存 DOM 元素引用
   */
  function cacheElements() {
    const $ = id => document.getElementById(id);

    elements = {
      btnOpen: $('btn-open-image'),
      fileInput: $('image-file-input'),
      placeholder: $('cropper-placeholder'),
      workspace: $('cropper-workspace'),
      stage: $('cropper-stage'),
      image: $('cropper-image'),
      cropBox: $('crop-box'),
      ratioRow: $('ratio-row'),
      cropSize: $('crop-size'),
      ratioLabel: $('crop-ratio-label'),
      btnReset: $('btn-reset-crop'),
      btnSave: $('btn-save-crop'),
      toolSection: $('tool-image-ratio-cropper')
    };
  }

  /**
   * 绑定所有事件
   */
  function bindEvents() {
    elements.btnOpen.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) loadImage(file);
    });

    if (IS_MOBILE) {
      elements.placeholder.addEventListener('click', () => elements.fileInput.click());
    }

    // 拖拽支持
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    buildRatioButtons();

    // 选区拖动 / 四角缩放：Pointer Events 同时覆盖鼠标与触屏
    elements.stage.addEventListener('pointerdown', onPointerDown);
    elements.stage.addEventListener('pointermove', onPointerMove);
    elements.stage.addEventListener('pointerup', onPointerUp);
    elements.stage.addEventListener('pointercancel', onPointerUp);

    elements.btnReset.addEventListener('click', () => {
      fitCropToRatio();
      updateCropInfo();
    });
    elements.btnSave.addEventListener('click', saveCrop);

    window.addEventListener('resize', onWindowResize);
  }

  // ===== 文件处理 =====

  function handleDragOver(e) {
    e.preventDefault();
    document.body.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    if (e.relatedTarget === null) document.body.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    document.body.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  }

  function loadImage(file) {
    if (!file.type.startsWith('image/')) {
      MediaLab.toast('请选择图片文件', 'error');
      return;
    }

    state.srcType = file.type;
    const url = URL.createObjectURL(file);

    elements.image.addEventListener('load', onImageLoaded, { once: true });
    elements.image.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      MediaLab.toast('图片加载失败，请检查文件格式', 'error');
    }, { once: true });

    elements.image.src = url;
  }

  function onImageLoaded() {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = elements.image.src;

    state.naturalW = elements.image.naturalWidth;
    state.naturalH = elements.image.naturalHeight;
    state.imageLoaded = true;

    elements.placeholder.classList.add('hidden');
    elements.workspace.classList.remove('hidden');

    MediaLab.toast('图片加载成功');
    // 工作区刚显示，等两帧布局稳定后再量尺寸、生成初始选区
    requestAnimationFrame(() => requestAnimationFrame(measureAndFit));
  }

  function onWindowResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.imageLoaded) measureAndFit();
    }, 200);
  }

  function measureAndFit() {
    state.dispW = elements.image.clientWidth;
    state.dispH = elements.image.clientHeight;
    if (!state.dispW || !state.dispH) return;

    state.scale = state.dispW / state.naturalW;
    fitCropToRatio();
    updateCropInfo();
  }

  // ===== 比例选择 =====

  function buildRatioButtons() {
    RATIOS.forEach(ratio => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ratio-btn' + (ratio.value === null ? ' active' : '');
      btn.dataset.ratioId = ratio.id;
      btn.textContent = ratio.label;
      btn.addEventListener('click', () => setRatio(ratio));
      elements.ratioRow.appendChild(btn);
    });
  }

  function setRatio(ratio) {
    state.ratio = ratio.value;

    elements.ratioRow.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ratioId === ratio.id);
    });
    elements.ratioLabel.textContent = ratio.value === null ? '自由比例' : `目标比例 ${ratio.label}`;

    fitCropToRatio();
    updateCropInfo();
  }

  /**
   * 按当前比例生成居中的初始选区（占图 90%）
   */
  function fitCropToRatio() {
    const maxW = state.dispW;
    const maxH = state.dispH;
    let w, h;

    if (state.ratio) {
      if (maxW / maxH > state.ratio) {
        h = maxH * 0.9;
        w = h * state.ratio;
      } else {
        w = maxW * 0.9;
        h = w / state.ratio;
      }
    } else {
      w = maxW * 0.9;
      h = maxH * 0.9;
    }

    state.rect = clampRect({
      x: (maxW - w) / 2,
      y: (maxH - h) / 2,
      w,
      h
    });
    renderCropBox();
  }

  // ===== 选区交互 =====

  function onPointerDown(e) {
    if (!state.imageLoaded) return;

    const handle = e.target.closest('.crop-handle');
    let mode = null;
    if (handle) {
      mode = handle.dataset.handle;
    } else if (e.target.closest('.crop-box')) {
      mode = 'move';
    }
    if (!mode) return;

    e.preventDefault();
    state.drag = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...state.rect }
    };
    elements.stage.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!state.drag) return;

    const dx = e.clientX - state.drag.startX;
    const dy = e.clientY - state.drag.startY;
    const o = state.drag.orig;
    let rect;

    if (state.drag.mode === 'move') {
      rect = { x: o.x + dx, y: o.y + dy, w: o.w, h: o.h };
    } else {
      const mode = state.drag.mode;
      // 四角拉伸：对角固定为锚点
      const dirX = (mode === 'se' || mode === 'ne') ? 1 : -1;
      const dirY = (mode === 'se' || mode === 'sw') ? 1 : -1;
      let w = o.w + dirX * dx;
      let h = o.h + dirY * dy;

      if (state.ratio) {
        // 锁定比例：取投影更大的轴决定缩放，长宽同步
        const scale = Math.max(w / o.w, h / o.h, MIN_SIZE / o.w, MIN_SIZE / o.h);
        w = o.w * scale;
        h = o.h * scale;
      } else {
        w = Math.max(MIN_SIZE, w);
        h = Math.max(MIN_SIZE, h);
      }

      const anchorX = (mode === 'se' || mode === 'sw') ? o.x : o.x + o.w;
      const anchorY = (mode === 'se' || mode === 'ne') ? o.y : o.y + o.h;
      rect = {
        x: (mode === 'se' || mode === 'sw') ? anchorX : anchorX - w,
        y: (mode === 'se' || mode === 'ne') ? anchorY : anchorY - h,
        w,
        h
      };
    }

    state.rect = clampRect(rect);
    renderCropBox();
    updateCropInfo();
  }

  function onPointerUp() {
    state.drag = null;
  }

  /**
   * 把选区约束在图片范围内（锁定比例时保持长宽比收缩）
   */
  function clampRect(r) {
    const maxW = state.dispW;
    const maxH = state.dispH;

    if (state.ratio) {
      if (r.w > maxW || r.h > maxH) {
        if (r.w / maxW > r.h / maxH) {
          r.w = maxW;
          r.h = r.w / state.ratio;
        } else {
          r.h = maxH;
          r.w = r.h * state.ratio;
        }
      }
    } else {
      r.w = Math.min(Math.max(MIN_SIZE, r.w), maxW);
      r.h = Math.min(Math.max(MIN_SIZE, r.h), maxH);
    }

    // 贴边收缩：任何一边出界都把选区收回图内
    if (r.x + r.w > maxW) {
      r.w = Math.max(MIN_SIZE, maxW - r.x);
      if (state.ratio) r.h = r.w / state.ratio;
    }
    if (r.y + r.h > maxH) {
      r.h = Math.max(MIN_SIZE, maxH - r.y);
      if (state.ratio) r.w = r.h * state.ratio;
    }
    if (r.x < 0) {
      r.w = Math.max(MIN_SIZE, r.w + r.x);
      if (state.ratio) r.h = r.w / state.ratio;
      r.x = 0;
    }
    if (r.y < 0) {
      r.h = Math.max(MIN_SIZE, r.h + r.y);
      if (state.ratio) r.w = r.h * state.ratio;
      r.y = 0;
    }

    r.x = Math.max(0, Math.min(r.x, maxW - r.w));
    r.y = Math.max(0, Math.min(r.y, maxH - r.h));
    return r;
  }

  function renderCropBox() {
    const r = state.rect;
    const style = elements.cropBox.style;
    style.left = r.x + 'px';
    style.top = r.y + 'px';
    style.width = r.w + 'px';
    style.height = r.h + 'px';
  }

  function updateCropInfo() {
    if (!state.imageLoaded) return;
    const w = Math.round(state.rect.w / state.scale);
    const h = Math.round(state.rect.h / state.scale);
    elements.cropSize.textContent = `输出 ${w} × ${h} px`;
  }

  // ===== 裁切保存 =====

  function saveCrop() {
    if (!state.imageLoaded) return;

    const s = state.scale;
    const sx = Math.max(0, Math.round(state.rect.x / s));
    const sy = Math.max(0, Math.round(state.rect.y / s));
    const sw = Math.max(1, Math.min(state.naturalW - sx, Math.round(state.rect.w / s)));
    const sh = Math.max(1, Math.min(state.naturalH - sy, Math.round(state.rect.h / s)));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    canvas.getContext('2d').drawImage(elements.image, sx, sy, sw, sh, 0, 0, sw, sh);

    // 照片保持 JPEG 导出避免体积膨胀，其余导出 PNG
    const type = state.srcType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob(blob => {
      if (!blob) {
        MediaLab.toast('导出失败，请重试', 'error');
        return;
      }
      const ext = type === 'image/jpeg' ? 'jpg' : 'png';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crop_${timestamp()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      MediaLab.toast('已保存裁切图片');
    }, type, 0.92);
  }

  function timestamp() {
    const t = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}_${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  }

  /**
   * 模块销毁
   */
  function destroy() {
    if (!isInitialized) return;

    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onWindowResize);
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);

    if (elements.toolSection && elements.toolSection.parentNode) {
      elements.toolSection.parentNode.removeChild(elements.toolSection);
    }

    isInitialized = false;
    console.log('[图片宽高比裁切] 模块已卸载');
  }

  // 导出模块接口
  module.init = init;
  module.destroy = destroy;

})(window.__MediaLabModule, window.MediaLab, document, window);
