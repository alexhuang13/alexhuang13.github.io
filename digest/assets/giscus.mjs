const GISCUS_ORIGIN = 'https://giscus.app';

function mount(panel) {
  const container = panel.querySelector('.giscus');
  const language = container.dataset.lang || 'zh-CN';
  const tr = (zh, en) => language === 'en' ? en : zh;
  const status = panel.querySelector('[data-giscus-status]');
  const script = document.createElement('script');
  let frame;
  let loaded = false;
  const theme = () => new URL(document.documentElement.dataset.theme === 'dark'
    ? container.dataset.darkTheme : container.dataset.lightTheme, window.location.origin).href;
  const syncTheme = () => frame?.contentWindow?.postMessage({giscus:{setConfig:{theme:theme()}}}, GISCUS_ORIGIN);

  const observer = new MutationObserver(() => {
    const next = container.querySelector('iframe.giscus-frame');
    if (!next || next === frame) return;
    frame = next;
    frame.title = tr('讨论与点赞', 'Discussion and likes');
    frame.addEventListener('load', syncTheme);
    syncTheme();
  });
  observer.observe(container, {childList:true, subtree:true});
  new MutationObserver(syncTheme).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});

  window.addEventListener('message', event => {
    if (event.origin !== GISCUS_ORIGIN || event.source !== frame?.contentWindow || !event.data?.giscus) return;
    const data = event.data.giscus;
    const likes = data.discussion?.reactions?.THUMBS_UP?.count;
    if (Number.isSafeInteger(likes) && likes >= 0) {
      panel.querySelector('[data-like-count]').textContent = tr(likes + ' 人点赞', likes + (likes === 1 ? ' like' : ' likes'));
    }
    if (typeof data.resizeHeight === 'number') {
      loaded = true;
      status.hidden = true;
    }
    if (typeof data.error === 'string' && !data.error.includes('Discussion not found')) {
      status.hidden = false;
      status.textContent = tr('讨论区暂时无法连接。可以使用下方的 GitHub 链接。', 'Unable to connect. Use the GitHub link below.');
    }
  });

  script.src = GISCUS_ORIGIN + '/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  Object.assign(script.dataset, container.dataset, {
    strict:'1', reactionsEnabled:'1', emitMetadata:'1', inputPosition:'top',
    theme:theme(), lang:language, loading:'lazy'
  });
  script.addEventListener('error', () => {
    status.hidden = false;
    status.textContent = tr('讨论区未能加载。可以使用下方的 GitHub 链接。', 'The discussion could not load. Use the GitHub link below.');
  });
  container.append(script);
  setTimeout(() => {
    if (!loaded) status.textContent = tr('讨论区仍在加载；若没有出现，可使用下方的 GitHub 链接。', 'Still loading; if the discussion does not appear, use the GitHub link below.');
  }, 15000);
}

const returningFromSignIn = new URL(window.location.href).searchParams.has('giscus');
document.querySelectorAll('[data-giscus-panel]').forEach(panel => {
  if (returningFromSignIn || !('IntersectionObserver' in window)) return mount(panel);
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); mount(panel); }
  }, {rootMargin:'500px'});
  observer.observe(panel);
});
