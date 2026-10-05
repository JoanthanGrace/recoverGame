'use strict';
window.recoveryAudio = (() => {
  let muted = false;
  const clips = new Map();
  for (const name of ['relax', 'strengthen', 'wrong', 'complete']) {
    const audio = new Audio(`../assets/resources/audio/${name}.wav`);
    audio.preload = 'auto'; audio.volume = 0.45; clips.set(name, audio);
  }
  const stopAll = () => { for (const audio of clips.values()) { audio.pause(); if (audio.readyState > 0) audio.currentTime = 0; } };
  const toggle = document.querySelector('#sound');
  toggle.addEventListener('click', () => {
    muted = !muted; stopAll(); toggle.textContent = muted ? '音效关' : '音效开';
    toggle.setAttribute('aria-pressed', String(muted)); toggle.setAttribute('aria-label', muted ? '开启音效' : '关闭音效');
  });
  return {
    stopAll,
    play(name) {
      if (muted) return;
      const audio = clips.get(name); if (!audio) return;
      stopAll();
      // Browser autoplay restrictions must never interrupt the puzzle flow.
      audio.play().catch(() => {});
    },
  };
})();
