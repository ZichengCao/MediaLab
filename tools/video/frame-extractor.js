/**
 * MediaLab - 视频帧提取工具模块
 * 支持：播放/暂停、逐帧跳转、倍速播放、首尾帧跳转、帧提取与下载
 */

(function (module, MediaLab, document, window) {
  'use strict';

  let isInitialized = false;
  let elements = {};
  let state = {
    frameDuration: 1 / 30,
    extractedFrames: [],
    currentModalFrame: null,
    isSeeking: false,
    videoLoaded: false
  };

  /**
   * 模块初始化
   */
  async function init() {
    if (isInitialized) return;

    // 创建工具页面 DOM
    createToolDOM();

    // 绑定事件
    bindEvents();

    isInitialized = true;
    console.log('[视频帧提取工具] 模块已加载');
  }

  /**
   * 创建工具页面 DOM 结构
   */
  function createToolDOM() {
    const container = document.getElementById('content');
    const toolSection = document.createElement('section');
    toolSection.id = 'tool-video-frame-extractor';
    toolSection.className = 'tool-page';

    toolSection.innerHTML = `
      <div class="toolbar">
        <h2 class="tool-title">视频帧提取工具</h2>
        <button id="btn-open-video" class="btn btn-primary">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          选择视频文件
        </button>
        <input type="file" id="video-file-input" accept="video/*" hidden>
      </div>

      <!-- 未选择视频时的占位 -->
      <div id="video-placeholder" class="placeholder">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
          <line x1="7" y1="2" x2="7" y2="22"/>
          <line x1="17" y1="2" x2="17" y2="22"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <line x1="2" y1="7" x2="7" y2="7"/>
          <line x1="2" y1="17" x2="7" y2="17"/>
          <line x1="17" y1="7" x2="22" y2="7"/>
          <line x1="17" y1="17" x2="22" y2="17"/>
        </svg>
        <p>选择或拖拽一个视频文件开始使用</p>
      </div>

      <!-- 视频工作区 -->
      <div id="video-workspace" class="workspace hidden">
        <div class="video-container">
          <video id="video-player" preload="auto"></video>
          <canvas id="video-canvas" hidden></canvas>
        </div>

        <!-- 控制栏 -->
        <div class="controls-panel">
          <!-- 进度条 -->
          <div class="progress-bar-container">
            <div id="progress-bar" class="progress-bar">
              <div id="progress-fill" class="progress-fill"></div>
              <div id="progress-handle" class="progress-handle"></div>
            </div>
            <div class="time-display">
              <span id="time-current">00:00:00.000</span>
              <span id="time-total">00:00:00.000</span>
            </div>
          </div>

          <!-- 主控制 -->
          <div class="controls-row">
            <div class="controls-group controls-left">
              <button id="btn-prev-frame" class="btn btn-icon" title="上一帧 (←)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <rect x="3" y="5" width="3" height="14"/>
                  <polygon points="20 5 10 12 20 19"/>
                </svg>
              </button>
              <button id="btn-play" class="btn btn-icon btn-play" title="播放/暂停 (空格)">
                <svg id="icon-play" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <svg id="icon-pause" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style="display:none">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              </button>
              <button id="btn-next-frame" class="btn btn-icon" title="下一帧 (→)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <polygon points="4 5 14 12 4 19"/>
                  <rect x="18" y="5" width="3" height="14"/>
                </svg>
              </button>
            </div>

            <div class="controls-group controls-center">
              <button id="btn-first-frame" class="btn btn-sm" title="跳到首帧 (Home)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <rect x="2" y="5" width="3" height="14"/>
                  <polygon points="20 5 9 12 20 19"/>
                </svg>
                首帧
              </button>
              <button id="btn-extract" class="btn btn-accent" title="提取当前帧 (E)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                提取当前帧
              </button>
              <button id="btn-last-frame" class="btn btn-sm" title="跳到尾帧 (End)">
                尾帧
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <polygon points="4 5 15 12 4 19"/>
                  <rect x="19" y="5" width="3" height="14"/>
                </svg>
              </button>
            </div>

            <div class="controls-group controls-right">
              <label class="speed-control">
                <span>倍速</span>
                <select id="speed-select">
                  <option value="0.25">0.25x</option>
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1" selected>1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                  <option value="5">5x</option>
                </select>
              </label>
            </div>
          </div>

          <!-- 视频信息 -->
          <div class="video-info-bar">
            <span id="info-resolution">--</span>
            <span id="info-duration">--</span>
            <span id="info-fps">--</span>
          </div>
        </div>
      </div>

      <!-- 提取的帧列表 -->
      <div id="frames-panel" class="frames-panel hidden">
        <div class="frames-header">
          <h3>已提取的帧</h3>
          <button id="btn-clear-frames" class="btn btn-sm btn-ghost">清空全部</button>
        </div>
        <div id="frames-grid" class="frames-grid"></div>
      </div>
    `;

    container.appendChild(toolSection);

    // 缓存 DOM 元素引用
    cacheElements();

    // 创建预览弹窗（复用全局弹窗）
    createModal();
  }

  /**
   * 缓存 DOM 元素引用
   */
  function cacheElements() {
    const $ = id => document.getElementById(id);

    elements = {
      btnOpen: $('btn-open-video'),
      fileInput: $('video-file-input'),
      placeholder: $('video-placeholder'),
      workspace: $('video-workspace'),
      video: $('video-player'),
      canvas: $('video-canvas'),
      ctx: $('video-canvas').getContext('2d'),
      progressBar: $('progress-bar'),
      progressFill: $('progress-fill'),
      progressHandle: $('progress-handle'),
      timeCurrent: $('time-current'),
      timeTotal: $('time-total'),
      btnPlay: $('btn-play'),
      iconPlay: $('icon-play'),
      iconPause: $('icon-pause'),
      btnPrevFrame: $('btn-prev-frame'),
      btnNextFrame: $('btn-next-frame'),
      btnFirstFrame: $('btn-first-frame'),
      btnLastFrame: $('btn-last-frame'),
      btnExtract: $('btn-extract'),
      speedSelect: $('speed-select'),
      infoResolution: $('info-resolution'),
      infoDuration: $('info-duration'),
      infoFps: $('info-fps'),
      framesPanel: $('frames-panel'),
      framesGrid: $('frames-grid'),
      btnClearFrames: $('btn-clear-frames'),
      toolSection: $('tool-video-frame-extractor')
    };
  }

  /**
   * 创建预览弹窗
   */
  function createModal() {
    // 检查是否已有全局弹窗
    if (document.getElementById('frame-modal')) {
      elements.modal = document.getElementById('frame-modal');
      elements.modalImage = document.getElementById('modal-image');
      elements.modalTitle = document.getElementById('modal-title');
      elements.btnCloseModal = document.getElementById('btn-close-modal');
      elements.btnDownloadFrame = document.getElementById('btn-download-frame');
      return;
    }

    // 创建新的弹窗
    const modal = document.createElement('div');
    modal.id = 'frame-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <span id="modal-title">帧预览</span>
          <button id="btn-close-modal" class="btn btn-icon btn-ghost">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <img id="modal-image" src="" alt="帧预览">
        </div>
        <div class="modal-footer">
          <button id="btn-download-frame" class="btn btn-primary">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            下载图片
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    elements.modal = modal;
    elements.modalImage = document.getElementById('modal-image');
    elements.modalTitle = document.getElementById('modal-title');
    elements.btnCloseModal = document.getElementById('btn-close-modal');
    elements.btnDownloadFrame = document.getElementById('btn-download-frame');
  }

  /**
   * 绑定所有事件
   */
  function bindEvents() {
    // 打开视频文件
    elements.btnOpen.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 拖拽支持
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    // 播放控制
    elements.btnPlay.addEventListener('click', togglePlay);
    elements.video.addEventListener('play', handlePlay);
    elements.video.addEventListener('pause', handlePause);
    elements.video.addEventListener('ended', handleEnded);
    elements.video.addEventListener('timeupdate', handleTimeUpdate);

    // 进度条交互
    let dragging = false;
    elements.progressBar.addEventListener('mousedown', e => {
      if (!state.videoLoaded) return;
      dragging = true;
      seekToMouse(e);
    });

    document.addEventListener('mousemove', e => {
      if (dragging) seekToMouse(e);
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
    });

    // 帧操作
    elements.btnPrevFrame.addEventListener('click', () => stepFrame(-1));
    elements.btnNextFrame.addEventListener('click', () => stepFrame(1));
    elements.btnFirstFrame.addEventListener('click', goToFirstFrame);
    elements.btnLastFrame.addEventListener('click', goToLastFrame);
    elements.btnExtract.addEventListener('click', extractCurrentFrame);

    // 倍速
    elements.speedSelect.addEventListener('change', changeSpeed);

    // 帧列表
    elements.btnClearFrames.addEventListener('click', clearFrames);

    // 弹窗
    elements.btnCloseModal.addEventListener('click', closeModal);
    elements.modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    elements.btnDownloadFrame.addEventListener('click', downloadFrame);

    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboard);
  }

  // ===== 文件处理 =====

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) loadVideo(file);
  }

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
    if (file && file.type.startsWith('video/')) loadVideo(file);
  }

  function loadVideo(file) {
    const url = URL.createObjectURL(file);
    elements.video.src = url;
    elements.video.load();
    state.videoLoaded = false;

    elements.video.addEventListener('loadedmetadata', onMetadataLoaded, { once: true });
    elements.video.addEventListener('error', () => {
      MediaLab.toast('视频加载失败，请检查文件格式', 'error');
    }, { once: true });
  }

  function onMetadataLoaded() {
    elements.placeholder.classList.add('hidden');
    elements.workspace.classList.remove('hidden');
    state.videoLoaded = true;

    state.frameDuration = 1 / 30;

    elements.infoResolution.textContent = `${elements.video.videoWidth} × ${elements.video.videoHeight}`;
    elements.infoDuration.textContent = `时长: ${MediaLab.formatTime(elements.video.duration)}`;
    elements.infoFps.textContent = `估计帧率: ${Math.round(1 / state.frameDuration)} fps`;
    elements.timeTotal.textContent = MediaLab.formatTime(elements.video.duration);

    state.extractedFrames = [];
    elements.framesGrid.innerHTML = '';
    elements.framesPanel.classList.add('hidden');

    MediaLab.toast('视频加载成功');
  }

  // ===== 播放控制 =====

  function togglePlay() {
    if (!state.videoLoaded) return;
    if (elements.video.paused) {
      elements.video.play();
    } else {
      elements.video.pause();
    }
  }

  function handlePlay() {
    elements.iconPlay.style.display = 'none';
    elements.iconPause.style.display = '';
  }

  function handlePause() {
    elements.iconPlay.style.display = '';
    elements.iconPause.style.display = 'none';
  }

  function handleEnded() {
    elements.iconPlay.style.display = '';
    elements.iconPause.style.display = 'none';
  }

  function handleTimeUpdate() {
    if (state.isSeeking) return;
    updateProgress();
  }

  function updateProgress() {
    const pct = (elements.video.currentTime / elements.video.duration) * 100 || 0;
    elements.progressFill.style.width = pct + '%';
    elements.timeCurrent.textContent = MediaLab.formatTime(elements.video.currentTime);
  }

  function seekToMouse(e) {
    const rect = elements.progressBar.getBoundingClientRect();
    let ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    elements.video.currentTime = ratio * elements.video.duration;
    updateProgress();
  }

  function stepFrame(direction) {
    if (!state.videoLoaded) return;
    elements.video.pause();
    elements.video.currentTime = Math.max(0, Math.min(elements.video.duration, elements.video.currentTime + direction * state.frameDuration));
    updateProgress();
  }

  function goToFirstFrame() {
    if (!state.videoLoaded) return;
    elements.video.pause();
    elements.video.currentTime = 0;
    updateProgress();
  }

  function goToLastFrame() {
    if (!state.videoLoaded) return;
    elements.video.pause();
    elements.video.currentTime = Math.max(0, elements.video.duration - state.frameDuration);
    updateProgress();
  }

  function changeSpeed() {
    elements.video.playbackRate = parseFloat(elements.speedSelect.value);
  }

  // ===== 帧提取 =====

  function extractCurrentFrame() {
    if (!state.videoLoaded) return;

    elements.canvas.width = elements.video.videoWidth;
    elements.canvas.height = elements.video.videoHeight;
    elements.ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);

    const dataUrl = elements.canvas.toDataURL('image/png');
    const time = elements.video.currentTime;
    const index = state.extractedFrames.length + 1;

    state.extractedFrames.push({ dataUrl, time });
    addFrameCard(dataUrl, time, index);

    elements.framesPanel.classList.remove('hidden');
    MediaLab.toast(`已提取第 ${index} 帧`);
  }

  function addFrameCard(dataUrl, time, index) {
    const card = document.createElement('div');
    card.className = 'frame-card';
    card.innerHTML = `
      <img src="${dataUrl}" alt="帧 ${index}">
      <div class="frame-card-info">
        <span class="frame-card-time">${MediaLab.formatTime(time)}</span>
        <span class="frame-card-index">#${index}</span>
      </div>
    `;
    card.addEventListener('click', () => openFrameModal(dataUrl, time, index));
    elements.framesGrid.appendChild(card);

    elements.framesGrid.scrollLeft = elements.framesGrid.scrollWidth;
  }

  function clearFrames() {
    state.extractedFrames = [];
    elements.framesGrid.innerHTML = '';
    elements.framesPanel.classList.add('hidden');
  }

  // ===== 弹窗 =====

  function openFrameModal(dataUrl, time, index) {
    state.currentModalFrame = dataUrl;
    elements.modalImage.src = dataUrl;
    elements.modalTitle.textContent = `帧 #${index} — ${MediaLab.formatTime(time)}`;
    elements.modal.classList.remove('hidden');
  }

  function closeModal() {
    elements.modal.classList.add('hidden');
    state.currentModalFrame = null;
  }

  function downloadFrame() {
    if (!state.currentModalFrame) return;
    const a = document.createElement('a');
    a.href = state.currentModalFrame;
    a.download = `frame_${Date.now()}.png`;
    a.click();
    MediaLab.toast('已开始下载');
  }

  // ===== 键盘快捷键 =====

  function handleKeyboard(e) {
    // 仅在当前工具激活时响应
    if (!elements.toolSection.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        stepFrame(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        stepFrame(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        changeSpeedLevel(1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        changeSpeedLevel(-1);
        break;
      case 'e':
      case 'E':
        e.preventDefault();
        extractCurrentFrame();
        break;
      case 'Home':
        e.preventDefault();
        goToFirstFrame();
        break;
      case 'End':
        e.preventDefault();
        goToLastFrame();
        break;
      case 'Escape':
        if (!elements.modal.classList.contains('hidden')) closeModal();
        break;
    }
  }

  function changeSpeedLevel(direction) {
    const options = Array.from(elements.speedSelect.options).map(o => parseFloat(o.value));
    const current = parseFloat(elements.speedSelect.value);
    const idx = options.indexOf(current);
    const newIdx = Math.max(0, Math.min(options.length - 1, idx + direction));
    elements.speedSelect.value = options[newIdx];
    elements.video.playbackRate = options[newIdx];
  }

  /**
   * 模块销毁
   */
  function destroy() {
    if (!isInitialized) return;

    // 清理事件监听器（简化版，实际应该移除所有监听器）
    if (elements.toolSection && elements.toolSection.parentNode) {
      elements.toolSection.parentNode.removeChild(elements.toolSection);
    }

    isInitialized = false;
    console.log('[视频帧提取工具] 模块已卸载');
  }

  // 导出模块接口
  module.init = init;
  module.destroy = destroy;

})({}, MediaLab, document, window);
