# alexhuang13.github.io
Official personal homepage of Zixun Huang.

## Shared interaction style

The owner wants soft lighting throughout the personal website: a small, localized glow follows the finger or mouse, slightly brightens the nearby surface, and fades on departure. Preserve this across the homepage, project pages, applications, and both language editions of the research digest. Keep the effect subtle and behind readable content, without changing scrolling, selection, links, form controls, or existing layouts. Honor reduced-motion and forced-colors preferences; hide it when printing.

`digest/assets/reading-light.css` and `.js` are the shared implementation. They support the site's `data-theme` setting, FlowSD's dark class, and applications declaring a dark color scheme. Surface highlighting also handles dynamically created panels, preserving positioned elements and existing decorations.

After adding or rebuilding any HTML page, run `node tools/site/reading-light.cjs` before publishing. It updates content-hashed asset links on all web pages, including newly added ones. It excludes the CV's PDF redirect and email bodies. `node tools/digest/build.cjs` runs this site-wide step automatically. Do not fork the effect into separate page-specific copies.
