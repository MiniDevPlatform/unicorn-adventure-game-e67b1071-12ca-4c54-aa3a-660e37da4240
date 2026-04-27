/**
 * MiniDev ONE Template - API Routes
 * 
 * Backend API endpoints.
 */

// =============================================================================
// PROJECTS ROUTES
// =============================================================================
export interface ProjectsApi {
  // List all projects
  'GET /api/projects': {
    response: { projects: Project[]; total: number };
  };
  
  // Get single project
  'GET /api/projects/:id': {
    response: { project: Project };
    params: { id: string };
  };
  
  // Create project
  'POST /api/projects': {
    body: CreateProjectBody;
    response: { project: Project };
  };
  
  // Update project
  'PUT /api/projects/:id': {
    body: Partial<Project>;
    response: { project: Project };
    params: { id: string };
  };
  
  // Delete project
  'DELETE /api/projects/:id': {
    response: { success: boolean };
    params: { id: string };
  };
  
  // Generate project
  'POST /api/projects/generate': {
    body: GenerateProjectBody;
    response: { project: Project; files: FileInfo[] };
  };
  
  // Deploy project
  'POST /api/projects/:id/deploy': {
    response: { url: string };
    params: { id: string };
  };
}

// =============================================================================
// LEADERBOARD ROUTES  
// =============================================================================
export interface LeaderboardApi {
  // Get top scores
  'GET /api/leaderboard': {
    query: { limit?: number; offset?: number };
    response: { entries: LeaderboardEntry[]; total: number };
  };
  
  // Submit score
  'POST /api/leaderboard': {
    body: SubmitScoreBody;
    response: { entry: LeaderboardEntry };
  };
  
  // Get rank
  'GET /api/leaderboard/rank/:playerId': {
    params: { playerId: string };
    response: { rank: number; total: number };
  };
}

// =============================================================================
// GAME STATE ROUTES
// =============================================================================
export interface GameApi {
  // Save game state
  'POST /api/game/save': {
    body: SaveGameBody;
    response: { success: boolean };
  };
  
  // Load game state
  'GET /api/game/load/:playerId': {
    params: { playerId: string };
    response: { state: GameState };
  };
  
  // Submit achievement
  'POST /api/game/achievement': {
    body: AchievementBody;
    response: { success: boolean; achievement: Achievement };
  };
}

// =============================================================================
// TYPES
// =============================================================================
export interface Project {
  id: string;
  name: string;
  slug: string;
  type: 'game' | 'app' | 'website';
  category: string;
  description?: string;
  status: 'draft' | 'building' | 'deployed' | 'error';
  repoUrl?: string;
  pagesUrl?: string;
  createdAt: string;
  updatedAt: string;
  config?: Record<string, any>;
}

export interface CreateProjectBody {
  name: string;
  type: 'game' | 'app' | 'website';
  category: string;
  description?: string;
}

export interface GenerateProjectBody extends CreateProjectBody {
  difficulty?: string;
  size?: string;
  multiplayer?: string;
  theme?: string;
  language?: string;
  extras?: string[];
  grillAnswers?: Record<string, string | string[]>;
  character?: CharacterConfig;
}

export interface CharacterConfig {
  type: string;
  bodyType: string;
  style: string;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  clothesColor: string;
  accessory: string;
}

export interface FileInfo {
  path: string;
  content: string;
  size: number;
}

export interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  createdAt: string;
  data?: Record<string, any>;
}

export interface SubmitScoreBody {
  playerId: string;
  playerName: string;
  score: number;
  gameId?: string;
  data?: Record<string, any>;
}

export interface GameState {
  playerId: string;
  level: number;
  score: number;
  lives: number;
  inventory?: Record<string, number>;
  progress?: Record<string, number>;
  updatedAt: string;
}

export interface SaveGameBody {
  playerId: string;
  state: Partial<GameState>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export interface AchievementBody {
  playerId: string;
  achievementId: string;
  progress?: number;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================
export type RouteHandler<T> = (params: T) => Promise<any>;

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: RouteHandler<any>;
  middleware?: string[];
}

export const routes: ApiRoute[] = [
  // Projects
  { method: 'GET', path: '/api/projects', handler: getProjects },
  { method: 'GET', path: '/api/projects/:id', handler: getProject },
  { method: 'POST', path: '/api/projects', handler: createProject },
  { method: 'PUT', path: '/api/projects/:id', handler: updateProject },
  { method: 'DELETE', path: '/api/projects/:id', handler: deleteProject },
  { method: 'POST', path: '/api/projects/generate', handler: generateProject },
  { method: 'POST', path: '/api/projects/:id/deploy', handler: deployProject },
  
  // Leaderboard
  { method: 'GET', path: '/api/leaderboard', handler: getLeaderboard },
  { method: 'POST', path: '/api/leaderboard', handler: submitScore },
  { method: 'GET', path: '/api/leaderboard/rank/:playerId', handler: getRank },
  
  // Game
  { method: 'POST', path: '/api/game/save', handler: saveGame },
  { method: 'GET', path: '/api/game/load/:playerId', handler: loadGame },
  { method: 'POST', path: '/api/game/achievement', handler: submitAchievement },
];

// Placeholder handlers (implement based on your backend)
async function getProjects() { throw new Error('Not implemented'); }
async function getProject(params: { id: string }) { throw new Error('Not implemented'); }
async function createProject(body: any) { throw new Error('Not implemented'); }
async function updateProject(params: { id: string }, body: any) { throw new Error('Not implemented'); }
async function deleteProject(params: { id: string }) { throw new Error('Not implemented'); }
async function generateProject(body: GenerateProjectBody) { throw new Error('Not implemented'); }
async function deployProject(params: { id: string }) { throw new Error('Not implemented'); }
async function getLeaderboard(query: { limit?: number; offset?: number }) { throw new Error('Not implemented'); }
async function submitScore(body: SubmitScoreBody) { throw new Error('Not implemented'); }
async function getRank(params: { playerId: string }) { throw new Error('Not implemented'); }
async function saveGame(body: SaveGameBody) { throw new Error('Not implemented'); }
async function loadGame(params: { playerId: string }) { throw new Error('Not implemented'); }
async function submitAchievement(body: AchievementBody) { throw new Error('Not implemented'); }

export default routes;
