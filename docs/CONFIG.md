/**
 * MiniDev ONE Template - Configuration Reference
 * 
 * This document shows all configuration options available in config.ts
 * 
 * @example
 * // Example: Enable multiplayer
 * export const FEATURES = {
 *   multiplayer: { enabled: true, maxPlayers: 4 }
 * };
 * 
 * @example
 * // Example: Configure game difficulty
 * export const FEATURES = {
 *   game: {
 *     difficulty: { lives: 5, enemySpeed: 1.5 }
 *   }
 * };
 */

// =============================================================================
// QUICK REFERENCE
// =============================================================================

/**
 * FEATURES.type.mode
 * - 'game' | 'app' | 'website'
 * Controls what type of project this is.
 */

/**
 * FEATURES.game.type
 * - 'platformer' | 'snake' | 'breakout' | 'puzzle' | 'shooter' | 'racing'
 * - 'idle' | 'tower' | 'tactics' | 'arcade' | 'rpg' | 'adventure'
 * - 'card' | 'word' | 'visual' | 'sandbox'
 * The specific type of game.
 */

/**
 * FEATURES.app.type
 * - 'todo' | 'notes' | 'timer' | 'planner' | 'habits' | 'flashcards'
 * - 'quiz' | 'draw' | 'chat' | 'weather' | 'calculator' | 'health'
 * - 'music' | 'photo' | 'social' | 'tracker'
 * The specific type of app.
 */

/**
 * FEATURES.website.type
 * - 'portfolio' | 'blog' | 'business' | 'store' | 'landing' | 'wiki' | 'forum' | 'gallery'
 * The specific type of website.
 */

// =============================================================================
// FULL CONFIGURATION OPTIONS
// =============================================================================

export const FEATURES = {
  
  // ==========================================================================
  // PROJECT TYPE (Required)
  // ==========================================================================
  type: {
    mode: 'game' as ProjectMode, // 'game' | 'app' | 'website'
  },

  // ==========================================================================
  // GAME CONFIGURATION
  // ==========================================================================
  game: {
    enabled: true,
    type: 'platformer' as GameType,
    
    // Canvas settings
    canvas: {
      width: 800,              // Canvas width in pixels
      height: 600,             // Canvas height in pixels
      responsive: true,        // Scale to fit window
      pixelated: false,        // Crisp pixels (retro style)
      background: '#1a1a2e',   // Background color
      fps: 60,                 // Target frames per second
      antialias: true,         // Anti-aliasing
    },
    
    // Physics settings
    physics: {
      gravity: 0.5,           // Gravity strength
      friction: 0.85,          // Surface friction (0-1)
      bounce: 0.3,             // Bounce factor (0-1)
      airResistance: 0.01,     // Air resistance (0-1)
      maxVelocity: 15,         // Maximum velocity
    },
    
    // Control schemes
    controls: {
      keyboard: true,          // Arrow keys / WASD
      touch: true,             // Touch controls
      gamepad: false,          // Gamepad support
      mouse: false,            // Mouse aiming
    },
    
    // Difficulty settings
    difficulty: {
      lives: 3,                // Starting lives (0 = infinite)
      enemySpeed: 1.0,         // Enemy speed multiplier
      enemyDamage: 1,          // Damage per hit
      timerDuration: 0,        // Timer in seconds (0 = disabled)
      invincibilityFrames: 40,  // Invincibility after hit (frames)
      scoreMultiplier: 1.0,    // Score multiplier
    },
    
    // Progression settings
    progression: {
      levels: 10,              // Total levels
      enemyCount: 5,           // Enemies per level
      coinsPerLevel: 15,       // Coins to collect per level
      bossEvery: 5,            // Boss every N levels
      experienceEnabled: false, // XP system
      unlockables: false,      // Unlock system
    },
    
    // Character customization
    character: {
      skin: '#FFDFC4',
      hair: '#2C222B',
      eyes: '#4B5320',
      clothes: '#3498DB',
      accessory: 'none',
      size: 'medium',          // 'small' | 'medium' | 'large'
      speed: 5,                // Movement speed
    },
  },

  // ==========================================================================
  // APP CONFIGURATION
  // ==========================================================================
  app: {
    enabled: false,
    type: 'todo' as AppType,
    
    // UI components
    components: {
      list: true,             // List views
      form: true,             // Form inputs
      card: true,             // Card layout
      modal: true,            // Modal dialogs
      toast: true,            // Toast notifications
      navigation: 'top',      // 'top' | 'bottom' | 'sidebar' | 'tabs'
      drawer: false,          // Slide-out drawer
      table: false,           // Table views
      chart: false,           // Charts
    },
    
    // Data management
    data: {
      localStorage: true,     // Save to localStorage
      cloudSync: false,       // Sync to cloud
      exportable: true,        // Export data
      importable: true,       // Import data
      backup: true,           // Auto backup
    },
  },

  // ==========================================================================
  // WEBSITE CONFIGURATION
  // ==========================================================================
  website: {
    enabled: false,
    type: 'landing' as WebsiteType,
    
    // Layout options
    layout: {
      header: true,           // Show header
      footer: true,           // Show footer
      sidebar: false,         // Show sidebar
      container: 'lg',        // Container size
    },
    
    // Section visibility
    sections: {
      hero: true,             // Hero banner
      features: false,        // Features grid
      pricing: false,         // Pricing table
      testimonials: true,      // Customer testimonials
      team: false,            // Team section
      faq: false,             // FAQ section
      stats: true,            // Stats/counters
      cta: true,              // Call to action
      gallery: false,         // Image gallery
      blog: false,            // Blog section
      contact: false,         // Contact form
    },
    
    pages: ['home'],          // Pages to generate
    blog: false,              // Enable blog
    shop: false,              // Enable shop
    darkMode: true,           // Dark mode toggle
  },

  // ==========================================================================
  // THEME CONFIGURATION
  // ==========================================================================
  theme: {
    enabled: true,
    defaultMode: 'system',    // 'light' | 'dark' | 'system'
    modes: ['light', 'dark', 'system'],
    persist: true,            // Persist to localStorage
    
    // Color palettes
    colors: {
      light: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        background: '#ffffff',
        foreground: '#0f172a',
        card: '#ffffff',
        border: '#e2e8f0',
        muted: '#f1f5f9',
        input: '#f1f5f9',
        ring: '#667eea',
      },
      dark: {
        primary: '#818cf8',
        secondary: '#a78bfa',
        accent: '#f472b6',
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
        background: '#0f172a',
        foreground: '#f8fafc',
        card: '#1e293b',
        border: '#334155',
        muted: '#1e293b',
        input: '#1e293b',
        ring: '#818cf8',
      },
    },
    
    typography: {
      fontFamily: 'system-ui, sans-serif',
      monoFamily: 'monospace',
      scale: 'base',
    },
    radius: 'md',            // Border radius size
    animation: true,          // Enable animations
  },

  // ==========================================================================
  // PWA CONFIGURATION
  // ==========================================================================
  pwa: {
    enabled: true,
    name: PROJECT.name,
    shortName: PROJECT.name.slice(0, 12),
    themeColor: '#667eea',
    backgroundColor: '#ffffff',
    display: 'standalone',   // 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'
    orientation: 'any',      // 'any' | 'portrait' | 'landscape'
    icons: {
      favicon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
      maskable: '/maskable-icon.png',
      large: '/icon-512.png',
    },
    offline: true,           // Offline support
    shortcuts: [],           // App shortcuts
  },

  // ==========================================================================
  // MULTIPLAYER CONFIGURATION
  // ==========================================================================
  multiplayer: {
    enabled: false,
    type: 'websocket',       // 'websocket' | 'webrtc' | 'colyseus'
    maxPlayers: 4,           // Max players per room
    roomPublic: true,        // Show in public listing
    allowSpectators: true,    // Allow watching
    chat: false,             // In-game chat
    voice: false,            // Voice chat
    matchmake: false,       // Auto matchmaking
  },

  // ==========================================================================
  // CAMPAIGN & ACHIEVEMENTS
  // ==========================================================================
  campaign: {
    enabled: false,
    levels: [],              // Level definitions
    achievements: [
      // Example: { id: 'first_win', name: 'First Victory', icon: '🏆' }
    ],
    saveProgress: true,       // Save progress
    saveKey: 'minidev_progress',
  },

  // ==========================================================================
  // LEADERBOARD
  // ==========================================================================
  leaderboard: {
    enabled: false,
    type: 'local',           // 'local' | 'api' | 'firebase'
    limit: 100,              // Max entries to show
    saveLocally: true,       // Cache locally
    updateInterval: 60000,   // Update interval (ms)
  },

  // ==========================================================================
  // STATS TRACKING
  // ==========================================================================
  stats: {
    enabled: false,
    track: ['plays', 'wins', 'time', 'score'],
    saveLocally: true,
  },

  // ==========================================================================
  // AUDIO CONFIGURATION
  // ==========================================================================
  audio: {
    enabled: true,
    sfx: true,               // Sound effects
    music: false,            // Background music
    tts: false,              // Text-to-speech
    volume: 0.7,             // Volume (0-1)
    muted: false,            // Start muted
  },

  // ==========================================================================
  // INTERNATIONALIZATION (i18n)
  // ==========================================================================
  i18n: {
    enabled: true,
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    fallbackLocale: 'en',
    rtlLocales: [],           // RTL languages
  },

  // ==========================================================================
  // STORAGE CONFIGURATION
  // ==========================================================================
  storage: {
    enabled: true,
    type: 'local',           // 'local' | 'indexeddb' | 'firebase'
    autoSave: true,          // Auto save
    saveInterval: 30000,    // Save interval (ms)
  },

  // ==========================================================================
  // ACCESSIBILITY (a11y)
  // ==========================================================================
  a11y: {
    enabled: true,
    reducedMotion: true,     // Respect prefers-reduced-motion
    highContrast: false,      // High contrast mode
    fontSize: 16,            // Base font size
    lineHeight: 1.5,         // Line height
    focusVisible: true,      // Focus indicators
    skipLinks: true,         // Skip navigation links
  },

  // ==========================================================================
  // API CONFIGURATION
  // ==========================================================================
  api: {
    enabled: false,
    port: 3001,
    cors: true,              // Enable CORS
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      max: 100,
    },
    auth: {
      enabled: false,
      providers: [],        // 'google' | 'github' | 'email'
      jwtSecret: 'change-me-in-production',
      sessionMaxAge: 604800,
    },
    routes: [],
  },

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================
  analytics: {
    enabled: false,
    provider: 'none',        // 'none' | 'google' | 'plausible' | 'mixpanel'
    id: '',                 // Analytics ID
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Check if current project is a game */
export function isGame(): boolean;

/** Check if current project is an app */
export function isApp(): boolean;

/** Check if current project is a website */
export function isWebsite(): boolean;

/** Check if multiplayer is enabled */
export function isMultiplayer(): boolean;

/** Get current theme ('light' or 'dark') */
export function getTheme(): 'light' | 'dark';

/** Get current color palette */
export function getColors(): typeof FEATURES.theme.colors.light;

/** Translate a key with parameters */
export function t(key: string, params?: Record<string, string>): string;
