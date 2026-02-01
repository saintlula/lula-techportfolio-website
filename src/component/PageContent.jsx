/**
 * PageContent.jsx — Terminal-style content panel for About / Resume / Cover pages
 *
 * When the user has clicked one of the three labels (ABOUT, RESUME, COVER) and
 * the zoom has settled, this component shows a centered panel that looks like
 * a small terminal window: title bar with dots + label (e.g. "ABOUT.txt"),
 * scanline overlay, and lines of "prompt" and "output" text with a blinking
 * cursor at the end.
 *
 * Props:
 * - page: 'about' | 'resume' | 'cover' — which set of lines to show
 * - isReturning: true when the user has clicked "Return"; we add a class so
 *   the panel slides right and fades out (1.1s) in sync with the header and
 *   zoom-back
 *
 * Content is defined in ABOUT_LINES, RESUME_LINES, COVER_LINES. Each line has
 * type: 'prompt' | 'output' | 'dir' and text. Edit those arrays to change
 * what appears on each page.
 */

import React, { memo } from 'react';
import './PageContent.css';

/* Lines shown on the About page. type 'prompt' = terminal prompt (e.g. "> whoami"); 'output' = response text. */
const ABOUT_LINES = [
  { type: 'prompt', text: '> About me!' },
  { type: 'output', text: 'Lula - Junior software engineer' }
];

/* Lines shown on the Resume page. */
const RESUME_LINES = [
  { type: 'prompt', text: '> Resume' },
  { type: 'output', text: 'Here I will be adding my resume in text' },
  { type: 'prompt', text: '> Resume.doc' },
  { type: 'output', text: 'You can download and view my resume from the link below!' },
  { type: 'output', text: 'link' }
];

/* Lines shown on the Cover page. */
const COVER_LINES = [
  { type: 'prompt', text: '> Cover' },
  { type: 'output', text: 'More information about me and my tech stack/skills' },
  { type: 'prompt', text: '> You can download and view my resume from the link below!' },
  { type: 'output', text: 'link' }
];

/**
 * Renders a single line with the correct class: prompt (green), output (lighter green), or dir (directory listing style).
 */
function TerminalLine({ line }) {
  const className = line.type === 'prompt' ? 'page-content__line page-content__line--prompt' :
    line.type === 'dir' ? 'page-content__line page-content__line--dir' :
    'page-content__line page-content__line--output';
  return <div className={className}>{line.text}</div>;
}

const PageContent = memo(function PageContent({ page, isReturning }) {
  const lines = page === 'about' ? ABOUT_LINES : page === 'resume' ? RESUME_LINES : COVER_LINES;
  const title = page === 'about' ? 'ABOUT' : page === 'resume' ? 'RESUME' : 'COVER';

  return (
    <div
      className={`page-content ${isReturning ? 'page-content--returning' : ''}`}
      aria-label={`${title} page content`}
    >
      <div className="page-content__panel">
        {/* Fake title bar: three dots + label (e.g. "ABOUT.txt") like a small terminal window */}
        <div className="page-content__title-bar">
          <span className="page-content__title-dot" />
          <span className="page-content__title-dot" />
          <span className="page-content__title-dot" />
          <span className="page-content__title-label">{title}.txt</span>
        </div>
        {/* Subtle horizontal scanline overlay for CRT feel */}
        <div className="page-content__scanline" aria-hidden="true" />
        <div className="page-content__body">
          {lines.map((line, i) => (
            <TerminalLine key={i} line={line} />
          ))}
          {/* Blinking cursor at end of "output" */}
          <span className="page-content__cursor" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
});

export default PageContent;
