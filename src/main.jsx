/**
 * main.jsx — Application entry point
 *
 * This file is the first JavaScript that runs when the app loads. It:
 * 1. Imports React's createRoot API (the modern way to mount React 18+ apps)
 * 2. Imports global CSS (index.css) so baseline styles apply before any component renders
 * 3. Imports the root App component
 * 4. Finds the DOM node with id "root" (defined in index.html) and renders <App /> into it
 *
 * The "root" div is the single container for the entire React tree; everything you see
 * on the page is rendered inside it by React.
 */

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <App />
);
