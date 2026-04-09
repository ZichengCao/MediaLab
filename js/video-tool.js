/**
 * MediaLab - 视频帧提取工具
 * 支持：播放/暂停、逐帧跳转、倍速播放、首尾帧跳转、帧提取与下载
 */

(function () {
  'use strict';

  // ===== DOM 元素 =====
  const $ = id => document.getElementById(id);

  const btnOpen = $('btn-open-video');
  const fileInput = $('video-file-input');
  const placeholder = $('video-placeholder');
  const workspace = $('video-workspace');
  const video = $('video-player');
  const canvas = $('video-canvas');
  const ctx = canvas.getContext('2d');

  const progressBar = $('progress-bar');
  const progressFill = $('progress-fill');
  const progressHandle = $('progress-handle');
  const timeCurrent = $('time-current');
  const timeTotal = $('time-total');

  const btnPlay = $('btn-play');
  const iconPlay = $('icon-play');
  const iconPause = $('icon-pause');
  const btnPrevFrame = $('btn-prev-frame');
  const btnNextFrame = $('btn-next-frame');
  const btnFirstFrame = $('btn-first-frame');
  const btnLastFrame = $('btn-last-frame');
  const btnExtract = $('btn-extract');
  const speedSelect = $('speed-select');

  const infoResolution = $('info-resolution');
  const infoDuration = $('info-duration');
  const infoFps = $('info-fps');

  const framesPanel = $('frames-panel');
  const framesGrid = $('frames-grid');
  const btnClearFrames = $('btn-clear-frames');

  const modal = $('frame-modal');
  const modalImage = $('modal-image');
  const modalTitle = $('modal-title');
  const btnCloseModal = $('btn-close-modal');
  const btnDownloadFrame = $('btn-download-frame');

  // ===== 状态 =====
  let frameDuration = 1 / 30; // 默认 30fps
  let extractedFrames = []; // { dataUrl, time }
  let currentModalFrame = null;
  let isSeeking = false;
  let videoLoaded = false;

  // ===== 打开视频文件 =====
  btnOpen.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) loadVideo(file);
  });

  // 拖拽支持
  document.addEventListener('dragover', e => {
    e.preventDefault();
    document.body.classList.add('drag-over');
  });

  document.addEventListener('dragleave', e => {
    if (e.relatedTarget === null) document.body.classList.remove('drag-over');
  });

  document.addEventListener('drop', e => {
    e.preventDefault();
    document.body.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) loadVideo(file);
  });

  function loadVideo(file) {
    const url = URL.createObjectURL(file);
    video.src = url;
    video.load();
    videoLoaded = false;

    video.addEventListener('loadedmetadata', onMetadataLoaded, { once: true });
    video.addEventListener('error', () => {
      MediaLab.toast('视频加载失败，请检查文件格式', 'error');
    }, { once: true });
  }

  function onMetadataLoaded() {
    placeholder.classList.add('hidden');
    workspace.classList.remove('hidden');
    videoLoaded = true;

    // 计算帧时长（尝试从视频元数据推测 fps）
    frameDuration = guessFrameDuration(video);

    // 更新信息
    infoResolution.textContent = `${video.videoWidth} × ${video.videoHeight}`;
    infoDuration.textContent = `时长: ${MediaLab.formatTime(video.duration)}`;
    infoFps.textContent = `估计帧率: ${Math.round(1 / frameDuration)} fps`;
    timeTotal.textContent = MediaLab.formatTime(video.duration);

    // 重置已提取帧
    extractedFrames = [];
    framesGrid.innerHTML = '';
    framesPanel.classList.add('hidden');

    MediaLab.toast('视频加载成功');
  }

  /**
   * 猜测帧时长
   * 浏览器没有直接提供 fps，使用常见帧率做估算
   */
  function guessFrameDuration(v) {
    // 尝试用 getVideoPlaybackQuality 来推算（部分浏览器支持）
    // 如果不支持，默认 30fps
    return 1 / 30;
  }

  // ===== 播放/暂停 =====
  btnPlay.addEventListener('click', togglePlay);

  function togglePlay() {
    if (!videoLoaded) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  video.addEventListener('play', () => {
    iconPlay.style.display = 'none';
    iconPause.style.display = '';
  });

  video.addEventListener('pause', () => {
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
  });

  video.addEventListener('ended', () => {
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
  });

  // ===== 进度条更新 =====
  video.addEventListener('timeupdate', () => {
    if (isSeeking) return;
    updateProgress();
  });

  function updateProgress() {
    const pct = (video.currentTime / video.duration) * 100 || 0;
    progressFill.style.width = pct + '%';
    timeCurrent.textContent = MediaLab.formatTime(video.currentTime);
  }

  // ===== 进度条交互 =====
  let dragging = false;

  progressBar.addEventListener('mousedown', e => {
    if (!videoLoaded) return;
    dragging = true;
    seekToMouse(e);
  });

  document.addEventListener('mousemove', e => {
    if (dragging) seekToMouse(e);
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });

  function seekToMouse(e) {
    const rect = progressBar.getBoundingClientRect();
    let ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    video.currentTime = ratio * video.duration;
    updateProgress();
  }

  // ===== 逐帧跳转 =====
  btnPrevFrame.addEventListener('click', () => stepFrame(-1));
  btnNextFrame.addEventListener('click', () => stepFrame(1));

  function stepFrame(direction) {
    if (!videoLoaded) return;
    video.pause();
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + direction * frameDuration));
    updateProgress();
  }

  // ===== 首帧/尾帧 =====
  btnFirstFrame.addEventListener('click', () => {
    if (!videoLoaded) return;
    video.pause();
    video.currentTime = 0;
    updateProgress();
  });

  btnLastFrame.addEventListener('click', () => {
    if (!videoLoaded) return;
    video.pause();
    // seek to slightly before end to avoid ending state
    video.currentTime = Math.max(0, video.duration - frameDuration);
    updateProgress();
  });

  // ===== 倍速 =====
  speedSelect.addEventListener('change', () => {
    video.playbackRate = parseFloat(speedSelect.value);
  });

  // ===== 帧提取 =====
  btnExtract.addEventListener('click', extractCurrentFrame);

  function extractCurrentFrame() {
    if (!videoLoaded) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const time = video.currentTime;
    const index = extractedFrames.length + 1;

    extractedFrames.push({ dataUrl, time });
    addFrameCard(dataUrl, time, index);

    framesPanel.classList.remove('hidden');
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
    framesGrid.appendChild(card);

    // 自动滚动到最新
    framesGrid.scrollLeft = framesGrid.scrollWidth;
  }

  // ===== 清空帧 =====
  btnClearFrames.addEventListener('click', () => {
    extractedFrames = [];
    framesGrid.innerHTML = '';
    framesPanel.classList.add('hidden');
  });

  // ===== 帧预览弹窗 =====
  function openFrameModal(dataUrl, time, index) {
    currentModalFrame = dataUrl;
    modalImage.src = dataUrl;
    modalTitle.textContent = `帧 #${index} — ${MediaLab.formatTime(time)}`;
    modal.classList.remove('hidden');
  }

  btnCloseModal.addEventListener('click', closeModal);
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

  function closeModal() {
    modal.classList.add('hidden');
    currentModalFrame = null;
  }

  btnDownloadFrame.addEventListener('click', () => {
    if (!currentModalFrame) return;
    const a = document.createElement('a');
    a.href = currentModalFrame;
    a.download = `frame_${Date.now()}.png`;
    a.click();
    MediaLab.toast('已开始下载');
  });

  // ===== 键盘快捷键 =====
  document.addEventListener('keydown', e => {
    // 仅在视频工具激活时响应
    if (!$('tool-video').classList.contains('active')) return;
    // 忽略输入框
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
        // 倍速提高
        changeSpeed(1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        // 倍速降低
        changeSpeed(-1);
        break;
      case 'e':
      case 'E':
        e.preventDefault();
        extractCurrentFrame();
        break;
      case 'Home':
        e.preventDefault();
        btnFirstFrame.click();
        break;
      case 'End':
        e.preventDefault();
        btnLastFrame.click();
        break;
      case 'Escape':
        if (!modal.classList.contains('hidden')) closeModal();
        break;
    }
  });

  function changeSpeed(direction) {
    const options = Array.from(speedSelect.options).map(o => parseFloat(o.value));
    const current = parseFloat(speedSelect.value);
    const idx = options.indexOf(current);
    const newIdx = Math.max(0, Math.min(options.length - 1, idx + direction));
    speedSelect.value = options[newIdx];
    video.playbackRate = options[newIdx];
  }
})();
