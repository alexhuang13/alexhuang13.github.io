(() => {
  const tr = (zh, en) => document.documentElement.lang === 'en' ? en : zh;
  // Keep the current article/section when changing languages. Both pages use
  // identical IDs; do not carry OAuth tokens or other query parameters across.
  document.querySelectorAll('[data-language-link]').forEach(link => {
    const updateLink = () => {
      const target = new URL(link.href);
      target.hash = window.location.hash;
      link.href = target.href;
    };
    updateLink();
    window.addEventListener('hashchange', updateLink);
  });
  const themeButton = document.getElementById('theme-toggle');
  function themeLabel() {
    if (themeButton) themeButton.setAttribute('aria-label', document.documentElement.dataset.theme === 'dark' ? tr('切换为浅色模式', 'Switch to light mode') : tr('切换为深色模式', 'Switch to dark mode'));
  }
  themeLabel();
  themeButton?.addEventListener('click', () => {
    const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = value;
    try { localStorage.setItem('digest-theme', value); } catch {}
    themeLabel();
  });
  document.querySelectorAll('.copy-tex').forEach(button => {
    button.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      try {
        await navigator.clipboard.writeText(button.dataset.tex);
        button.textContent = tr('已复制', 'Copied');
        status.textContent = tr('LaTeX 公式已复制', 'LaTeX equation copied');
      } catch {
        button.textContent = tr('复制未成功', 'Copy failed');
        status.textContent = tr('浏览器未允许访问剪贴板', 'Clipboard access was not allowed');
      }
      setTimeout(() => { button.textContent = tr('复制 LaTeX', 'Copy LaTeX'); }, 1600);
    });
  });
  const progress = document.getElementById('reading-progress');
  const links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  let queued = false;
  function update() {
    const height = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (height > 0 ? Math.min(100,100 * window.scrollY / height) : 0) + '%';
    let current = '';
    for (const section of sections) if (section.getBoundingClientRect().top < 180) current = section.id;
    links.forEach(link => {
      if (link.getAttribute('href') === '#' + current) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
    queued = false;
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', queue, {passive:true});
  update();
})();
