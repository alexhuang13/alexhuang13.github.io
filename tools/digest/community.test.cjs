const test = require('node:test');
const assert = require('node:assert/strict');
const core = import('../../digest/assets/community.mjs');

test('discussion URL validation rejects traversal and invalid issue numbers', async () => {
  const {discussionUrls} = await core;
  assert.equal(discussionUrls('alexhuang13/alexhuang13.github.io', 1).web, 'https://github.com/alexhuang13/alexhuang13.github.io/issues/1');
  for (const repo of ['../other', 'owner/..', 'owner/repo?token=x', 'owner/repo/extra']) assert.throws(() => discussionUrls(repo, 1));
  for (const n of [0, -1, 1.5, NaN]) assert.throws(() => discussionUrls('owner/repo', n));
});

test('API errors and missing reaction counts are never displayed as zero likes', async () => {
  const {normalizeIssue} = await core;
  assert.throws(() => normalizeIssue({message:'API rate limit exceeded'}, 1));
  assert.throws(() => normalizeIssue({number:1,comments:0}, 1));
  assert.throws(() => normalizeIssue({number:2,comments:0,reactions:{'+1':4}}, 1));
  assert.deepEqual(normalizeIssue({number:1,comments:2,reactions:{'+1':7},locked:true},1), {comments:2,likes:7,locked:true});
});

test('comment links must point to that exact public issue and comment', async () => {
  const {normalizeComment} = await core;
  const issue='https://github.com/alexhuang13/alexhuang13.github.io/issues/1';
  const comment={id:10,body:'A useful question',user:{login:'reader'},html_url:issue+'#issuecomment-10',created_at:'2026-10-14T19:00:00Z'};
  assert.equal(normalizeComment(comment,issue).url, comment.html_url);
  for (const url of ['javascript:alert(1)','https://evil.example/issues/1#issuecomment-10',issue+'#issuecomment-11',issue+'?redirect=evil#issuecomment-10']) assert.throws(() => normalizeComment({...comment,html_url:url},issue));
  assert.throws(() => normalizeComment({...comment,created_at:'invalid'},issue));
});

test('untrusted comment markup stays literal text', async () => {
  const {normalizeComment} = await core;
  const issue='https://github.com/alexhuang13/alexhuang13.github.io/issues/1';
  const body='<img src=x onerror=alert(1)>\n<script>bad()</script>';
  assert.equal(normalizeComment({id:12,body,user:{login:'reader'},html_url:issue+'#issuecomment-12',created_at:'2026-10-14T19:00:00Z'},issue).body,body);
  const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../digest/assets/community.mjs'),'utf8');
  assert.doesNotMatch(source,/innerHTML|insertAdjacentHTML|document\.write/);
});
