# Research Digest

The homepage and GitHub Pages serve the committed HTML directly. No runtime API key, CDN, or server is required to read an issue.

## Add an issue

1. Add one JSON file to `digest/issues/YYYY-MM-DD.json`, following the first issue's block structure. Keep current research in `articles` and exactly one historical paper in `classic`.
2. Read `digest/reading-log.json` before selecting the classic. Verify high citation impact or conference recognition from a reliable source; preserve the original year and link the recognition evidence. Rotate across scaling laws, post-training, deep learning theory, diffusion, and RNN / linear attention. Do not count historical reading as news.
3. Search the repository for an existing discussion issue with this report date before creating one through the authorized GitHub connector. Use a neutral invitation to discuss the report; do not assign or mention other people. Store its actual `issueNumber` (and optional numeric `issueId`) in `community`, with provider `github-issues` and repository `alexhuang13/alexhuang13.github.io`.
4. Run `npm ci --prefix tools/digest` and `node tools/digest/build.cjs` from the repository root.
5. Review and commit the issue JSON, generated HTML, archive, reading archive/log, feed, and changed assets. The builder also refreshes the latest-issue link on the homepage. Publish against the current remote head without force pushing.

The JSON supports text, equations, tables, notes, and source links. Plain text is escaped; inline math uses `\\(...\\)`. Sources must be HTTPS links. Formula rendering fails the build on invalid TeX. KaTeX HTML and MathML are generated in advance, with locally bundled fonts.

Dates and report windows use America/New_York. Preserve original publication dates, distinguish versions from new papers, and label abstract-only evidence. Keep retrieval coverage notes out of the published article. Do not treat a local mathematical illustration as a paper's theorem.

The discussion panel reads real public GitHub comments and the issue's thumbs-up reaction count. Comments are displayed as plain text, with links to the original Markdown discussion. Posting and reacting happen on GitHub after the reader signs in; the page does not pretend to submit a comment or a like locally. Reading is anonymous, cached briefly per tab, and loaded when the panel approaches the viewport. API errors retain the direct discussion link. No credentials belong in frontend code.

Publishing a new issue and generating its research content are separate operations. The existing ChatGPT daily research task produces the content and publishes through its GitHub connection. This repository contains the static renderer, not an unattended research model or credentials.
