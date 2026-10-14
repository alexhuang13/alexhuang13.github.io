const API = 'https://api.github.com/repos/';
const PAGE_SIZE = 30;
const CACHE_TTL = 180000;

export function discussionUrls(repository, issueNumber) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]+$/.test(repository) || ['.', '..'].includes(repository.split('/')[1]) || !Number.isSafeInteger(issueNumber) || issueNumber < 1) throw new Error('Invalid discussion');
  const path = repository + '/issues/' + issueNumber;
  return {api: API + path, web: 'https://github.com/' + path};
}

export function normalizeIssue(value, expectedNumber) {
  if (!value || value.number !== expectedNumber || value.pull_request || !Number.isSafeInteger(value.comments) || value.comments < 0 || !Number.isSafeInteger(value.reactions?.['+1']) || value.reactions['+1'] < 0) throw new Error('Invalid issue response');
  return {comments: value.comments, likes: value.reactions['+1'], locked: value.locked === true};
}

export function normalizeComment(value, issueUrl) {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || typeof value.body !== 'string' || !/^[A-Za-z0-9-]+(?:\[bot\])?$/.test(value.user?.login || '')) throw new Error('Invalid comment response');
  const url = new URL(value.html_url);
  const expected = new URL(issueUrl);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.hash !== '#issuecomment-' + value.id || url.username || url.password || url.search) throw new Error('Invalid comment URL');
  const timestamp = Date.parse(value.created_at);
  if (!Number.isFinite(timestamp)) throw new Error('Invalid comment date');
  return {id: value.id, author: value.user.login, body: value.body, url: url.href, date: new Date(timestamp).toISOString()};
}

async function request(url, fresh = false) {
  const key = 'digest-community:' + url;
  if (!fresh) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;
    } catch {}
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {headers: {Accept: 'application/vnd.github+json'}, credentials: 'omit', signal: controller.signal});
    if (!response.ok) throw new Error('GitHub ' + response.status);
    const data = await response.json();
    try { sessionStorage.setItem(key, JSON.stringify({at: Date.now(), data})); } catch {}
    return data;
  } finally { clearTimeout(timeout); }
}

function mount(panel) {
  const number = Number(panel.dataset.issueNumber);
  const urls = discussionUrls(panel.dataset.repository, number);
  const list = panel.querySelector('[data-comments]');
  const status = panel.querySelector('[data-community-status]');
  const refresh = panel.querySelector('[data-community-refresh]');
  const more = panel.querySelector('[data-community-more]');
  const dateFormat = new Intl.DateTimeFormat('zh-CN', {dateStyle: 'medium', timeStyle: 'short'});
  let page = 0, total = 0, loading = false, lastFetched = 0;
  const shown = new Set();

  function appendComment(comment) {
    if (shown.has(comment.id)) return;
    const item = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const author = document.createElement('a');
    author.href = comment.url;
    author.target = '_blank';
    author.rel = 'noopener noreferrer';
    author.textContent = '@' + comment.author;
    const time = document.createElement('time');
    time.dateTime = comment.date;
    time.textContent = dateFormat.format(new Date(comment.date));
    meta.append(author, time);
    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = comment.body.length > 3000 ? comment.body.slice(0, 3000) + '…' : comment.body;
    const original = document.createElement('a');
    original.className = 'comment-original';
    original.href = comment.url;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    original.textContent = '阅读原评论 / 回复 ↗';
    item.append(meta, body, original);
    list.append(item);
    shown.add(comment.id);
  }

  async function load(reset = false, fresh = false) {
    if (loading) return;
    loading = true;
    refresh.disabled = true;
    more.disabled = true;
    status.textContent = '正在同步讨论…';
    panel.setAttribute('aria-busy', 'true');
    try {
      let details = null;
      if (reset || page === 0) details = normalizeIssue(await request(urls.api, fresh), number);
      const nextPage = reset ? 1 : page + 1;
      const count = details ? details.comments : total;
      let comments = [];
      if (count > 0) {
        const result = await request(urls.api + '/comments?per_page=' + PAGE_SIZE + '&page=' + nextPage, fresh);
        if (!Array.isArray(result)) throw new Error('Invalid comments response');
        comments = result.map(value => normalizeComment(value, urls.web));
      }
      if (reset) { list.replaceChildren(); shown.clear(); }
      if (details) {
        total = details.comments;
        panel.querySelector('[data-like-count]').textContent = String(details.likes);
        panel.querySelector('[data-comment-count]').textContent = '公开评论 · ' + total;
        panel.querySelector('.community-join').textContent = details.locked ? '阅读讨论 ↗' : '参与讨论 ↗';
      }
      comments.forEach(appendComment);
      page = nextPage;
      lastFetched = Date.now();
      more.hidden = !(comments.length === PAGE_SIZE && shown.size < total);
      status.textContent = total === 0 ? '还没有评论。欢迎提出第一个问题。' : (shown.size < total ? '已显示 ' + shown.size + ' 条；全部评论可在 GitHub 阅读。' : '已同步 · ' + dateFormat.format(new Date(lastFetched)));
      if (details?.locked) status.textContent += ' 本期讨论已锁定。';
    } catch {
      status.textContent = '暂时无法同步评论与点赞数。你仍可通过上方入口在 GitHub 阅读、评论或点赞。';
    } finally {
      loading = false;
      refresh.disabled = false;
      more.disabled = false;
      panel.removeAttribute('aria-busy');
    }
  }

  refresh.addEventListener('click', () => { if (Date.now() - lastFetched >= 5000) load(true, true); });
  more.addEventListener('click', () => load(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && page > 0 && Date.now() - lastFetched > CACHE_TTL) load(true, true); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); load(true); }
    }, {rootMargin: '500px'});
    observer.observe(panel);
  } else { load(true); }
}

if (typeof document !== 'undefined') document.querySelectorAll('.community[data-issue-number]').forEach(mount);
