(() => {
  const themeButton = document.getElementById('theme-toggle');
  function themeLabel() {
    if (themeButton) themeButton.setAttribute('aria-label', document.documentElement.dataset.theme === 'dark' ? '切换为浅色模式' : '切换为深色模式');
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
        button.textContent = '已复制';
        status.textContent = 'LaTeX 公式已复制';
      } catch {
        button.textContent = '复制未成功';
        status.textContent = '浏览器未允许访问剪贴板';
      }
      setTimeout(() => { button.textContent = '复制 LaTeX'; }, 1600);
    });
  });
  document.querySelectorAll('[data-copy-feed]').forEach(button => {
    button.addEventListener('click', async () => {
      const field = document.getElementById('feed-address');
      const status = document.getElementById('feed-copy-status');
      try {
        await navigator.clipboard.writeText(field.value);
        button.textContent = '已复制';
        status.textContent = '已复制订阅地址。粘贴到阅读器的“添加订阅”即可。';
      } catch {
        field.focus();
        field.select();
        status.textContent = '地址已选中，请手动复制后粘贴到阅读器。';
      }
      setTimeout(() => { button.textContent = '复制订阅地址'; }, 2000);
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
