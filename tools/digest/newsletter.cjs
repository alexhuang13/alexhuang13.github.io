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

function mailto(config, unsubscribe = false) {
  if (!config.address) return origin + '/digest/subscribe.html#subscription-status';
  const subject = unsubscribe ? config.unsubscribeSubject : config.subscribeSubject;
  const body = unsubscribe ? '请停止向本邮件的发件地址发送科研日报。' : '我希望通过本邮件的发件地址订阅科研日报（每期一封），请发送订阅确认邮件。';
  return 'mailto:' + config.address + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function page(config, latest) {
  const state = config.enabled
    ? '<p class="subscription-state">发送申请后，请按确认邮件中的说明完成订阅。</p>'
    : '<p class="subscription-state" id="subscription-status">邮件订阅准备中，暂未开放。开通后将由专用系统邮箱发送，并提供确认与退订入口。</p>';
  const signup = config.enabled ? '<h2 id="subscribe-heading">从你的邮箱发起订阅</h2>' + state
    + '<a class="subscription-button" href="' + esc(mailto(config)) + '">发送订阅申请 ↗</a>'
    + '<p class="subscription-hint">按钮会打开邮件应用；请从希望接收日报的邮箱发送这封邮件。</p>'
    + '<details class="subscription-manual"><summary>使用网页版邮箱？</summary><p>新建邮件发送到 ' + esc(config.address) + '，主题填写 ' + esc(config.subscribeSubject) + '。</p></details>'
    : '<h2 id="subscribe-heading">在邮箱里读新一期</h2>' + state;
  return '<main class="archive-main subscription-main" id="main"><div class="archive-hero"><p class="eyebrow">RESEARCH, IN YOUR INBOX</p><h1>邮件订阅<span>A daily note for curious minds.</span></h1><p>研究动态，一篇经典精读。每期一封，送到邮箱。</p></div>'
    + '<section class="subscription-card" aria-labelledby="subscribe-heading"><p class="small-label">EMAIL EDITION</p>' + signup + '</section>'
    + '<section class="subscription-faq"><h2>邮件里有什么？</h2><p>当期研究条目、每日精读和正文链接。完整公式、实验表格与讨论区保留在网页中。</p>'
    + '<h2>如何确认与退订？</h2><p>开放订阅后，需完成邮箱确认才会收到日报。每封日报附带退订入口；也可向订阅管理邮箱发送主题为 <code>' + esc(config.unsubscribeSubject) + '</code> 的邮件。</p>'
    + '<h2>邮箱会公开吗？</h2><p>订阅地址仅用于确认、投递与退订，不会出现在网页或公开仓库中。</p>'
    + '<a class="subscription-read" href="/digest/' + latest.date + '.html">阅读最新一期 · ' + latest.date + ' →</a></section><a class="back-archive" href="/digest/">← 返回日报归档</a></main>';
}

function email(config, issue) {
  const url = origin + '/digest/' + issue.date + '.html';
  const link = (href, text) => '<a style="color:#1c5cab;text-decoration:none" href="' + esc(href) + '">' + esc(text) + '</a>';
  const items = issue.articles.map(a => '<p style="margin:0 0 19px"><span style="font-size:11px;color:#6f6a61">' + esc(a.kind) + '</span><br>'
    + link(url + '#' + a.id, a.title) + '<br><span style="font-size:12px;color:#6f6a61">' + esc(a.paper) + '</span></p>').join('');
  const classic = issue.classic ? '<div style="border-top:1px solid #e6e2d8;padding-top:22px;margin-top:24px"><p style="font-size:11px;color:#6f6a61">每日精读 · ' + issue.classic.year + '</p><p>' + link(url + '#' + issue.classic.id, issue.classic.title) + '</p></div>' : '';
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>科研日报 · ' + issue.date + '</title></head>'
    + '<body style="margin:0;background:#faf9f6;color:#201d18;font-family:Arial,Microsoft YaHei,sans-serif;line-height:1.7"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px"><tr><td>'
    + '<p style="font-size:11px;letter-spacing:1px;color:#6f6a61">RESEARCH DIGEST / ' + issue.date + '</p><h1 style="font-family:Georgia,serif;font-size:28px;font-weight:normal;line-height:1.4">' + esc(issue.title) + '</h1><p style="color:#6f6a61;font-size:14px">' + esc(issue.subtitle) + '</p><div style="border-top:1px solid #e6e2d8;margin-top:26px;padding-top:24px">' + items + '</div>' + classic
    + '<p style="margin:30px 0">' + link(url, '阅读全文与公式 →') + '</p><p style="border-top:1px solid #e6e2d8;padding-top:18px;font-size:11px;color:#6f6a61">Zixun Huang · 每期一封<br>' + link(mailto(config, true), '退订邮件') + ' · ' + link(origin + '/digest/', '往期归档') + '</p></td></tr></table></td></tr></table></body></html>\n';
}

module.exports = {readConfig, mailto, page, email};
