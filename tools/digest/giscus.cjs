const fs = require('node:fs');
const path = require('node:path');

function readConfig(root) {
  const file = path.join(root, 'digest/community.json');
  if (!fs.existsSync(file)) return null;
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (config.enabled !== true) return null;
  if (config.provider !== 'giscus' || !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(config.repository)
      || !/^R_[A-Za-z0-9_-]+$/.test(config.repositoryId)
      || typeof config.category !== 'string' || !config.category.trim()
      || !/^DIC_[A-Za-z0-9_-]+$/.test(config.categoryId)) {
    throw new Error('Enable giscus only after verifying its real repository and discussion category IDs.');
  }
  return config;
}

function panel(config, issue, esc, asset, language = 'zh-CN') {
  const tr = (zh, en) => language === 'en' ? en : zh;
  const discussionNumber = issue.community?.discussionNumber;
  if (discussionNumber !== undefined && (!Number.isSafeInteger(discussionNumber) || discussionNumber < 1)) throw new Error('Invalid GitHub discussion number');
  const url = 'https://github.com/' + config.repository + '/discussions' + (discussionNumber ? '/' + discussionNumber : '');
  const mapping = discussionNumber ? 'number' : 'specific';
  // Date-based keys remain stable when article titles and URLs are revised.
  const term = discussionNumber || '科研日报 · ' + issue.date;
  return '<section class="community community-inline" id="discussion" aria-labelledby="discussion-title" data-giscus-panel>'
    + '<div class="community-heading"><div><p class="small-label">READ · THINK · DISCUSS</p><h2 id="discussion-title">' + tr('讨论与点赞', 'Discussion & likes') + '</h2></div><span class="sr-only" data-like-count aria-live="polite"></span></div>'
    + '<p class="community-intro">' + tr('交流推导、补充文献，或推荐下一篇精读。', 'Discuss a derivation, add a reference, or suggest the next classic.') + '</p>'
    + '<p class="community-status">' + tr('在下方直接评论、回复或点赞。首次参与需要 GitHub 登录授权；评论公开可见。', 'Comment, reply, or like below. Sign in with GitHub to participate; comments are public.') + '</p>'
    + '<p class="community-status" data-giscus-status role="status">' + tr('正在加载讨论区…', 'Loading discussion…') + '</p>'
    + '<div class="giscus" id="giscus-comments" data-lang="' + language + '" data-repo="' + esc(config.repository) + '" data-repo-id="' + esc(config.repositoryId)
    + '" data-category="' + esc(config.category) + '" data-category-id="' + esc(config.categoryId)
    + '" data-mapping="' + mapping + '" data-term="' + esc(term)
    + '" data-light-theme="' + asset('assets/giscus-light.css')
    + '" data-dark-theme="' + asset('assets/giscus-dark.css') + '"></div>'
    + '<p class="community-fallback"><a href="' + url + '" target="_blank" rel="noopener noreferrer">' + tr('在 GitHub 打开讨论 ↗', 'Open discussion on GitHub ↗') + '</a></p>'
    + '<noscript><p>' + tr('启用 JavaScript 可在网页内参与，也可以使用上面的 GitHub 链接。', 'Enable JavaScript to participate here, or use the GitHub link above.') + '</p></noscript>'
    + '</section><script type="module" src="' + asset('assets/giscus.mjs') + '"></script>';
}

function writeThemes(root) {
  const styles = fs.readFileSync(path.join(root, 'digest/assets/giscus-likes.css'), 'utf8');
  for (const [name, base] of [['light', 'light'], ['dark', 'dark_dimmed']]) {
    fs.writeFileSync(path.join(root, 'digest/assets/giscus-' + name + '.css'),
      '@import url("https://giscus.app/themes/' + base + '.css");\n' + styles);
  }
}

module.exports = {readConfig, panel, writeThemes};
