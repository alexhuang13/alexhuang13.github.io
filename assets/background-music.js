(() => {
  const audio = document.getElementById('home-background-music');
  const control = document.getElementById('home-music-control');
  const button = document.getElementById('home-music-toggle');
  const status = document.getElementById('home-music-status');
  if (!audio || !control || !button || !status) return;

  const track = 'Conformal, Cover Me';
  audio.volume = 0.18;
  // Start only when the reader asks: this also satisfies browser autoplay rules.
  const render = () => {
    const playing = !audio.paused && !audio.ended;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} background music: ${track}`);
    button.title = `${playing ? 'Pause' : 'Play'} ${track}`;
    if (control.dataset.error !== 'true') status.textContent = track;
  };

  button.addEventListener('click', async () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    delete control.dataset.error;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.textContent = 'Starting music…';
    try {
      await audio.play();
    } catch {
      control.dataset.error = 'true';
      status.textContent = 'Music unavailable — listen on Suno below.';
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      render();
    }
  });

  ['play', 'pause', 'ended'].forEach(event => audio.addEventListener(event, render));
  audio.addEventListener('error', () => {
    control.dataset.error = 'true';
    status.textContent = 'Music unavailable — listen on Suno below.';
    button.disabled = false;
    button.removeAttribute('aria-busy');
    render();
  });
  // Stop playback when navigating away, including pages kept in the back/forward cache.
  window.addEventListener('pagehide', () => audio.pause());
  control.hidden = false;
  render();
})();
