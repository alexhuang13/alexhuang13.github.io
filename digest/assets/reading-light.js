(() => {
  if (document.querySelector('.reading-light')) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = window.matchMedia('(forced-colors: active)');
  const enabled = () => !reducedMotion.matches && !forcedColors.matches;
  const light = document.createElement('div');
  light.className = 'reading-light';
  light.setAttribute('aria-hidden', 'true');
  document.body.prepend(light);
  document.body.classList.add('has-reading-light');
  document.querySelectorAll('.article, .equation, .note, .background, .issue-row, .subscription-card, .card').forEach(surface => {
    surface.setAttribute('data-reading-light-surface', '');
  });

  let x = 0, y = 0, visible = false, frame = 0, activeSurface = null, touchId = null;
  function clearSurface() {
    activeSurface?.removeAttribute('data-lit');
    activeSurface = null;
  }
  function hide() {
    visible = false;
    light.removeAttribute('data-visible');
    clearSurface();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function render() {
    frame = 0;
    if (!visible || !enabled()) return;
    light.style.setProperty('--light-x', x + 'px');
    light.style.setProperty('--light-y', y + 'px');
    light.dataset.visible = 'true';
    // Touch targets stay fixed during a native scroll, so find the actual
    // surface under the finger each frame instead of using event.target.
    const surface = document.elementFromPoint(x, y)?.closest('[data-reading-light-surface]');
    if (surface !== activeSurface) { clearSurface(); activeSurface = surface; }
    if (surface) {
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty('--surface-light-x', (x - rect.left) + 'px');
      surface.style.setProperty('--surface-light-y', (y - rect.top) + 'px');
      surface.dataset.lit = 'true';
    }
  }
  function queue() {
    if (visible && enabled() && !frame) frame = requestAnimationFrame(render);
  }
  function move(clientX, clientY, input) {
    if (!enabled() || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    x = clientX; y = clientY;
    light.dataset.input = input;
    visible = true;
    queue();
  }
  const passive = {passive: true};
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' && event.isPrimary !== false) move(event.clientX, event.clientY, event.pointerType || 'mouse');
  }, passive);
  document.addEventListener('pointerout', event => {
    if (event.pointerType !== 'touch' && (!event.relatedTarget || event.relatedTarget.tagName === 'IFRAME')) hide();
  }, passive);
  // Passive Touch Events continue during native scrolling after browsers
  // cancel pointer events. No preventDefault, touch-action change, or capture.
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { touchId = null; hide(); return; }
    const touch = event.touches[0];
    touchId = touch.identifier;
    move(touch.clientX, touch.clientY, 'touch');
  }, passive);
  document.addEventListener('touchmove', event => {
    if (event.touches.length !== 1) { touchId = null; hide(); return; }
    const touch = Array.from(event.touches).find(item => item.identifier === touchId);
    if (touch) move(touch.clientX, touch.clientY, 'touch');
  }, passive);
  const endTouch = () => { touchId = null; hide(); };
  document.addEventListener('touchend', endTouch, passive);
  document.addEventListener('touchcancel', endTouch, passive);
  window.addEventListener('scroll', queue, passive);
  window.addEventListener('resize', hide, passive);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  reducedMotion.addEventListener('change', hide);
  forcedColors.addEventListener('change', hide);
})();
