const fs = require('node:fs');
const path = require('node:path');
const origin = 'https://alexhuang13.github.io';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function readConfig(root) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'digest/newsletter.json'), 'utf8'));
  const validAddress = address => address === null || (typeof address === 'string'
    && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(address));
  if (config.method !== 'email-request' || typeof config.enabled !== 'boolean'
      || !validAddress(config.address) || !validAddress(config.sender)
      || (config.enabled && (!config.address || !config.sender))
      || [config.subscribeSubject, config.unsubscribeSubject].some(s => typeof s !== 'string' || !s.trim() || /[\r\n]/.test(s))) {
    throw new Error('Invalid newsletter configuration');
  }
  return config;
}

function mailto(config, unsubscribe = false, language = 'zh-CN') {
  const prefix = language === 'en' ? '/digest/en/' : '/digest/';
  if (!config.address) return origin + prefix + 'subscribe.html#subscription-status';
  const subject = unsubscribe ? config.unsubscribeSubject : config.subscribeSubject;
  const body = language === 'en'
    ? (unsubscribe ? 'Please stop sending Research Digest to the sender of this email.' : 'I would like to subscribe to Research Digest (one email per issue) using the sender address of this email. Please send me a subscription confirmation.')
    : (unsubscribe ? '请停止向本邮件的发件地址发送科研日报。' : '我希望通过本邮件的发件地址订阅科研日报（每期一封），请发送订阅确认邮件。');
  return 'mailto:' + config.address + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function page(config, latest, language = 'zh-CN') {
  const tr = (zh,en) => language === 'en' ? en : zh;
  const prefix = language === 'en' ? '/digest/en/' : '/digest/';
  const state = config.enabled
    ? '<p class="subscription-state">'+tr('发送申请，回复确认邮件中的“确认”。完成一次确认后，新一期发布时自动送达。','Send a request, then reply “confirm” to the confirmation email. After this one-time confirmation, new issues arrive automatically.')+'</p>'
    : '<p class="subscription-state" id="subscription-status">'+tr('邮件订阅准备中，暂未开放。开通后将由专用系统邮箱发送，并提供确认与退订入口。','Email subscriptions are not open yet. Once enabled, a dedicated address will send issues with confirmation and unsubscribe options.')+'</p>';
  const signup = config.enabled ? '<h2 id="subscribe-heading">'+tr('从你的邮箱发起订阅','Subscribe from your email address')+'</h2>'+state
    + '<a class="subscription-button" href="'+esc(mailto(config,false,language))+'">'+tr('发送订阅申请','Send subscription request')+' ↗</a>'
    + '<p class="subscription-hint">'+tr('按钮会打开邮件应用；请从希望接收日报的邮箱发送这封邮件。','This button opens your email app. Send the message from the address where you want to receive the digest.')+'</p><p class="subscription-hint">'+tr('日报发件人：','Sent by: ')+esc(config.sender)+'</p>'
    + '<details class="subscription-manual"><summary>'+tr('使用网页版邮箱？','Using webmail?')+'</summary><p>'+tr('新建邮件发送到 ','Send a new email to ')+esc(config.address)+tr('，主题填写 ',' with the subject ')+esc(config.subscribeSubject)+tr('。','.')+'</p></details>'
    : '<h2 id="subscribe-heading">'+tr('在邮箱里读新一期','Read new issues in your inbox')+'</h2>'+state;
  return '<main class="archive-main subscription-main" id="main"><div class="archive-hero"><p class="eyebrow">RESEARCH, IN YOUR INBOX</p><h1>'+tr('邮件订阅','Email subscription')+'<span>A daily note for curious minds.</span></h1><p>'+tr('研究动态，一篇经典精读。每期一封，送到邮箱。','Research updates and one classic. One email per issue.')+'</p></div>'
    + '<section class="subscription-card" aria-labelledby="subscribe-heading"><p class="small-label">EMAIL EDITION</p>'+signup+'</section>'
    + '<section class="subscription-faq"><h2>'+tr('邮件里有什么？','What is in the email?')+'</h2><p>'+tr('当期研究条目、每日精读和中英文正文链接。完整公式、实验表格与讨论区保留在网页中。','Current research, the daily classic, and links to the full issue in Chinese and English. Equations, experimental tables, and discussion live on the website.')+'</p>'
    + '<h2 id="unsubscribe">'+tr('如何确认与退订？','How do confirmation and unsubscribe work?')+'</h2><p>'+tr('完成邮箱确认才会收到日报。每封日报附带退订入口；也可向订阅管理邮箱发送主题为 ','Delivery starts after you confirm your address. Every issue includes an unsubscribe link. You can also email the subscription address with the subject ')+'<code>'+esc(config.unsubscribeSubject)+'</code>'+tr(' 的邮件。','.')+'</p>'
    + (config.enabled?'<p><a href="'+esc(mailto(config,true,language))+'">'+tr('发送退订申请','Send unsubscribe request')+' →</a></p>':'')
    + '<h2>'+tr('邮箱会公开吗？','Will my email address be public?')+'</h2><p>'+tr('订阅地址仅用于确认、投递与退订，不会出现在网页或公开仓库中。','Your address is used only for confirmation, delivery, and unsubscribe. It does not appear on the website or in the public repository.')+'</p>'
    + '<a class="subscription-read" href="'+prefix+latest.date+'.html">'+tr('阅读最新一期','Read the latest issue')+' · '+latest.date+' →</a></section><a class="back-archive" href="'+prefix+'">← '+tr('返回日报归档','Back to all issues')+'</a></main>';
}

function email(config, issue, language = 'zh-CN') {
  const tr = (zh,en) => language === 'en' ? en : zh;
  const prefix = language === 'en' ? '/digest/en/' : '/digest/';
  const url = origin + prefix + issue.date + '.html';
  const link = (href, text) => '<a style="color:#1c5cab;text-decoration:none" href="'+esc(href)+'">'+esc(text)+'</a>';
  const items = issue.articles.map(a=>'<p style="margin:0 0 19px"><span style="font-size:11px;color:#6f6a61">'+esc(a.kind)+'</span><br>'
    +link(url+'#'+a.id,a.title)+'<br><span style="font-size:12px;color:#6f6a61">'+esc(a.paper)+'</span></p>').join('');
  const classic = issue.classic?'<div style="border-top:1px solid #e6e2d8;padding-top:22px;margin-top:24px"><p style="font-size:11px;color:#6f6a61">'+tr('每日精读','Daily classic')+' · '+issue.classic.year+'</p><p>'+link(url+'#'+issue.classic.id,issue.classic.title)+'</p></div>':'';
  return '<!doctype html><html lang="'+language+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+tr('科研日报','Research Digest')+' · '+issue.date+'</title></head>'
    + '<body style="margin:0;background:#faf9f6;color:#201d18;font-family:Arial,Microsoft YaHei,sans-serif;line-height:1.7"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px"><tr><td>'
    + '<p style="font-size:11px;letter-spacing:1px;color:#6f6a61">RESEARCH DIGEST / '+issue.date+'</p><p style="font-size:12px">'+link(origin+'/digest/'+issue.date+'.html','中文')+' · '+link(origin+'/digest/en/'+issue.date+'.html','Read in English')+'</p><h1 style="font-family:Georgia,serif;font-size:28px;font-weight:normal;line-height:1.4">'+esc(issue.title)+'</h1><p style="color:#6f6a61;font-size:14px">'+esc(issue.subtitle)+'</p><div style="border-top:1px solid #e6e2d8;margin-top:26px;padding-top:24px">'+items+'</div>'+classic
    + '<p style="margin:30px 0">'+link(url,tr('阅读全文与公式 →','Read the full issue and equations →'))+'</p><p style="border-top:1px solid #e6e2d8;padding-top:18px;font-size:11px;color:#6f6a61">Zixun Huang · '+tr('每期一封','One email per issue')+'<br>'+link(mailto(config,true,language),tr('退订邮件','Unsubscribe'))+' · '+link(origin+prefix,tr('往期归档','Past issues'))+'</p></td></tr></table></td></tr></table></body></html>\n';
}

function plainText(config, issue, language = 'zh-CN') {
  const tr = (zh,en) => language === 'en' ? en : zh;
  const prefix = language === 'en' ? '/digest/en/' : '/digest/';
  const url = origin+prefix+issue.date+'.html';
  const parts=['RESEARCH DIGEST / '+issue.date,issue.title,issue.subtitle,'','中文: '+origin+'/digest/'+issue.date+'.html','Read in English: '+origin+'/digest/en/'+issue.date+'.html',''];
  for(const a of issue.articles) parts.push(a.kind,a.title,a.paper,url+'#'+a.id,'');
  if(issue.classic) parts.push(tr('每日精读','Daily classic')+' · '+issue.classic.year,issue.classic.title,url+'#'+issue.classic.id,'');
  parts.push(tr('阅读全文与公式：','Read the full issue and equations: ')+url,'','Zixun Huang · '+tr('每期一封','One email per issue'),
    tr('退订邮件：','Unsubscribe: ')+mailto(config,true,language),tr('往期归档：','Past issues: ')+origin+prefix);
  return parts.join('\n')+'\n';
}

module.exports={readConfig,mailto,page,email,plainText};
