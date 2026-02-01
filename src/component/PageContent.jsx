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

import React, { memo, forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import './PageContent.css';

/* Lines shown on the About page. type 'prompt' = terminal prompt; 'output' = response text. */
const ABOUT_LINES = [
  { type: 'prompt', text: '> About me and this webapp' },
  { type: 'output', text: "First of all, thank you for taking the time to visit my website! My name is Ehlinaz, though I often go by Lula. I'm a recent university graduate with a background in software engineering and a genuine passion for building things." },
  { type: 'output', text: '' },
  { type: 'output', text: "I created this site for a few reasons. First, because I believe portfolios should be more than a list of skills on a page. Anyone can say they can code and in the competitive job market I wanted to show it. Second, I wanted to make the hiring process more interesting, both for myself and for the people reviewing my work. I think that while resumes and cover letters are useful, they don't always show how someone thinks, and that part matters to me." },
  { type: 'output', text: '' },
  { type: 'output', text: "This website itself is part of that process. It was built with the help of open-source tools, design inspiration from the React ecosystem, and a lot of time spent reading documentation written by developers who care deeply about their craft. I still enjoy going through docs, examples, and community resources because that's where I tend to learn best — not to mention it is always amazing to see how senior developers think and create." },
  { type: 'output', text: '' },
  { type: 'output', text: "More than anything, this page exists to show curiosity, intention, and growth. I'd like to say it's not about perfection, it's about momentum." }
];

/* Lines shown on the Cover page. */
const COVER_LINES = [
  { type: 'prompt', text: '> Cover' },
  { type: 'output', text: "I'm a software engineering graduate who enjoys building small, complete systems — from an idea to something people can actually use. Most of my experience comes from hands-on projects where I've worked with JavaScript and React Native to build mobile applications, connected APIs, and handled data with tools like Firestore and Google Maps." },
  { type: 'output', text: '' },
  { type: 'output', text: "My background includes experience with component-based development, state management, and building interfaces that are structured, readable, and maintainable. I also have experience in C++, which has given me a solid grounding in core programming concepts, memory management, and problem-solving at a lower level." },
  { type: 'output', text: '' },
  { type: 'output', text: "As a new graduate, I'm very aware that there is still a lot I don't know. What I try to bring instead is curiosity, persistence, and a genuine interest in understanding how things work. I'm comfortable reading documentation, learning unfamiliar tools, and asking good questions, and I enjoy the process of improving through iteration." },
  { type: 'output', text: '' },
  { type: 'output', text: "This portfolio exists to hopefully show my approach more clearly than a traditional cover letter can. Rather than listing skills, I wanted to demonstrate how I think, how I learn, and how I translate ideas into working software." },
  { type: 'output', text: '' },
  { type: 'output', text: "I'm looking for opportunities where I can contribute, keep learning, and grow alongside more experienced engineers, while doing work that is thoughtful, practical, and well-built." }
];

/* Lines shown on the Resume page. */
const RESUME_LINES = [
  { type: 'prompt', text: '> Summary' },
  { type: 'output', text: "I'm a Software Engineering graduate with experience building small applications, connecting APIs, and working on projects from idea to working prototype. I like figuring out how systems behave, improving things that don't work well, and learning new tools as I go. I speak both English and Turkish and I'm ready to step into a development team and keep growing." },
  { type: 'output', text: '' },
  { type: 'prompt', text: '> Skills' },
  { type: 'output', text: 'Languages & Frameworks: Java, C++, Python, JavaScript, HTML, CSS, SQL, React.js, React Native, Node.js' },
  { type: 'output', text: 'Tools & Platforms: AWS, Azure, Firestore, Google Maps API, Jira' },
  { type: 'output', text: 'Other Skills: Networking & troubleshooting, hardware knowledge, team collaboration, independent project delivery.' },
  { type: 'output', text: '' },
  { type: 'prompt', text: '> My Projects' },
  { type: 'output', text: 'Tourism Mobile App – Local Legends | React Native, JavaScript, Firestore, Google Maps API' },
  { type: 'output', text: 'Developed a fully interactive mobile app that helps users discover cultural landmarks and local myths nearby. Integrated Google Maps API for real-time location-based recommendations. Implemented a community feature where users can submit and manage their own stories via Firestore.' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Customer FAQ Interface | Python' },
  { type: 'output', text: 'Created a self-service FAQ tool for a small business to streamline support and reduce human workload. Implemented search functionality, input logging, and data-driven content optimization.' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Object-Speed Measurement Mobile App | React Native' },
  { type: 'output', text: 'Designed an educational mobile app that calculates the approximate speed of moving objects using the device camera. Introduced interactive physics learning for school-aged children during a science event.' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Map-Based Interactive Mobile Game | C++' },
  { type: 'output', text: 'Built a story-driven pixel art mobile game with branching narratives and multiple endings. Implemented game logic, memory management, and user input handling in a low-level environment.' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Network Configuration & Maintenance Project' },
  { type: 'output', text: 'Collaborated in a team to configure and maintain a simulated enterprise network. Focused on security, stable performance, and hands-on troubleshooting to strengthen networking fundamentals.' },
  { type: 'output', text: '' },
  { type: 'prompt', text: '> Education' },
  { type: 'output', text: 'Bachelor of Information Technology - Software Engineering Major (June 2023 - November 2025)' },
  { type: 'output', text: 'La Trobe University | Melbourne, VIC' },
  { type: 'output', text: '' },
  { type: 'output', text: 'Diploma of Information Technology (Aug 2022 – Sept 2023)' },
  { type: 'output', text: 'La Trobe College | Melbourne, VIC' },
  { type: 'link', text: 'Open my full resume (PDF)', href: '/LulaITResume.pdf'},
];

/**
 * Renders a single line with the correct class: prompt (green), output (lighter green), or dir (directory listing style).
 * Empty output lines get a spacer class for paragraph breaks.
 */
function TerminalLine({ line }) {
  const isSpacer = line.type === 'output' && line.text === '';
  const baseClass = line.type === 'prompt' ? 'page-content__line page-content__line--prompt' :
    line.type === 'dir' ? 'page-content__line page-content__line--dir' :
    'page-content__line page-content__line--output';
  const className = isSpacer ? `${baseClass} page-content__line--spacer` : baseClass;

    if (line.type === 'link') {
    return (
      <div className={className}>
        <a
          href={line.href}
          target="_blank"
          rel="noopener noreferrer"
          className="page-content__link"
        >
          {line.text}
        </a>
      </div>
    );
  }
  return <div className={className}>{line.text}</div>;
}

const PageContent = memo(forwardRef(function PageContent({ page, isReturning }, ref) {
  const lines = page === 'about' ? ABOUT_LINES : page === 'resume' ? RESUME_LINES : COVER_LINES;
  const title = page === 'about' ? 'ABOUT' : page === 'resume' ? 'RESUME' : 'COVER';
  const bodyRef = useRef(null);
  const trackRef = useRef(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollMetrics, setScrollMetrics] = useState({ scrollHeight: 0, clientHeight: 0 });

  const checkOverflow = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight > el.clientHeight;
    setHasOverflow(scrollable);
    setScrollMetrics({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
    setScrollTop(el.scrollTop);
  }, []);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setScrollMetrics({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
  }, []);

  useEffect(() => {
    if (isReturning) return;
    const el = bodyRef.current;
    if (!el) return;
    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    const t = setTimeout(checkOverflow, 100);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [page, lines, isReturning, checkOverflow]);

  const handleTrackClick = useCallback((e) => {
    const body = bodyRef.current;
    const track = trackRef.current;
    if (!body || !track || body.scrollHeight <= body.clientHeight) return;
    const rect = track.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const thumbRatio = body.clientHeight / body.scrollHeight;
    const trackHeight = rect.height;
    const thumbHeight = trackHeight * thumbRatio;
    const maxThumbTop = trackHeight - thumbHeight;
    const thumbTop = Math.max(0, Math.min(y - thumbHeight / 2, maxThumbTop));
    const scrollRange = body.scrollHeight - body.clientHeight;
    body.scrollTop = (thumbTop / maxThumbTop) * scrollRange;
  }, []);

  const handleThumbMouseDown = useCallback((e) => {
    e.preventDefault();
    const body = bodyRef.current;
    if (!body) return;
    const startY = e.clientY;
    const startScrollTop = body.scrollTop;
    const scrollRange = body.scrollHeight - body.clientHeight;
    if (scrollRange <= 0) return;
    const trackHeight = body.clientHeight;
    const thumbRatio = body.clientHeight / body.scrollHeight;
    const thumbHeight = trackHeight * thumbRatio;
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

    const onMouseMove = (e2) => {
      const dy = e2.clientY - startY;
      const ratio = maxThumbTop > 0 ? dy / maxThumbTop : 0;
      body.scrollTop = Math.max(0, Math.min(scrollRange, startScrollTop + ratio * scrollRange));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const { scrollHeight, clientHeight } = scrollMetrics;
  const scrollRange = Math.max(0, scrollHeight - clientHeight);
  const thumbRatio = scrollHeight > 0 ? clientHeight / scrollHeight : 1;
  const thumbHeightPx = clientHeight * thumbRatio;
  const thumbMaxTop = Math.max(0, clientHeight - thumbHeightPx);
  const thumbTop = scrollRange > 0 ? (scrollTop / scrollRange) * thumbMaxTop : 0;

  return (
    <div
      className={`page-content ${isReturning ? 'page-content--returning' : ''}`}
      aria-label={`${title} page content`}
    >
      <div ref={ref} className="page-content__panel">
        {/* Fake title bar: three dots + label (e.g. "ABOUT.txt") like a small terminal window */}
        <div className="page-content__title-bar">
          <span className="page-content__title-dot" />
          <span className="page-content__title-dot" />
          <span className="page-content__title-dot" />
          <span className="page-content__title-label">{title}.txt</span>
        </div>
        {/* Subtle horizontal scanline overlay for CRT feel */}
        <div className="page-content__scanline" aria-hidden="true" />
        <div className="page-content__body-wrapper">
          <div
            ref={bodyRef}
            className={`page-content__body ${hasOverflow ? 'page-content__body--scrollable' : ''}`}
            onScroll={handleScroll}
          >
            {lines.map((line, i) => (
              <TerminalLine key={i} line={line} />
            ))}
            {/* Blinking cursor at end of "output" */}
            <span className="page-content__cursor" aria-hidden="true" />
          </div>
          {hasOverflow && (
            <div
              ref={trackRef}
              className="page-content__scrollbar-track"
              role="scrollbar"
              aria-valuenow={scrollRange > 0 ? Math.round((scrollTop / scrollRange) * 100) : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              onMouseDown={handleTrackClick}
            >
              <div
                className="page-content__scrollbar-thumb"
                style={{ height: thumbHeightPx, transform: `translateY(${thumbTop}px)` }}
                onMouseDown={handleThumbMouseDown}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}));

export default PageContent;
