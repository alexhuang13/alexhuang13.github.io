const fs = require('node:fs');
const path = require('node:path');
const katex = require('katex');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'digest');
const origin = 'https://alexhuang13.github.io';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const math = (tex, displayMode = false) => katex.renderToString(tex, {displayMode, throwOnError:true, strict:'error', trust:false, output:'htmlAndMathml'});
let current;
let equations = 0;

function safeUrl(url) {
  if (new URL(url).protocol !== 'https:') throw new Error('Expected HTTPS source: ' + url);
  return esc(url);
}
function text(value) {
  return String(value).split(/(\\\([\s\S]*?\\\))/g).map(part => {
    if (part.startsWith('\\(') && part.endsWith('\\)')) return math(part.slice(2,-2));
    return esc(part).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(\d+(?:,\s*\d+)*)\]/g, (_, refs) => '<span class="citations">' + refs.split(',').map(x => {
        const n=Number(x.trim());
        if (!current.sources[n-1]) throw new Error('Missing reference ' + n);
        return '<a href="#ref-' + n + '" aria-label="参考文献 ' + n + '">[' + n + ']</a>';
      }).join('') + '</span>');
  }).join('');
}
function block(b) {
  if (b.type === 'text') return '<p>' + text(b.text) + '</p>';
  if (b.type === 'background') return '<div class="background"><span class="small-label">' + esc(b.title) + '</span><p>' + text(b.text) + '</p></div>';
  if (b.type === 'note') return '<aside class="note"><span class="small-label">' + esc(b.title) + '</span><p>' + text(b.text) + '</p></aside>';
  if (b.type === 'equation') {
    equations++;
    return '<div class="equation" id="eq-' + equations + '"><div class="equation-meta"><span>' + esc(b.label || '公式') + '</span><button type="button" class="copy-tex" data-tex="' + esc(b.tex) + '" aria-label="复制此公式的 LaTeX">复制 LaTeX</button></div><div class="math-scroll" tabindex="0" role="region" aria-label="' + esc(b.label || '公式') + '">' + math(b.tex,true) + '</div></div>';
  }
  if (b.type === 'table') {
    if (b.rows.some(row => row.length !== b.headers.length)) throw new Error('Unequal table columns');
    return '<figure class="table-figure"><div class="table-scroll" tabindex="0" role="region" aria-label="' + esc(b.caption || b.headers.join(' / ')) + '"><table><thead><tr>' + b.headers.map(h=>'<th scope="col">'+text(h)+'</th>').join('') + '</tr></thead><tbody>' + b.rows.map(row=>'<tr>'+row.map(c=>'<td>'+text(c)+'</td>').join('')+'</tr>').join('') + '</tbody></table></div>' + (b.caption?'<figcaption>'+text(b.caption)+'</figcaption>':'') + '</figure>';
  }
  throw new Error('Unknown block type: ' + b.type);
}
function header(active) {
  return '<header class="site-header"><div class="nav-inner"><a class="wordmark" href="/"><span class="monogram">ZH</span><span>Zixun Huang</span></a><nav aria-label="主导航"><a href="/digest/"'+(active==='archive'?' aria-current="page"':'')+'>Research Digest</a><a href="/digest/reading.html"'+(active==='reading'?' aria-current="page"':'')+'>每日精读</a><a class="homepage-link" href="/">主页 <span aria-hidden="true">↗</span></a><button type="button" id="theme-toggle" aria-label="切换为深色模式" title="切换阅读主题"><span aria-hidden="true">◐</span></button></nav></div></header>';
}
function shell(title, canonical, content, active='issue') {
  return '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+esc(title)+' · Zixun Huang</title>\n<meta name="description" content="聚焦 Muon、scaling laws 与 post-training 的科研日报：必要背景、数学机制、实验与原始来源。">\n<meta name="color-scheme" content="light dark">\n<link rel="canonical" href="'+origin+canonical+'">\n<link rel="alternate" type="application/atom+xml" title="Research Digest" href="/digest/feed.xml">\n<script>try{if(localStorage.getItem("digest-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}</script>\n<link rel="stylesheet" href="/digest/assets/katex/katex.min.css">\n<link rel="stylesheet" href="/digest/assets/digest.css">\n<script defer src="/digest/assets/digest.js"></script>\n</head>\n<body><a class="skip-link" href="#main">跳到正文</a><div id="reading-progress" aria-hidden="true"></div>'+header(active)+content+'<footer class="site-footer"><span>Research Digest · Zixun Huang</span><div><a href="/digest/">全部期刊</a><a href="/digest/feed.xml">RSS / Atom</a><a href="/">主页 ↗</a></div></footer><div role="status" aria-live="polite" id="copy-status" class="sr-only"></div></body>\n</html>\n';
}
function article(a) {
  const recognition=a.recognition?'<a class="recognition" href="'+safeUrl(a.recognition.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.recognition.label)+' ↗</a>':'';
  return '<section class="article'+(a.paperId?' classic-article':'')+'" id="'+esc(a.id)+'"><div class="article-kicker"><span>'+esc(a.kind)+'</span><span class="evidence '+(a.evidence==='基于摘要'?'abstract':'')+'">'+esc(a.evidence)+'</span></div><h2>'+esc(a.title)+'</h2><div class="paper-meta"><a class="paper-title" href="'+safeUrl(a.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.paper)+' <span aria-hidden="true">↗</span></a><div>'+esc(a.authors)+'</div><div class="date-note">'+esc(a.dateNote)+'</div>'+recognition+'</div>'+a.blocks.map(block).join('')+'</section>';
}
function communityPanel(issue) {
  if(!issue.community) return '';
  const c=issue.community;
  if(c.provider!=='github-issues'||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.repository)||!Number.isSafeInteger(c.issueNumber)||c.issueNumber<1) throw new Error('Invalid discussion configuration');
  const url='https://github.com/'+c.repository+'/issues/'+c.issueNumber;
  const anchor=Number.isSafeInteger(c.issueId)?'#issue-'+c.issueId:'';
  return '<section class="community" id="discussion" aria-labelledby="discussion-title" data-repository="'+esc(c.repository)+'" data-issue-number="'+c.issueNumber+'"><div class="community-heading"><div><p class="small-label">READ · THINK · DISCUSS</p><h2 id="discussion-title">讨论与点赞</h2></div><a class="community-like" href="'+url+anchor+'" target="_blank" rel="noopener noreferrer" aria-label="前往 GitHub 为本期点赞"><span aria-hidden="true">👍</span> <span data-like-count>—</span><span>去点赞 ↗</span></a></div><p class="community-intro">交流推导、补充文献，或推荐下一篇精读。</p><div class="community-actions"><a class="community-join" href="'+url+'#new_comment_field" target="_blank" rel="noopener noreferrer">参与讨论 ↗</a><span>在 GitHub 登录后评论、点赞；评论同步显示在这里。</span></div><div class="community-toolbar"><span data-comment-count>公开评论</span><button type="button" data-community-refresh>刷新</button></div><p class="community-status" data-community-status role="status">正在连接讨论区…</p><ol class="comment-list" data-comments aria-label="本期评论"></ol><button type="button" class="community-more" data-community-more hidden>加载更多评论</button><noscript><p>请<a href="'+url+'">前往 GitHub 阅读评论与点赞</a>。</p></noscript></section><script type="module" src="/digest/assets/community.mjs"></script>';
}
function issuePage(issue) {
  current = issue; equations = 0;
  const date = issue.date.replaceAll('-', '.');
  const allArticles=issue.articles.concat(issue.classic?[issue.classic]:[]);
  const toc = '<aside class="toc" aria-label="本期目录"><p class="small-label">本期阅读</p><ol>'+allArticles.map(a=>'<li><a href="#'+esc(a.id)+'"><span>'+esc(a.kind)+'</span>'+esc(a.title)+'</a></li>').join('')+'<li><a href="#references"><span>附录</span>原始来源</a></li>'+(issue.community?'<li><a href="#discussion"><span>一起读</span>讨论与点赞</a></li>':'')+'</ol><a class="archive-link" href="/digest/">← 全部期刊</a></aside>';
  const hero = '<div class="issue-hero"><div class="eyebrow"><a href="/digest/">科研日报 / Research Digest</a><span>No. '+esc(issue.number)+'</span></div><div class="issue-date"><time datetime="'+issue.date+'">'+date+'</time><span class="edition">'+esc(issue.edition)+'</span><span>约 '+issue.readingMinutes+' 分钟</span></div><h1>'+esc(issue.title)+'</h1><p class="deck">'+esc(issue.subtitle)+'</p><p class="hero-intro">'+esc(issue.intro)+'</p><div class="tags">'+issue.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div></div>';
  const references = '<section class="references" id="references"><p class="small-label">READ THE ORIGINALS</p><h2>原始来源</h2><ol>'+issue.sources.map((s,i)=>'<li id="ref-'+(i+1)+'"><a href="'+safeUrl(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' <span aria-hidden="true">↗</span></a></li>').join('')+'</ol><details class="coverage"><summary>检索窗口</summary><p class="window">'+esc(issue.window)+'</p></details></section>';
  const jump=issue.classic?'<a class="classic-jump" href="#'+esc(issue.classic.id)+'"><span>每日精读 · '+issue.classic.year+'</span>'+esc(issue.classic.shortTitle)+'<span aria-hidden="true">↓</span></a>':'';
  const content = '<main id="main"><div class="issue-layout">'+toc+'<div class="reading-column">'+hero+jump+'<div class="articles">'+allArticles.map(article).join('')+'</div>'+references+communityPanel(issue)+'<a class="back-archive" href="/digest/">← 返回日报归档</a></div></div></main>';
  return shell('科研日报 '+date+' · '+issue.title, '/digest/'+issue.date+'.html', content);
}

fs.mkdirSync(path.join(out,'assets','katex'),{recursive:true});
const kd = path.join(path.dirname(require.resolve('katex')), '.');
fs.copyFileSync(path.join(kd,'katex.min.css'),path.join(out,'assets/katex/katex.min.css'));
fs.cpSync(path.join(kd,'fonts'),path.join(out,'assets/katex/fonts'),{recursive:true});
fs.copyFileSync(path.join(kd,'../LICENSE'),path.join(out,'assets/katex/LICENSE'));

const issues = fs.readdirSync(path.join(out,'issues')).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().map(f=>{
  const data=JSON.parse(fs.readFileSync(path.join(out,'issues',f),'utf8'));
  if (f !== data.date+'.json' || !data.articles?.length || !data.sources?.length) throw new Error('Invalid issue '+f);
  const ids=data.articles.concat(data.classic?[data.classic]:[]).map(a=>a.id);
  if(data.classic&&(!data.classic.paperId||!Number.isInteger(data.classic.year)||!data.classic.recognition?.url||!data.classic.blocks?.length)) throw new Error('Invalid classic reading');
  if(new Set(ids).size!==ids.length || ids.some(id=>!/^[a-z][a-z0-9-]*$/.test(id))) throw new Error('Invalid article IDs');
  fs.writeFileSync(path.join(out,data.date+'.html'),issuePage(data));
  console.log('Rendered '+data.date+': '+data.articles.length+' updates, '+(data.classic?1:0)+' classic, '+equations+' display equations');
  return data;
});
if(!issues.length) throw new Error('No issues');
const newest=issues[0];
const archive='<main class="archive-main" id="main"><div class="archive-hero"><p class="eyebrow">ZIXUN HUANG / RESEARCH NOTES</p><h1>科研日报<span>Research Digest</span></h1><p>用公式梳理机制，用实验校准理解。</p><div class="tags"><span>Muon</span><span>Scaling laws</span><span>Post-training</span></div></div><section class="archive-list" aria-label="期刊归档"><div class="archive-heading"><h2>期刊归档</h2><span>'+issues.length+' 期</span></div>'+issues.map((i,n)=>'<article class="issue-row"><div class="archive-date"><time datetime="'+i.date+'">'+i.date.replaceAll('-','.')+'</time><span>No. '+esc(i.number)+'</span></div><div><div class="row-label">'+(n===0?'<span class="latest-label">最新一期</span>':'')+'<span>'+esc(i.edition)+'</span></div><h3><a href="'+i.date+'.html">'+esc(i.title)+' <span aria-hidden="true">↗</span></a></h3><p>'+esc(i.subtitle)+'</p><div class="row-meta">'+i.articles.length+' 条动态'+(i.classic?' · 1 篇精读':'')+' · 约 '+i.readingMinutes+' 分钟</div>'+(i.classic?'<a class="archive-classic" href="'+i.date+'.html#'+esc(i.classic.id)+'">每日精读 · '+esc(i.classic.shortTitle)+'（'+i.classic.year+'） →</a>':'')+'</div></article>').join('')+'</section><div class="archive-about"><h2>关于这个栏目</h2><p>跟踪关注作者与研究方向的新论文、技术博客及实质更新。每期保留必要背景、关键公式、实验对照和证据边界。另设每日一篇经典精读，涵盖 scaling laws、post-training、深度学习理论、diffusion 与 RNN / linear attention。</p><a href="feed.xml">订阅 RSS / Atom →</a></div></main>';
fs.writeFileSync(path.join(out,'index.html'),shell('科研日报 / Research Digest','/digest/',archive,'archive'));

const readingLog=issues.filter(i=>i.classic).map(i=>({date:i.date,paperId:i.classic.paperId,paper:i.classic.paper,shortTitle:i.classic.shortTitle,year:i.classic.year,topics:i.classic.topics,recognition:i.classic.recognition,source:i.classic.url,url:'/digest/'+i.date+'.html#'+i.classic.id}));
fs.writeFileSync(path.join(out,'reading-log.json'),JSON.stringify(readingLog,null,2)+'\n');
const reading='<main class="archive-main" id="main"><div class="archive-hero"><p class="eyebrow">ONE PAPER A DAY</p><h1>每日精读<span>Reading the classics</span></h1><p>每天一篇旧作：从动机与背景，到关键公式与可以继续追问的问题。</p><div class="tags"><span>Scaling laws</span><span>Post-training</span><span>Deep learning theory</span><span>Diffusion models</span><span>RNN / Linear attention</span></div></div><section class="archive-list" aria-label="经典精读归档"><div class="archive-heading"><h2>已读论文</h2><span>'+readingLog.length+' 篇</span></div>'+readingLog.map(i=>'<article class="issue-row"><div class="archive-date"><time datetime="'+i.date+'">'+i.date.replaceAll('-','.')+'</time><span>会议 '+i.year+'</span></div><div><div class="row-label">'+i.topics.map(t=>esc(t)).join(' · ')+'</div><h3><a href="'+esc(i.url)+'">'+esc(i.shortTitle)+' <span aria-hidden="true">↗</span></a></h3><p>'+esc(i.paper)+'</p><a class="recognition" href="'+safeUrl(i.recognition.url)+'" target="_blank" rel="noopener noreferrer">'+esc(i.recognition.label)+' ↗</a></div></article>').join('')+'</section><div class="archive-about"><p>优先选择高引用、会议 best paper 或 oral 工作，并给出可核验的入选依据。历史论文与当天新研究分别标注。</p><a href="/digest/">← 日报归档</a></div></main>';
fs.writeFileSync(path.join(out,'reading.html'),shell('每日精读','/digest/reading.html',reading,'reading'));

const timestamp=i=>{if(!i.publishedAt || Number.isNaN(Date.parse(i.publishedAt)))throw new Error('Missing valid publishedAt');return esc(i.publishedAt);};
const feed='<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Research Digest · Zixun Huang</title><id>'+origin+'/digest/</id><link href="'+origin+'/digest/"/><link rel="self" href="'+origin+'/digest/feed.xml"/><updated>'+timestamp(newest)+'</updated><author><name>Zixun Huang</name></author>'+issues.map(i=>'<entry><title>'+esc(i.title)+'</title><id>'+origin+'/digest/'+i.date+'.html</id><link href="'+origin+'/digest/'+i.date+'.html"/><updated>'+timestamp(i)+'</updated><summary>'+esc(i.subtitle)+'</summary></entry>').join('')+'</feed>\n';
fs.writeFileSync(path.join(out,'feed.xml'),feed);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({timezone:'America/New_York',latest:newest.date,issues:issues.map(i=>({date:i.date,title:i.title,url:'/digest/'+i.date+'.html',sources:i.sources.map(s=>s.url)}))},null,2)+'\n');

const homeFile=path.join(root,'index.html');
let home=fs.readFileSync(homeFile,'utf8');
const start='<!-- research-digest-latest:start -->', end='<!-- research-digest-latest:end -->';
const teaser=start+'\n      <section id="research-digest">\n        <h2>Research Digest</h2>\n        <div class="card">\n          <p><a href="./digest/'+newest.date+'.html"><strong>'+esc(newest.title)+'</strong></a> <span class="muted">· '+newest.date+'</span></p>\n          <p>'+esc(newest.subtitle)+'</p>\n          <p><a href="./digest/">Browse all issues →</a></p>\n        </div>\n      </section>\n      '+end;
if(home.includes(start) && home.includes(end)) {
  const a=home.indexOf(start), b=home.indexOf(end)+end.length;
  home=home.slice(0,a)+teaser+home.slice(b);
} else {
  const anchor='      <section id="lecture-notes">';
  if(!home.includes(anchor)) throw new Error('Homepage insertion anchor not found');
  home=home.replace(anchor,'      '+teaser+'\n\n'+anchor);
}
const navAnchor='      <a href="#lecture-notes">Lecture Notes</a>';
if(!home.includes('<a href="./digest/">Research Digest</a>')) {
  if(!home.includes(navAnchor)) throw new Error('Homepage nav anchor not found');
  home=home.replace(navAnchor,navAnchor+'\n      <a href="./digest/">Research Digest</a>');
}
if(!home.includes('/* Digest navigation: keep the full menu reachable on small screens. */')) {
  home=home.replace('  </style>','    /* Digest navigation: keep the full menu reachable on small screens. */\n    .top-nav{overflow-x:auto; scrollbar-width:thin}\n    .top-nav .nav-links{flex-shrink:0}\n    .top-nav a{white-space:nowrap}\n    @media(max-width:960px){.top-nav{padding:10px 20px}.top-nav .nav-links{gap:12px}}\n  </style>');
}
fs.writeFileSync(homeFile,home);
console.log('Updated archive, feed, manifest, and homepage latest-issue entry.');
