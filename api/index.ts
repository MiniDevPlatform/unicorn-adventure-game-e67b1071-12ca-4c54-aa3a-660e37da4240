/**
 * MiniDev ONE Template - API Server
 * 
 * Backend API for projects, leaderboard, game state, etc.
 * Can be deployed as Cloudflare Workers or Vercel API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { FEATURES } from '@/lib/config';

// =============================================================================
// TYPES
// =============================================================================
interface Project {
  id: string;
  name: string;
  slug: string;
  type: 'game' | 'app' | 'website';
  category: string;
  description?: string;
  status: 'draft' | 'building' | 'deployed' | 'error';
  repoUrl?: string;
  pagesUrl?: string;
  config?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface LeaderboardEntry {
  id: string;
  playerId: string;
  playerName: string;
  score: number;
  gameId?: string;
  data?: Record<string, any>;
  createdAt: number;
}

interface GameState {
  playerId: string;
  data: Record<string, any>;
  updatedAt: number;
}

// =============================================================================
// HELPERS
// =============================================================================
function getDb() {
  // Simplified - use actual database in production
  return {
    query: (sql: string) => [],
    run: (sql: string, ...args: any[]) => ({ changes: 0 }),
  };
}

function requireAuth(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

function json(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number = 400): NextResponse {
  return json({ error: message }, status);
}

// =============================================================================
// PROJECTS API
// =============================================================================
export async function GET_projects(request: NextRequest) {
  const db = getDb();
  const projects = db.query('SELECT * FROM projects ORDER BY created_at DESC');
  
  return json({ projects });
}

export async function GET_project(request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const project = db.query('SELECT * FROM projects WHERE id = ?', params.id);
  
  if (!project.length) {
    return error('Project not found', 404);
  }
  
  return json({ project: project[0] });
}

export async function POST_projects(request: NextRequest) {
  const userId = requireAuth(request);
  if (!userId) return error('Unauthorized', 401);

  try {
    const body = await request.json();
    const { name, type, category, description } = body;

    if (!name || !type) {
      return error('Name and type are required', 400);
    }

    const id = crypto.randomUUID();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const db = getDb();
    db.run(
      `INSERT INTO projects (id, name, slug, type, category, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))`,
      id, name, slug, type, category || type, description || ''
    );

    return json({ project: { id, name, slug, type, category, status: 'draft' } }, 201);
  } catch (e) {
    return error('Failed to create project', 500);
  }
}

export async function PUT_project(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireAuth(request);
  if (!userId) return error('Unauthorized', 401);

  try {
    const body = await request.json();
    const { name, description, status } = body;

    const db = getDb();
    db.run(
      `UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), 
       status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ?`,
      name, description, status, params.id
    );

    return json({ success: true });
  } catch (e) {
    return error('Failed to update project', 500);
  }
}

export async function DELETE_project(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = requireAuth(request);
  if (!userId) return error('Unauthorized', 401);

  const db = getDb();
  db.run('DELETE FROM projects WHERE id = ?', params.id);

  return json({ success: true });
}

// =============================================================================
// GENERATE PROJECT API
// =============================================================================
export async function POST_generate(request: NextRequest) {
  const userId = requireAuth(request);
  if (!userId) return error('Unauthorized', 401);

  try {
    const body = await request.json();
    
    // Generate project using generator
    const { generateProject } = await import('@/lib/projects/generator');
    const result = await generateProject({
      name: body.name,
      type: body.type,
      category: body.category,
      difficulty: body.difficulty,
      size: body.size,
      multiplayer: body.multiplayer,
      theme: body.theme,
      extras: body.extras,
      character: body.character,
    });

    if (!result.success) {
      return error(result.error || 'Generation failed', 500);
    }

    return json({
      project: {
        id: crypto.randomUUID(),
        name: body.name,
        type: body.type,
        status: 'draft',
      },
      files: result.files,
    }, 201);
  } catch (e) {
    return error('Failed to generate project', 500);
  }
}

// =============================================================================
// LEADERBOARD API
// =============================================================================
export async function GET_leaderboard(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const gameId = searchParams.get('gameId');

  let query = 'SELECT * FROM leaderboard';
  const params: any[] = [];
  
  if (gameId) {
    query += ' WHERE game_id = ?';
    params.push(gameId);
  }
  
  query += ' ORDER BY score DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const db = getDb();
  const entries = db.query(query, ...params);
  
  // Add ranks
  const ranked = entries.map((entry: LeaderboardEntry, index: number) => ({
    ...entry,
    rank: offset + index + 1,
  }));

  return json({ entries: ranked, total: ranked.length });
}

export async function POST_leaderboard(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, playerName, score, gameId, data } = body;

    if (!playerId || score === undefined) {
      return error('playerId and score are required', 400);
    }

    const id = crypto.randomUUID();
    const db = getDb();
    db.run(
      `INSERT INTO leaderboard (id, player_id, player_name, score, game_id, data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      id, playerId, playerName || 'Anonymous', score, gameId, JSON.stringify(data || {})
    );

    return json({ entry: { id, playerId, playerName, score, rank: 1 } }, 201);
  } catch (e) {
    return error('Failed to submit score', 500);
  }
}

export async function GET_rank(request: NextRequest, { params }: { params: { playerId: string } }) {
  const db = getDb();
  
  // Get player's entry
  const entry = db.query(
    'SELECT * FROM leaderboard WHERE player_id = ? ORDER BY score DESC LIMIT 1',
    params.playerId
  );

  if (!entry.length) {
    return json({ rank: null, total: 0 });
  }

  // Count how many scores are higher
  const rank = db.query(
    'SELECT COUNT(*) + 1 as rank FROM leaderboard WHERE score > ?',
    entry[0].score
  );

  const total = db.query('SELECT COUNT(*) as total FROM leaderboard');

  return json({
    rank: rank[0]?.rank || 1,
    total: total[0]?.total || 0,
  });
}

// =============================================================================
// GAME STATE API
// =============================================================================
export async function POST_save(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, data } = body;

    if (!playerId) {
      return error('playerId is required', 400);
    }

    const existing = storage.get<GameState>(`game_${playerId}`);
    const state: GameState = {
      playerId,
      data: { ...existing?.data, ...data },
      updatedAt: Date.now(),
    };

    storage.set(`game_${playerId}`, state);

    return json({ success: true });
  } catch (e) {
    return error('Failed to save game', 500);
  }
}

export async function GET_load(request: NextRequest, { params }: { params: { playerId: string } }) {
  const state = storage.get<GameState>(`game_${params.playerId}`);

  if (!state) {
    return json({ state: null });
  }

  return json({ state });
}

// =============================================================================
// ACHIEVEMENTS API
// =============================================================================
export async function POST_achievement(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, achievementId, progress } = body;

    if (!playerId || !achievementId) {
      return error('playerId and achievementId are required', 400);
    }

    const key = `achievement_${playerId}_${achievementId}`;
    const achievement = storage.get<any>(key) || {
      id: achievementId,
      unlockedAt: null,
      progress: 0,
    };

    if (progress !== undefined) {
      achievement.progress = progress;
    }

    // Check if achieved
    if (achievement.progress >= 100 && !achievement.unlockedAt) {
      achievement.unlockedAt = Date.now();
    }

    storage.set(key, achievement);

    return json({ achievement });
  } catch (e) {
    return error('Failed to update achievement', 500);
  }
}

// =============================================================================
// CLOUD SYNC API
// =============================================================================
export async function POST_sync(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, data } = body;

    if (!playerId) {
      return error('playerId is required', 400);
    }

    const key = `sync_${playerId}`;
    const lastSync = storage.get<number>(`sync_${playerId}_timestamp`) || 0;
    
    // Store with timestamp
    storage.set(key, {
      data,
      timestamp: Date.now(),
    });
    storage.set(`sync_${playerId}_timestamp`, Date.now());

    return json({
      success: true,
      syncedAt: Date.now(),
      changesSince: lastSync,
    });
  } catch (e) {
    return error('Failed to sync', 500);
  }
}

export async function GET_sync(request: NextRequest, { params }: { params: { playerId: string } }) {
  const key = `sync_${params.playerId}`;
  const syncData = storage.get<any>(key);

  if (!syncData) {
    return json({ data: null, timestamp: null });
  }

  return json({
    data: syncData.data,
    timestamp: syncData.timestamp,
  });
}

// =============================================================================
// ANALYTICS API
// =============================================================================
export async function POST_track(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return error('events array is required', 400);
    }

    // Store events (in production, batch insert to DB)
    for (const event of events) {
      const key = `event_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      storage.set(key, {
        ...event,
        timestamp: Date.now(),
      }, 86400000); // Expire after 24h
    }

    return json({ success: true, tracked: events.length });
  } catch (e) {
    return error('Failed to track', 500);
  }
}

// =============================================================================
// STATS API
// =============================================================================
export async function GET_stats(request: NextRequest) {
  const db = getDb();
  
  const stats = {
    projects: db.query('SELECT COUNT(*) as count FROM projects')[0]?.count || 0,
    games: db.query("SELECT COUNT(*) as count FROM projects WHERE type = 'game'")[0]?.count || 0,
    apps: db.query("SELECT COUNT(*) as count FROM projects WHERE type = 'app'")[0]?.count || 0,
    websites: db.query("SELECT COUNT(*) as count FROM projects WHERE type = 'website'")[0]?.count || 0,
    deployed: db.query("SELECT COUNT(*) as count FROM projects WHERE status = 'deployed'")[0]?.count || 0,
    leaderboardEntries: db.query('SELECT COUNT(*) as count FROM leaderboard')[0]?.count || 0,
  };

  return json({ stats });
}

// =============================================================================
// EXPORTS
// =============================================================================
export default {
  GET_projects,
  GET_project,
  POST_projects,
  PUT_project,
  DELETE_project,
  POST_generate,
  GET_leaderboard,
  POST_leaderboard,
  GET_rank,
  POST_save,
  GET_load,
  POST_achievement,
  POST_sync,
  GET_sync,
  POST_track,
  GET_stats,
};
