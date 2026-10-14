# Research Digest

The homepage and GitHub Pages serve the committed HTML directly. No runtime API key, CDN, or server is required to read an issue.

## Add an issue

1. Add one JSON file to `digest/issues/YYYY-MM-DD.json`, following the first issue's block structure.
2. Run `npm ci --prefix tools/digest` and `node tools/digest/build.cjs` from the repository root.
3. Review and commit the issue JSON, generated HTML, archive, feed, and any changed assets. The builder also refreshes the latest-issue link on the homepage.

The JSON supports text, equations, tables, notes, and source links. Plain text is escaped; inline math uses `\\(...\\)`. Sources must be HTTPS links. Formula rendering fails the build on invalid TeX. KaTeX HTML and MathML are generated in advance, with locally bundled fonts.

Dates and report windows use America/New_York. Preserve original publication dates, distinguish versions from new papers, and label abstract-only evidence. Keep retrieval coverage notes out of the published article. Do not treat a local mathematical illustration as a paper's theorem.

Publishing a new issue and generating its research content are separate operations. The existing ChatGPT daily research task remains the content producer; its GitHub publishing destination must be connected explicitly. This repository does not contain an unattended research generator or credentials.
