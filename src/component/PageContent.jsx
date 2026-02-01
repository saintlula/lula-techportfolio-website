import React from 'react';
import './PageContent.css';

const ABOUT_LINES = [
  { type: 'prompt', text: '> About me!' },
  { type: 'output', text: 'Lula - Junior software engineer' }
];

const RESUME_LINES = [
  { type: 'prompt', text: '> Resume' },
  { type: 'output', text: 'Here I will be adding my resume in text' },
  { type: 'prompt', text: '> Resume.doc' },
  { type: 'output', text: 'You can download and view my resume from the link below!' },
  { type: 'output', text: 'link' }
];

const COVER_LINES = [
  { type: 'prompt', text: '> Cover' },
  { type: 'output', text: 'More information about me and my tech stack/skills' },
  { type: 'prompt', text: '> You can download and view my resume from the link below!' },
  { type: 'output', text: 'link' }
];

function TerminalLine({ line }) {
  const className = line.type === 'prompt' ? 'page-content__line page-content__line--prompt' :
    line.type === 'dir' ? 'page-content__line page-content__line--dir' :
    'page-content__line page-content__line--output';
  return <div className={className}>{line.text}</div>;
}

function PageContent({ page, isReturning }) {
  const lines = page === 'about' ? ABOUT_LINES : page === 'resume' ? RESUME_LINES : COVER_LINES;
  const title = page === 'about' ? 'ABOUT' : page === 'resume' ? 'RESUME' : 'COVER';

  return (
    <div
      className={`page-content ${isReturning ? 'page-content--returning' : ''}`}
      aria-label={`${title} page content`}
    >
      <div className="page-content__panel">
        <div className="page-content__title-bar">
          <span className="page-content__title-dot" />
          <span className="page-content__title-dot" />
          <span className="page-content__title-dot" />
          <span className="page-content__title-label">{title}.txt</span>
        </div>
        <div className="page-content__scanline" aria-hidden="true" />
        <div className="page-content__body">
          {lines.map((line, i) => (
            <TerminalLine key={i} line={line} />
          ))}
          <span className="page-content__cursor" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export default PageContent;
