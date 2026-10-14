const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

// Apply the owner's site-wide interaction to every real web page. Email
// bodies and the CV-to-PDF redirect are not interactive website documents.
function applyReadingLight(root) {
  const asset = name => {
    const file = 'digest/assets/reading-light.' + name;
    const hash = createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 12);
    return '/' + file + '?v=' + hash;
  };
  const head = '  <!-- reading-light:start -->\n'
    + '  <link rel="stylesheet" href="' + asset('css') + '">\n'
    + '  <script defer src="' + asset('js') + '"></script>\n'
    + '  <!-- reading-light:end -->\n';
  const pages = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const file = path.join(directory, entry.name);
      const relative = path.relative(root, file).split(path.sep).join('/');
      if (relative === 'digest/mail' || relative === 'CV4job/index.html') continue;
      if (entry.isDirectory()) { visit(file); continue; }
      if (!entry.isFile() || !/\.html?$/i.test(entry.name)) continue;
      const original = fs.readFileSync(file, 'utf8');
      if (!/<\/head>/i.test(original) || !/<body\b/i.test(original)) continue;
      let html = original.replace(/^[ \t]*<!-- reading-light:start -->[\s\S]*?<!-- reading-light:end -->\r?\n?/gm, '');
      // Upgrade earlier digest pages which included the same assets directly.
      html = html.replace(/^[ \t]*<link\b[^>]*href=["']\/digest\/assets\/reading-light\.css(?:\?[^"']*)?["'][^>]*>\r?\n?/gm, '')
        .replace(/^[ \t]*<script\b[^>]*src=["']\/digest\/assets\/reading-light\.js(?:\?[^"']*)?["'][^>]*><\/script>\r?\n?/gm, '');
      html = html.replace(/<\/head>/i, head + '</head>');
      if (html !== original) fs.writeFileSync(file, html);
      pages.push(relative);
    }
  }
  visit(root);
  return pages;
}

if (require.main === module) {
  const pages = applyReadingLight(path.resolve(__dirname, '../..'));
  console.log('Applied shared soft lighting to ' + pages.length + ' website pages.');
}
module.exports = {applyReadingLight};
