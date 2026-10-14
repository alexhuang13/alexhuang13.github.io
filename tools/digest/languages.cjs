const assert = require('node:assert/strict');

const languages = ['zh-CN', 'en'];
const base = language => language === 'en' ? '/digest/en/' : '/digest/';
const url = (canonical, language) => canonical.replace(/^\/digest\//, base(language));

// A translation can change prose, including words inside \text{}, but must
// preserve the mathematics, citations, source URLs and discussion identity.
const mathContent = value => String(value).replace(/\\text\{[^{}]*\}/g, '\\text{}');
function evidence(block) {
  const prose = [block.text, block.caption, ...(block.headers || []), ...(block.rows || []).flat()].filter(Boolean).join('\n');
  return {
    type: block.type,
    equation: block.tex && mathContent(block.tex),
    inline: [...prose.matchAll(/\\\(([\s\S]*?)\\\)/g)].map(m => mathContent(m[1])),
    citations: [...prose.matchAll(/\[(\d+(?:,\s*\d+)*)\]/g)].map(m => m[1]),
    tableShape: block.rows && [block.headers.length, ...block.rows.map(row => row.length)]
  };
}

function validateTranslation(original, translated) {
  for (const key of ['date', 'number', 'publishedAt', 'community']) {
    assert.deepEqual(translated[key], original[key], 'Translation changed ' + key);
  }
  assert.deepEqual(translated.sources.map(s => s.url), original.sources.map(s => s.url), 'Translation changed sources');
  assert.equal(!!translated.classic, !!original.classic, 'Missing translated classic');
  assert.equal(translated.articles.length, original.articles.length, 'Missing translated research');
  const all = issue => [...issue.articles, ...(issue.classic ? [issue.classic] : [])];
  all(original).forEach((article, index) => {
    const target = all(translated)[index];
    for (const key of ['id', 'paperId', 'year', 'paper', 'url']) {
      assert.equal(target[key], article[key], 'Translation changed ' + article.id + '.' + key);
    }
    assert.equal(target.recognition?.url, article.recognition?.url, 'Translation changed recognition source');
    assert.deepEqual(target.blocks.map(evidence), article.blocks.map(evidence), 'Translation changed mathematical or citation content in ' + article.id);
    assert.ok(target.title && target.evidence && target.blocks.length, 'Incomplete translation');
  });
  // The stable Chinese discussion mapping is intentionally shared by languages.
  const {community, ...readable} = translated;
  assert.ok(!/\p{Script=Han}/u.test(JSON.stringify(readable)), 'Untranslated Chinese in English issue');
  return translated;
}

module.exports = {languages, base, url, validateTranslation};
