const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const katex = require('katex');
const giscus = require('./giscus.cjs');
const newsletter = require('./newsletter.cjs');
const {languages, base, url: localizedUrl, validateTranslation} = require('./languages.cjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'digest');
const origin = 'https://alexhuang13.github.io';
const communityConfig = giscus.readConfig(root);
const newsletterConfig = newsletter.readConfig(root);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asset = relative => '/digest/'+relative+'?v='+createHash('sha256').update(fs.readFileSync(path.join(out,relative))).digest('hex').slice(0,12);
const math = (tex, displayMode = false) => katex.renderToString(tex, {displayMode, throwOnError:true, strict:'error', trust:false, output:'htmlAndMathml'});
let language = 'zh-CN';
let current;
let equations = 0;
const tr = (zh, en) => language === 'en' ? en : zh;
const href = (relative = '') => base(language) + relative;
const minutes = n => tr('约 '+n+' 分钟', n+' min read');

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
        return '<a href="#ref-' + n + '" aria-label="'+tr('参考文献 ', 'Reference ')+n+'">[' + n + ']</a>';
      }).join('') + '</span>');
  }).join('');
}
function block(b) {
  if (b.type === 'text') return '<p>' + text(b.text) + '</p>';
  if (b.type === 'background') return '<div class="background"><span class="small-label">' + esc(b.title) + '</span><p>' + text(b.text) + '</p></div>';
  if (b.type === 'note') return '<aside class="note"><span class="small-label">' + esc(b.title) + '</span><p>' + text(b.text) + '</p></aside>';
  if (b.type === 'equation') {
    equations++;
    const label=esc(b.label || tr('公式','Equation'));
    return `<div class="equation" id="eq-${equations}"><div class="equation-meta"><span>${label}</span><button type="button" class="copy-tex" data-tex="${esc(b.tex)}" aria-label="${tr('复制此公式的 LaTeX','Copy this equation as LaTeX')}">${tr('复制 LaTeX','Copy LaTeX')}</button></div><div class="math-scroll" tabindex="0" role="region" aria-label="${label}">${math(b.tex,true)}</div></div>`;
  }
  if (b.type === 'table') {
    if (b.rows.some(row => row.length !== b.headers.length)) throw new Error('Unequal table columns');
    return '<figure class="table-figure"><div class="table-scroll" tabindex="0" role="region" aria-label="' + esc(b.caption || b.headers.join(' / ')) + '"><table><thead><tr>' + b.headers.map(h=>'<th scope="col">'+text(h)+'</th>').join('') + '</tr></thead><tbody>' + b.rows.map(row=>'<tr>'+row.map(c=>'<td>'+text(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>' + (b.caption?'<figcaption>'+text(b.caption)+'</figcaption>':'') + '</figure>';
  }
  throw new Error('Unknown block type: ' + b.type);
}
function header(active, canonical) {
  const languageLinks = languages.map(code=>`<a href="${localizedUrl(canonical,code)}" lang="${code}" hreflang="${code}" data-language-link${code===language?' aria-current="page"':''}>${code==='en'?'EN':'中文'}</a>`).join('');
  return `<header class="site-header"><div class="nav-inner"><a class="wordmark" href="/"><span class="monogram">ZH</span><span>Zixun Huang</span></a><nav aria-label="${tr('主导航','Main navigation')}"><a href="${href()}"${active==='archive'?' aria-current="page"':''}>Research Digest</a><a href="${href('reading.html')}"${active==='reading'?' aria-current="page"':''}>${tr('每日精读','Daily classic')}</a><a class="homepage-link" href="/">${tr('主页','Home')} <span aria-hidden="true">↗</span></a><span class="language-switch" role="group" aria-label="${tr('语言','Language')}">${languageLinks}</span><button type="button" id="theme-toggle" aria-label="${tr('切换为深色模式','Switch to dark mode')}" title="${tr('切换阅读主题','Switch reading theme')}"><span aria-hidden="true">◐</span></button></nav></div></header>`;
}
function shell(title, canonical, content, active='issue') {
  const alternates=languages.map(code=>`<link rel="alternate" hreflang="${code}" href="${origin+localizedUrl(canonical,code)}">`).join('\n');
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Zixun Huang</title>
<meta name="description" content="${tr('聚焦 Muon、scaling laws 与 post-training 的科研日报：必要背景、数学机制、实验与原始来源。','Research notes on Muon, scaling laws, and post-training: background, mathematical mechanisms, experiments, and original sources.')}">
<meta name="color-scheme" content="light dark">
<link rel="canonical" href="${origin+localizedUrl(canonical,language)}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${origin+canonical}">
<link rel="alternate" type="application/atom+xml" title="Research Digest" href="/digest/feed.xml">
<script>try{if(localStorage.getItem("digest-theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}</script>
<link rel="stylesheet" href="/digest/assets/katex/katex.min.css">
<link rel="stylesheet" href="${asset('assets/digest.css')}">
<script defer src="${asset('assets/digest.js')}"></script>
</head>
<body><a class="skip-link" href="#main">${tr('跳到正文','Skip to content')}</a><div id="reading-progress" aria-hidden="true"></div>${header(active,canonical)}${content}<footer class="site-footer"><span>Research Digest · Zixun Huang</span><div><a href="${href()}">${tr('全部期刊','All issues')}</a><a href="${href('subscribe.html')}">${tr('邮件订阅','Email subscription')}</a><a href="/">${tr('主页','Home')} ↗</a></div></footer><div role="status" aria-live="polite" id="copy-status" class="sr-only"></div></body>
</html>
`;
}
function article(a) {
  const recognition=a.recognition?'<a class="recognition" href="'+safeUrl(a.recognition.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.recognition.label)+' ↗</a>':'';
  return '<section class="article'+(a.paperId?' classic-article':'')+'" id="'+esc(a.id)+'"><div class="article-kicker"><span>'+esc(a.kind)+'</span><span class="evidence '+(['基于摘要','Abstract only'].includes(a.evidence)?'abstract':'')+'">'+esc(a.evidence)+'</span></div><h2>'+esc(a.title)+'</h2><div class="paper-meta"><a class="paper-title" href="'+safeUrl(a.url)+'" target="_blank" rel="noopener noreferrer">'+esc(a.paper)+' <span aria-hidden="true">↗</span></a><div>'+esc(a.authors)+'</div><div class="date-note">'+esc(a.dateNote)+'</div>'+recognition+'</div>'+a.blocks.map(block).join('')+'</section>';
}
function communityPanel(issue) {
  if(communityConfig) return giscus.panel(communityConfig, issue, esc, asset, language);
  if(!issue.community) return '';
  const c=issue.community;
  if(c.provider!=='github-issues'||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(c.repository)||!Number.isSafeInteger(c.issueNumber)||c.issueNumber<1) throw new Error('Invalid discussion configuration');
  const url='https://github.com/'+c.repository+'/issues/'+c.issueNumber;
  const anchor=Number.isSafeInteger(c.issueId)?'#issue-'+c.issueId:'';
  return '<section class="community" id="discussion" aria-labelledby="discussion-title" data-repository="'+esc(c.repository)+'" data-issue-number="'+c.issueNumber+'"><div class="community-heading"><div><p class="small-label">READ · THINK · DISCUSS</p><h2 id="discussion-title">'+tr('讨论与点赞','Discussion & likes')+'</h2></div><a class="community-like" href="'+url+anchor+'" target="_blank" rel="noopener noreferrer"><span data-like-count>—</span><span>'+tr('去点赞','Like on GitHub')+' ↗</span></a></div><div class="community-actions"><a class="community-join" href="'+url+'#new_comment_field" target="_blank" rel="noopener noreferrer">'+tr('参与讨论','Join the discussion')+' ↗</a></div><div class="community-toolbar"><span data-comment-count>'+tr('公开评论','Public comments')+'</span><button type="button" data-community-refresh>'+tr('刷新','Refresh')+'</button></div><p class="community-status" data-community-status role="status">'+tr('正在连接讨论区…','Loading discussion…')+'</p><ol class="comment-list" data-comments aria-label="'+tr('本期评论','Comments for this issue')+'"></ol><button type="button" class="community-more" data-community-more hidden>'+tr('加载更多评论','Load more comments')+'</button><noscript><p><a href="'+url+'">'+tr('前往 GitHub 阅读评论与点赞','Read comments and like on GitHub')+'</a></p></noscript></section><script type="module" src="'+asset('assets/community.mjs')+'"></script>';
}
function issuePage(issue) {
  current=issue; equations=0;
  const date=issue.date.replaceAll('-','.');
  const allArticles=issue.articles.concat(issue.classic?[issue.classic]:[]);
  const toc=`<aside class="toc" aria-label="${tr('本期目录','Contents')}"><p class="small-label">${tr('本期阅读','In this issue')}</p><ol>${allArticles.map(a=>'<li><a href="#'+esc(a.id)+'"><span>'+esc(a.kind)+'</span>'+esc(a.title)+'</a></li>').join('')}<li><a href="#references"><span>${tr('附录','References')}</span>${tr('原始来源','Original sources')}</a></li>${communityConfig||issue.community?'<li><a href="#discussion"><span>'+tr('一起读','Read together')+'</span>'+tr('讨论与点赞','Discussion & likes')+'</a></li>':''}</ol><a class="archive-link" href="${href()}">← ${tr('全部期刊','All issues')}</a></aside>`;
  const hero=`<div class="issue-hero"><div class="eyebrow"><a href="${href()}">${tr('科研日报 / Research Digest','Research Digest')}</a><span>No. ${esc(issue.number)}</span></div><div class="issue-date"><time datetime="${issue.date}">${date}</time><span class="edition">${esc(issue.edition)}</span><span>${minutes(issue.readingMinutes)}</span></div><h1>${esc(issue.title)}</h1><p class="deck">${esc(issue.subtitle)}</p><p class="hero-intro">${esc(issue.intro)}</p><div class="tags">${issue.tags.map(t=>'<span>'+esc(t)+'</span>').join('')}</div></div>`;
  const references=`<section class="references" id="references"><p class="small-label">READ THE ORIGINALS</p><h2>${tr('原始来源','Original sources')}</h2><ol>${issue.sources.map((s,i)=>'<li id="ref-'+(i+1)+'"><a href="'+safeUrl(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' <span aria-hidden="true">↗</span></a></li>').join('')}</ol><details class="coverage"><summary>${tr('检索窗口','Search window')}</summary><p class="window">${esc(issue.window)}</p></details></section>`;
  const jump=issue.classic?`<a class="classic-jump" href="#${esc(issue.classic.id)}"><span>${tr('每日精读','Daily classic')} · ${issue.classic.year}</span>${esc(issue.classic.shortTitle)}<span aria-hidden="true">↓</span></a>`:'';
  const content=`<main id="main"><div class="issue-layout">${toc}<div class="reading-column">${hero}${jump}<div class="articles">${allArticles.map(article).join('')}</div>${references}${communityPanel(issue)}<a class="back-archive" href="${href()}">← ${tr('返回日报归档','Back to all issues')}</a></div></div></main>`;
  return shell(tr('科研日报','Research Digest')+' '+date+' · '+issue.title,'/digest/'+issue.date+'.html',content);
}
function archivePage(issues) {
  const rows=issues.map((i,n)=>`<article class="issue-row"><div class="archive-date"><time datetime="${i.date}">${i.date.replaceAll('-','.')}</time><span>No. ${esc(i.number)}</span></div><div><div class="row-label">${n===0?'<span class="latest-label">'+tr('最新一期','Latest issue')+'</span>':''}<span>${esc(i.edition)}</span></div><h3><a href="${href(i.date+'.html')}">${esc(i.title)} <span aria-hidden="true">↗</span></a></h3><p>${esc(i.subtitle)}</p><div class="row-meta">${i.articles.length+tr(' 条动态',' updates')}${i.classic?tr(' · 1 篇精读',' · 1 classic'):''} · ${minutes(i.readingMinutes)}</div>${i.classic?'<a class="archive-classic" href="'+href(i.date+'.html#'+esc(i.classic.id))+'">'+tr('每日精读','Daily classic')+' · '+esc(i.classic.shortTitle)+' ('+i.classic.year+') →</a>':''}</div></article>`).join('');
  const content=`<main class="archive-main" id="main"><div class="archive-hero"><p class="eyebrow">ZIXUN HUANG / RESEARCH NOTES</p><h1>${tr('科研日报<span>Research Digest</span>','Research Digest<span>Notes on how learning works.</span>')}</h1><p>${tr('用公式梳理机制，用实验校准理解。','Understand mechanisms through equations. Calibrate intuition with experiments.')}</p><div class="tags"><span>Muon</span><span>Scaling laws</span><span>Post-training</span></div></div><section class="archive-list" aria-label="${tr('期刊归档','Issue archive')}"><div class="archive-heading"><h2>${tr('期刊归档','Issue archive')}</h2><span>${issues.length+tr(' 期',issues.length===1?' issue':' issues')}</span></div>${rows}</section><div class="archive-about"><h2>${tr('关于这个栏目','About these notes')}</h2><p>${tr('跟踪关注作者与研究方向的新论文、技术博客及实质更新。每期保留必要背景、关键公式、实验对照和证据边界。另设每日一篇经典精读，涵盖 scaling laws、post-training、深度学习理论、diffusion 与 RNN / linear attention。','New papers, technical blogs, and substantive updates from selected authors and research areas. Each issue includes essential background, equations, experimental comparisons, and the limits of the evidence. One daily classic covers scaling laws, post-training, deep learning theory, diffusion, or RNN / linear attention.')}</p><a href="${href('subscribe.html')}">${tr('邮件订阅','Subscribe by email')} →</a></div></main>`;
  return shell(tr('科研日报 / Research Digest','Research Digest'),'/digest/',content,'archive');
}
function readingRecords(issues) {
  return issues.filter(i=>i.classic).map(i=>({date:i.date,paperId:i.classic.paperId,paper:i.classic.paper,shortTitle:i.classic.shortTitle,year:i.classic.year,topics:i.classic.topics,recognition:i.classic.recognition,source:i.classic.url,url:href(i.date+'.html#'+i.classic.id)}));
}
function readingPage(issues) {
  const records=readingRecords(issues);
  const content=`<main class="archive-main" id="main"><div class="archive-hero"><p class="eyebrow">ONE PAPER A DAY</p><h1>${tr('每日精读<span>Reading the classics</span>','Daily classic<span>Reading the foundations.</span>')}</h1><p>${tr('每天一篇旧作：从动机与背景，到关键公式与可以继续追问的问题。','One earlier work each day: its motivation, background, key equations, and a question to pursue.')}</p><div class="tags"><span>Scaling laws</span><span>Post-training</span><span>Deep learning theory</span><span>Diffusion models</span><span>RNN / Linear attention</span></div></div><section class="archive-list" aria-label="${tr('经典精读归档','Classic reading archive')}"><div class="archive-heading"><h2>${tr('已读论文','Papers read')}</h2><span>${records.length+tr(' 篇',records.length===1?' paper':' papers')}</span></div>${records.map(i=>`<article class="issue-row"><div class="archive-date"><time datetime="${i.date}">${i.date.replaceAll('-','.')}</time><span>${tr('会议 ','Conference ')+i.year}</span></div><div><div class="row-label">${i.topics.map(t=>esc(t)).join(' · ')}</div><h3><a href="${esc(i.url)}">${esc(i.shortTitle)} <span aria-hidden="true">↗</span></a></h3><p>${esc(i.paper)}</p><a class="recognition" href="${safeUrl(i.recognition.url)}" target="_blank" rel="noopener noreferrer">${esc(i.recognition.label)} ↗</a></div></article>`).join('')}</section><div class="archive-about"><p>${tr('优先选择高引用、会议 best paper 或 oral 工作，并给出可核验的入选依据。历史论文与当天新研究分别标注。','Priority goes to highly cited papers, best paper awards, and oral presentations, with verifiable selection evidence. Classics are labeled separately from current research.')}</p><a href="${href()}">← ${tr('日报归档','Issue archive')}</a></div></main>`;
  return shell(tr('每日精读','Daily classic'),'/digest/reading.html',content,'reading');
}

const issues = fs.readdirSync(path.join(out,'issues')).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().map(f=>{
  const data=JSON.parse(fs.readFileSync(path.join(out,'issues',f),'utf8'));
  if(f!==data.date+'.json'||!data.articles?.length||!data.sources?.length) throw new Error('Invalid issue '+f);
  const ids=data.articles.concat(data.classic?[data.classic]:[]).map(a=>a.id);
  if(data.classic&&(!data.classic.paperId||!Number.isInteger(data.classic.year)||!data.classic.recognition?.url||!data.classic.blocks?.length)) throw new Error('Invalid classic reading');
  if(new Set(ids).size!==ids.length||ids.some(id=>!/^[a-z][a-z0-9-]*$/.test(id))) throw new Error('Invalid article IDs');
  return data;
});
if(!issues.length) throw new Error('No issues');
// Fail before writing any pages when an issue or its translation is incomplete.
const englishIssues=issues.map(i=>validateTranslation(i,JSON.parse(fs.readFileSync(path.join(out,'issues','en',i.date+'.json'),'utf8'))));
const newest=issues[0];
giscus.writeThemes(root);
fs.mkdirSync(path.join(out,'assets','katex'),{recursive:true});
const kd=path.dirname(require.resolve('katex'));
fs.copyFileSync(path.join(kd,'katex.min.css'),path.join(out,'assets/katex/katex.min.css'));
fs.cpSync(path.join(kd,'fonts'),path.join(out,'assets/katex/fonts'),{recursive:true});
fs.copyFileSync(path.join(kd,'../LICENSE'),path.join(out,'assets/katex/LICENSE'));

for(const code of languages) {
  language=code;
  const localized=code==='en'?englishIssues:issues;
  const directory=code==='en'?path.join(out,'en'):out;
  const mailDirectory=path.join(out,'mail',code==='en'?'en':'');
  fs.mkdirSync(directory,{recursive:true});
  fs.mkdirSync(mailDirectory,{recursive:true});
  for(const issue of localized) {
    fs.writeFileSync(path.join(directory,issue.date+'.html'),issuePage(issue));
    fs.writeFileSync(path.join(mailDirectory,issue.date+'.html'),newsletter.email(newsletterConfig,issue,code));
    fs.writeFileSync(path.join(mailDirectory,issue.date+'.txt'),newsletter.plainText(newsletterConfig,issue,code));
    console.log('Rendered '+issue.date+' ['+code+']: '+issue.articles.length+' updates, '+(issue.classic?1:0)+' classic, '+equations+' display equations');
  }
  fs.writeFileSync(path.join(directory,'index.html'),archivePage(localized));
  fs.writeFileSync(path.join(directory,'reading.html'),readingPage(localized));
  fs.writeFileSync(path.join(directory,'subscribe.html'),shell(tr('订阅科研日报','Subscribe to Research Digest'),'/digest/subscribe.html',newsletter.page(newsletterConfig,localized[0],code),'subscribe'));
}
language='zh-CN';
fs.writeFileSync(path.join(out,'reading-log.json'),JSON.stringify(readingRecords(issues),null,2)+'\n');
const timestamp=i=>{if(!i.publishedAt||Number.isNaN(Date.parse(i.publishedAt)))throw new Error('Missing valid publishedAt');return esc(i.publishedAt);};
const feed='<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><title>Research Digest · Zixun Huang</title><id>'+origin+'/digest/</id><link href="'+origin+'/digest/"/><link rel="self" href="'+origin+'/digest/feed.xml"/><updated>'+timestamp(newest)+'</updated><author><name>Zixun Huang</name></author>'+issues.map(i=>'<entry><title>'+esc(i.title)+'</title><id>'+origin+'/digest/'+i.date+'.html</id><link href="'+origin+'/digest/'+i.date+'.html"/><updated>'+timestamp(i)+'</updated><summary>'+esc(i.subtitle)+'</summary></entry>').join('')+'</feed>\n';
fs.writeFileSync(path.join(out,'feed.xml'),feed);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({timezone:'America/New_York',languages,latest:newest.date,issues:issues.map((i,n)=>({date:i.date,title:i.title,url:'/digest/'+i.date+'.html',translations:{en:{title:englishIssues[n].title,url:'/digest/en/'+i.date+'.html'}},sources:i.sources.map(s=>s.url)}))},null,2)+'\n');

const homeFile=path.join(root,'index.html');
let home=fs.readFileSync(homeFile,'utf8');
const start='<!-- research-digest-latest:start -->',end='<!-- research-digest-latest:end -->';
const teaser=start+'\n      <section id="research-digest">\n        <h2>Research Digest</h2>\n        <div class="card">\n          <p><a href="./digest/'+newest.date+'.html"><strong>'+esc(newest.title)+'</strong></a> <span class="muted">· '+newest.date+'</span></p>\n          <p>'+esc(newest.subtitle)+'</p>\n          <p><a href="./digest/'+newest.date+'.html" lang="zh-CN">中文</a> · <a href="./digest/en/'+newest.date+'.html" lang="en">Read in English →</a> · <a href="./digest/">Browse all issues →</a></p>\n        </div>\n      </section>\n      '+end;
if(home.includes(start)&&home.includes(end)) {
  const a=home.indexOf(start),b=home.indexOf(end)+end.length;
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
console.log('Updated both language editions, email bodies, archives, feed, manifest, and homepage.');
