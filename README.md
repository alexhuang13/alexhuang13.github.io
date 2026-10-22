# alexhuang13.github.io
Official personal homepage of Zixun Huang.

## Homepage theme

Keep the sun/moon switch at the right edge of the homepage navigation, with the navigation links scrolling independently on narrow screens. The homepage follows the system color scheme until the reader chooses a theme. It shares the existing `digest-theme` preference with the research digest, restores that choice before first paint, and updates the shared glow automatically. Preserve the dark palette, keyboard-accessible switch, and light print palette when updating the homepage.

## Homepage background music

The musical-note button immediately before the theme switch plays and pauses
"Conformal, Cover Me" from the owner's Suno share:
https://suno.com/s/EQ3BGiiYimq5JxUD. The HTML audio element plays the AAC audio
track of the public MP4 supplied by that song page, loops at 18% volume, and
does not preload or start until the reader presses the button. The popover
links to the original song and provides a fallback if streaming fails.
`assets/background-music.css` and `.js` implement the control; keep it
keyboard accessible and preserve the independent scrolling of navigation links.

## Shared interaction style

The owner wants soft lighting throughout the personal website: a small, localized glow follows the finger or mouse, slightly brightens the nearby surface, and fades on departure. Preserve this across the homepage, project pages, applications, and both language editions of the research digest. Keep the effect subtle and behind readable content, without changing scrolling, selection, links, form controls, or existing layouts. Honor reduced-motion and forced-colors preferences; hide it when printing.

`digest/assets/reading-light.css` and `.js` are the shared implementation. They support the site's `data-theme` setting, FlowSD's dark class, and applications declaring a dark color scheme. Surface highlighting also handles dynamically created panels, preserving positioned elements and existing decorations.

After adding or rebuilding any HTML page, run `node tools/site/reading-light.cjs` before publishing. It updates content-hashed asset links on all web pages, including newly added ones. It excludes the CV's PDF redirect and email bodies. `node tools/digest/build.cjs` runs this site-wide step automatically. Do not fork the effect into separate page-specific copies.

