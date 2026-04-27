/**
 * MiniDev ONE Template - App Component
 * 
 * Root component that renders based on project type.
 * Container is provided via index.html
 */

import { FEATURES, isGame, isApp, isWebsite, getColors } from './lib/config';

// =============================================================================
// STYLES
// =============================================================================
const styles = `
  .minidev-app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Game container */
  .game-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--background);
  }

  .game-canvas {
    border: 2px solid var(--border);
    border-radius: 8px;
    max-width: 100%;
    cursor: pointer;
  }

  /* App container */
  .app-container {
    max-w-2xl mx-auto p-6;
  }

  /* Website container */
  .website-container {
    min-height: 100vh;
  }

  /* Animations */
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slide-out {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  .animate-slide-in { animation: slide-in 0.3s ease-out; }
  .animate-slide-out { animation: slide-out 0.3s ease-out; }

  /* Toast styles */
  .toast { background: var(--card); border: 1px solid var(--border); }
  .toast-success { border-left: 4px solid var(--success); }
  .toast-error { border-left: 4px solid var(--error); }
  .toast-warning { border-left: 4px solid var(--warning); }
  .toast-info { border-left: 4px solid var(--primary); }
`;

// =============================================================================
// APP COMPONENT
// =============================================================================
export function App() {
  // Get colors based on theme
  const colors = getColors();
  
  // Inject styles
  if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  // Determine container class
  let containerClass = '';
  if (isGame()) {
    containerClass = 'game-container';
  } else if (isApp()) {
    containerClass = 'app-container';
  } else if (isWebsite()) {
    containerClass = 'website-container';
  }

  // Render container
  return (
    <div className="minidev-app">
      {isGame() && <div id="game-container" className={containerClass} />}
      {isApp() && <div id="app-container" className={containerClass} />}
      {isWebsite() && <div id="website-container" className={containerClass} />}
      
      {/* Fallback if no container matched */}
      <div id="root-container" className={containerClass} />
    </div>
  );
}

export default App;
