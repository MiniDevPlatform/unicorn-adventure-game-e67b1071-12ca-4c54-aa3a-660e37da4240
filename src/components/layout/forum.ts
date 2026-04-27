/**
 * MiniDev ONE Template - Forum System
 * 
 * Forum with threads, posts, categories, and user management.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface ForumUser {
  id: string;
  username: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'member' | 'guest';
  joinedAt: number;
  postCount: number;
  reputation: number;
}

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  threadCount: number;
  postCount: number;
  lastPost?: {
    threadId: string;
    title: string;
    author: string;
    timestamp: number;
  };
}

interface ForumThread {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  author: ForumUser;
  createdAt: number;
  updatedAt: number;
  views: number;
  replies: ForumReply[];
  isPinned: boolean;
  isLocked: boolean;
  tags: string[];
  likes: number;
  lastReplyAt?: number;
}

interface ForumReply {
  id: string;
  threadId: string;
  content: string;
  author: ForumUser;
  createdAt: number;
  updatedAt: number;
  likes: number;
  isSolution: boolean;
  parentId?: string;
}

// =============================================================================
// FORUM ENGINE
// =============================================================================
class ForumEngine {
  private container: HTMLElement;
  private categories: Map<string, ForumCategory> = new Map();
  private threads: Map<string, ForumThread> = new Map();
  private currentUser: ForumUser;
  private storageKey: string;
  private currentView: 'home' | 'category' | 'thread' | 'new-thread' = 'home';
  private currentCategory: string = '';
  private currentThread: string = '';

  constructor(selector: string, storageKey: string = 'forum') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    
    this.currentUser = this.getDefaultUser();
    this.load();
    this.render();
  }

  private getDefaultUser(): ForumUser {
    return {
      id: 'user_default',
      username: 'Guest',
      avatar: '👤',
      role: 'guest',
      joinedAt: Date.now(),
      postCount: 0,
      reputation: 0,
    };
  }

  private load(): void {
    const saved = storage.get<{
      categories: ForumCategory[];
      threads: ForumThread[];
    }>(this.storageKey);

    if (saved) {
      saved.categories.forEach(c => this.categories.set(c.id, c));
      saved.threads.forEach(t => this.threads.set(t.id, t));
    } else {
      this.initDefaultData();
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      categories: Array.from(this.categories.values()),
      threads: Array.from(this.threads.values()),
    });
  }

  private initDefaultData(): void {
    // Default categories
    const categories: ForumCategory[] = [
      {
        id: 'cat_announcements',
        name: 'Announcements',
        slug: 'announcements',
        description: 'Official news and updates',
        icon: '📢',
        color: '#ef4444',
        threadCount: 0,
        postCount: 0,
      },
      {
        id: 'cat_general',
        name: 'General Discussion',
        slug: 'general',
        description: 'Talk about anything',
        icon: '💬',
        color: '#3b82f6',
        threadCount: 0,
        postCount: 0,
      },
      {
        id: 'cat_help',
        name: 'Help & Support',
        slug: 'help',
        description: 'Get help from the community',
        icon: '🆘',
        color: '#22c55e',
        threadCount: 0,
        postCount: 0,
      },
      {
        id: 'cat_showcase',
        name: 'Showcase',
        slug: 'showcase',
        description: 'Share your projects',
        icon: '✨',
        color: '#f59e0b',
        threadCount: 0,
        postCount: 0,
      },
      {
        id: 'cat_feedback',
        name: 'Feedback & Ideas',
        slug: 'feedback',
        description: 'Share suggestions and feedback',
        icon: '💡',
        color: '#8b5cf6',
        threadCount: 0,
        postCount: 0,
      },
    ];
    categories.forEach(c => this.categories.set(c.id, c));

    // Welcome thread
    const welcomeThread: ForumThread = {
      id: 'thread_welcome',
      categoryId: 'cat_announcements',
      title: 'Welcome to the Forum!',
      content: `# Welcome to our community!

We're glad you're here. This forum is a place for:

- **Discussion** - Talk about topics that matter to you
- **Help** - Get support from the community
- **Sharing** - Showcase your projects and work

## Guidelines

1. Be respectful to others
2. Keep discussions on topic
3. No spam or self-promotion
4. Use appropriate language

Happy posting! 🎉`,
      author: this.getDefaultAdmin(),
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      views: 42,
      replies: [],
      isPinned: true,
      isLocked: false,
      tags: ['welcome', 'rules'],
      likes: 15,
    };
    this.threads.set(welcomeThread.id, welcomeThread);

    this.save();
  }

  private getDefaultAdmin(): ForumUser {
    return {
      id: 'user_admin',
      username: 'Admin',
      avatar: '👑',
      role: 'admin',
      joinedAt: Date.now() - 86400000 * 30,
      postCount: 1,
      reputation: 100,
    };
  }

  // =============================================================================
  // THREAD MANAGEMENT
  // =============================================================================
  createThread(categoryId: string, title: string, content: string, tags: string[] = []): ForumThread {
    const thread: ForumThread = {
      id: `thread_${Date.now()}`,
      categoryId,
      title,
      content,
      author: { ...this.currentUser },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      replies: [],
      isPinned: false,
      isLocked: false,
      tags,
      likes: 0,
    };

    this.threads.set(thread.id, thread);
    
    // Update category stats
    const category = this.categories.get(categoryId);
    if (category) {
      category.threadCount++;
      category.postCount++;
      category.lastPost = {
        threadId: thread.id,
        title: thread.title,
        author: thread.author.username,
        timestamp: thread.createdAt,
      };
    }

    this.save();
    return thread;
  }

  replyToThread(threadId: string, content: string, parentId?: string): ForumReply | null {
    const thread = this.threads.get(threadId);
    if (!thread || thread.isLocked) return null;

    const reply: ForumReply = {
      id: `reply_${Date.now()}`,
      threadId,
      content,
      author: { ...this.currentUser },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      likes: 0,
      isSolution: false,
      parentId,
    };

    thread.replies.push(reply);
    thread.updatedAt = Date.now();
    thread.lastReplyAt = reply.createdAt;

    // Update category
    const category = this.categories.get(thread.categoryId);
    if (category) {
      category.postCount++;
    }

    this.save();
    return reply;
  }

  editThread(threadId: string, updates: Partial<Pick<ForumThread, 'title' | 'content' | 'tags'>>): void {
    const thread = this.threads.get(threadId);
    if (thread && thread.author.id === this.currentUser.id) {
      Object.assign(thread, updates, { updatedAt: Date.now() });
      this.save();
    }
  }

  deleteThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    // Update category
    const category = this.categories.get(thread.categoryId);
    if (category) {
      category.threadCount = Math.max(0, category.threadCount - 1);
      category.postCount = Math.max(0, category.postCount - thread.replies.length);
    }

    this.threads.delete(threadId);
    this.save();

    if (this.currentThread === threadId) {
      this.navigateToCategory(thread.categoryId);
    }
  }

  likeThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.likes++;
      this.save();
    }
  }

  likeReply(replyId: string): void {
    for (const thread of this.threads.values()) {
      const reply = thread.replies.find(r => r.id === replyId);
      if (reply) {
        reply.likes++;
        this.save();
        return;
      }
    }
  }

  markAsSolution(threadId: string, replyId: string): void {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    if (thread.author.id === this.currentUser.id || this.currentUser.role === 'admin') {
      thread.replies.forEach(r => r.isSolution = false);
      const reply = thread.replies.find(r => r.id === replyId);
      if (reply) {
        reply.isSolution = true;
        this.save();
      }
    }
  }

  togglePin(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread && (this.currentUser.role === 'admin' || this.currentUser.role === 'moderator')) {
      thread.isPinned = !thread.isPinned;
      this.save();
    }
  }

  toggleLock(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread && (this.currentUser.role === 'admin' || this.currentUser.role === 'moderator')) {
      thread.isLocked = !thread.isLocked;
      this.save();
    }
  }

  // =============================================================================
  // NAVIGATION
  // =============================================================================
  navigateHome(): void {
    this.currentView = 'home';
    this.currentCategory = '';
    this.currentThread = '';
    this.render();
  }

  navigateToCategory(categoryId: string): void {
    this.currentView = 'category';
    this.currentCategory = categoryId;
    this.currentThread = '';
    this.render();
  }

  viewThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.views++;
      this.currentView = 'thread';
      this.currentThread = threadId;
      this.save();
      this.render();
    }
  }

  navigateNewThread(): void {
    this.currentView = 'new-thread';
    this.render();
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    switch (this.currentView) {
      case 'home':
        this.renderHome();
        break;
      case 'category':
        this.renderCategory();
        break;
      case 'thread':
        this.renderThread();
        break;
      case 'new-thread':
        this.renderNewThread();
        break;
    }
  }

  private renderHome(): void {
    const { colors } = FEATURES.theme;
    const c = getColors();
    const categories = Array.from(this.categories.values());

    this.container.innerHTML = `
      <div class="forum-home h-full flex flex-col" style="background: ${c.background}">
        <!-- Header -->
        <div class="p-4 border-b flex items-center justify-between" style="border-color: ${c.border}">
          <h1 class="text-2xl font-bold">💬 Community Forum</h1>
          <button id="new-thread-btn" class="px-4 py-2 bg-primary text-white rounded-lg font-medium">
            + New Thread
          </button>
        </div>
        
        <!-- Categories -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid gap-4">
            ${categories.map(cat => this.renderCategoryCard(cat)).join('')}
          </div>
        </div>
        
        <!-- Recent Threads -->
        <div class="border-t p-4" style="border-color: ${c.border}">
          <h2 class="font-bold mb-4">🔥 Recent Threads</h2>
          <div class="space-y-2">
            ${this.renderRecentThreads()}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderCategoryCard(category: ForumCategory): string {
    return `
      <div class="p-6 rounded-xl border cursor-pointer hover:shadow-lg transition-all"
           style="background: ${getColors().card}; border-color: ${getColors().border}"
           data-category="${category.id}">
        <div class="flex items-start gap-4">
          <span class="text-4xl">${category.icon}</span>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-1">${this.escapeHtml(category.name)}</h3>
            <p class="text-muted mb-3">${this.escapeHtml(category.description)}</p>
            <div class="flex items-center gap-4 text-sm text-muted">
              <span>📝 ${category.threadCount} threads</span>
              <span>💬 ${category.postCount} posts</span>
              ${category.lastPost ? `
                <span>Last: ${this.escapeHtml(category.lastPost.title)} by ${category.lastPost.author}</span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderRecentThreads(): string {
    const recentThreads = Array.from(this.threads.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    if (recentThreads.length === 0) {
      return '<p class="text-muted text-center py-4">No threads yet.</p>';
    }

    return recentThreads.map(thread => `
      <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
           data-thread="${thread.id}">
        <span class="text-2xl">${this.getCategoryIcon(thread.categoryId)}</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${this.escapeHtml(thread.title)}</div>
          <div class="text-sm text-muted">
            by ${thread.author.username} • ${this.formatTimeAgo(thread.updatedAt)}
          </div>
        </div>
        <div class="text-sm text-muted">
          💬 ${thread.replies.length} • 👁 ${thread.views}
        </div>
      </div>
    `).join('');
  }

  private getCategoryIcon(categoryId: string): string {
    return this.categories.get(categoryId)?.icon || '💬';
  }

  private renderCategory(): void {
    const category = this.categories.get(this.currentCategory);
    if (!category) return this.navigateHome();

    const threads = Array.from(this.threads.values())
      .filter(t => t.categoryId === this.currentCategory)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });

    const c = getColors();

    this.container.innerHTML = `
      <div class="forum-category h-full flex flex-col" style="background: ${c.background}">
        <!-- Breadcrumb -->
        <div class="p-4 border-b flex items-center gap-2 text-sm" style="border-color: ${c.border}">
          <button class="text-primary hover:underline" data-home>Forum</button>
          <span class="text-muted">/</span>
          <span>${this.escapeHtml(category.name)}</span>
        </div>
        
        <!-- Header -->
        <div class="p-4 flex items-center justify-between border-b" style="border-color: ${c.border}">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${category.icon}</span>
            <div>
              <h1 class="text-xl font-bold">${this.escapeHtml(category.name)}</h1>
              <p class="text-muted text-sm">${category.threadCount} threads • ${category.postCount} posts</p>
            </div>
          </div>
          <button id="new-thread-btn" class="px-4 py-2 bg-primary text-white rounded-lg font-medium">
            + New Thread
          </button>
        </div>
        
        <!-- Threads List -->
        <div class="flex-1 overflow-y-auto p-4">
          ${threads.length === 0 ? `
            <div class="text-center py-12 text-muted">
              <p class="text-4xl mb-4">📝</p>
              <p>No threads in this category yet.</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${threads.map(thread => this.renderThreadPreview(thread)).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderThreadPreview(thread: ForumThread): string {
    return `
      <div class="p-4 rounded-xl border hover:shadow-lg transition-all cursor-pointer"
           style="background: ${getColors().card}; border-color: ${getColors().border}"
           data-thread="${thread.id}">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
            ${thread.author.avatar || '👤'}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              ${thread.isPinned ? '<span class="text-yellow-500">📌</span>' : ''}
              ${thread.isLocked ? '<span class="text-red-500">🔒</span>' : ''}
              <h3 class="font-bold">${this.escapeHtml(thread.title)}</h3>
            </div>
            <p class="text-muted text-sm line-clamp-2 mb-2">${this.escapeHtml(thread.content.substring(0, 200))}</p>
            <div class="flex items-center gap-4 text-xs text-muted">
              <span>${thread.author.username}</span>
              <span>${this.formatTimeAgo(thread.createdAt)}</span>
              <span>💬 ${thread.replies.length}</span>
              <span>👁 ${thread.views}</span>
              <span>❤️ ${thread.likes}</span>
            </div>
            ${thread.tags.length > 0 ? `
              <div class="flex gap-2 mt-2">
                ${thread.tags.map(tag => `<span class="px-2 py-1 rounded-full bg-muted text-xs">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderThread(): void {
    const thread = this.threads.get(this.currentThread);
    if (!thread) return this.navigateHome();

    const c = getColors();

    this.container.innerHTML = `
      <div class="forum-thread h-full flex flex-col" style="background: ${c.background}">
        <!-- Breadcrumb -->
        <div class="p-4 border-b flex items-center justify-between" style="border-color: ${c.border}">
          <div class="flex items-center gap-2 text-sm">
            <button class="text-primary hover:underline" data-home>Forum</button>
            <span class="text-muted">/</span>
            <button class="text-primary hover:underline" data-category="${thread.categoryId}">
              ${this.escapeHtml(this.categories.get(thread.categoryId)?.name || 'Category')}
            </button>
            <span class="text-muted">/</span>
            <span class="truncate max-w-xs">${this.escapeHtml(thread.title)}</span>
          </div>
          ${thread.isLocked ? '<span class="text-red-500 text-sm">🔒 Locked</span>' : ''}
        </div>
        
        <!-- Main Post -->
        <div class="p-4 border-b" style="border-color: ${c.border}">
          ${this.renderPost(thread.author, thread.createdAt, thread.content, thread.likes, thread.id, thread.isPinned, thread.isLocked)}
        </div>
        
        <!-- Replies -->
        <div class="flex-1 overflow-y-auto p-4">
          <h3 class="font-bold mb-4">💬 ${thread.replies.length} Replies</h3>
          <div class="space-y-4">
            ${thread.replies.map(reply => this.renderReply(reply)).join('')}
          </div>
        </div>
        
        <!-- Reply Box -->
        ${!thread.isLocked ? `
          <div class="p-4 border-t" style="border-color: ${c.border}">
            <form id="reply-form" class="flex gap-2">
              <textarea id="reply-content" placeholder="Write your reply..." 
                        class="flex-1 p-3 rounded-lg border resize-none" rows="3"></textarea>
              <button type="submit" class="px-6 py-3 bg-primary text-white rounded-lg font-medium self-end">
                Post Reply
              </button>
            </form>
          </div>
        ` : `
          <div class="p-4 border-t text-center text-muted" style="border-color: ${c.border}">
            This thread is locked and cannot receive new replies.
          </div>
        `}
      </div>
    `;

    this.attachEvents();
  }

  private renderPost(author: ForumUser, timestamp: number, content: string, likes: number, 
                    id: string, isPinned?: boolean, isLocked?: boolean): string {
    const isOP = author.id === this.currentUser.id;
    
    return `
      <div class="p-6 rounded-xl" style="background: ${getColors().card}">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
            ${author.avatar || '👤'}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-bold">${this.escapeHtml(author.username)}</span>
              ${author.role === 'admin' ? '<span class="px-2 py-0.5 bg-red-500 text-white text-xs rounded">Admin</span>' : ''}
              ${author.role === 'moderator' ? '<span class="px-2 py-0.5 bg-purple-500 text-white text-xs rounded">Mod</span>' : ''}
              <span class="text-sm text-muted">${this.formatTimeAgo(timestamp)}</span>
            </div>
            <div class="prose max-w-none mb-4">
              ${this.renderMarkdown(content)}
            </div>
            <div class="flex items-center gap-4">
              <button class="like-btn flex items-center gap-1 text-muted hover:text-primary" data-id="${id}" data-type="thread">
                ❤️ ${likes}
              </button>
              ${isPinned ? '<span class="text-yellow-500 text-sm">📌 Pinned</span>' : ''}
              ${isLocked ? '<span class="text-red-500 text-sm">🔒 Locked</span>' : ''}
              ${isOP || this.currentUser.role === 'admin' ? `
                <button class="edit-btn text-muted hover:text-primary" data-id="${id}">✏️ Edit</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderReply(reply: ForumReply): string {
    const isOP = reply.author.id === this.currentUser.id;
    const isSolution = reply.isSolution;
    
    return `
      <div class="p-4 rounded-xl border ${isSolution ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}"
           style="background: ${getColors().card}; border-color: ${isSolution ? '#22c55e' : getColors().border}">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            ${reply.author.avatar || '👤'}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-bold">${this.escapeHtml(reply.author.username)}</span>
              ${reply.author.role === 'admin' ? '<span class="px-2 py-0.5 bg-red-500 text-white text-xs rounded">Admin</span>' : ''}
              <span class="text-sm text-muted">${this.formatTimeAgo(reply.createdAt)}</span>
              ${isSolution ? '<span class="px-2 py-0.5 bg-green-500 text-white text-xs rounded">✓ Solution</span>' : ''}
            </div>
            <div class="prose max-w-none mb-4">
              ${this.renderMarkdown(reply.content)}
            </div>
            <div class="flex items-center gap-4">
              <button class="like-btn flex items-center gap-1 text-muted hover:text-primary" data-id="${reply.id}" data-type="reply">
                ❤️ ${reply.likes}
              </button>
              ${!isSolution && this.currentUser.role === 'admin' ? `
                <button class="solution-btn text-muted hover:text-green-500" data-thread="${this.currentThread}" data-reply="${reply.id}">
                  ✓ Mark as Solution
                </button>
              ` : ''}
              ${isOP || this.currentUser.role === 'admin' ? `
                <button class="delete-reply-btn text-muted hover:text-red-500" data-id="${reply.id}">🗑️</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderNewThread(): void {
    if (this.currentUser.role === 'guest') {
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full">
          <div class="text-center p-8">
            <p class="text-4xl mb-4">🔒</p>
            <h2 class="text-xl font-bold mb-2">Login Required</h2>
            <p class="text-muted">You need to be logged in to create a thread.</p>
          </div>
        </div>
      `;
      return;
    }

    const c = getColors();
    const categories = Array.from(this.categories.values());

    this.container.innerHTML = `
      <div class="forum-new-thread h-full flex flex-col" style="background: ${c.background}">
        <!-- Breadcrumb -->
        <div class="p-4 border-b flex items-center gap-2 text-sm" style="border-color: ${c.border}">
          <button class="text-primary hover:underline" data-home>Forum</button>
          <span class="text-muted">/</span>
          <span>New Thread</span>
        </div>
        
        <!-- Form -->
        <div class="flex-1 overflow-y-auto p-4">
          <form id="create-thread-form" class="max-w-2xl mx-auto space-y-6">
            <div>
              <label class="block font-medium mb-2">Category</label>
              <select id="thread-category" class="w-full p-3 rounded-lg border" required>
                ${categories.map(cat => `
                  <option value="${cat.id}">${cat.icon} ${cat.name}</option>
                `).join('')}
              </select>
            </div>
            
            <div>
              <label class="block font-medium mb-2">Title</label>
              <input type="text" id="thread-title" class="w-full p-3 rounded-lg border" 
                     placeholder="Enter thread title..." required>
            </div>
            
            <div>
              <label class="block font-medium mb-2">Content (Markdown supported)</label>
              <textarea id="thread-content" class="w-full p-3 rounded-lg border resize-none" 
                        rows="10" placeholder="Write your post..." required></textarea>
            </div>
            
            <div>
              <label class="block font-medium mb-2">Tags (comma separated)</label>
              <input type="text" id="thread-tags" class="w-full p-3 rounded-lg border" 
                     placeholder="help, question, tips">
            </div>
            
            <div class="flex gap-4">
              <button type="submit" class="px-6 py-3 bg-primary text-white rounded-lg font-medium">
                Create Thread
              </button>
              <button type="button" class="px-6 py-3 bg-muted rounded-lg font-medium" data-cancel>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderMarkdown(text: string): string {
    // Simple markdown rendering
    let html = text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-primary pl-4 my-2">$1</blockquote>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[a-z]).*$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');

    return html;
  }

  private attachEvents(): void {
    // Home button
    this.container.querySelectorAll('[data-home]').forEach(el => {
      el.addEventListener('click', () => this.navigateHome());
    });

    // Category navigation
    this.container.querySelectorAll('[data-category]').forEach(el => {
      el.addEventListener('click', () => {
        const catId = (el as HTMLElement).dataset.category!;
        this.navigateToCategory(catId);
      });
    });

    // Thread navigation
    this.container.querySelectorAll('[data-thread]').forEach(el => {
      el.addEventListener('click', () => {
        const threadId = (el as HTMLElement).dataset.thread!;
        this.viewThread(threadId);
      });
    });

    // New thread button
    document.getElementById('new-thread-btn')?.addEventListener('click', () => {
      this.navigateNewThread();
    });

    // Cancel button
    this.container.querySelectorAll('[data-cancel]').forEach(el => {
      el.addEventListener('click', () => this.navigateHome());
    });

    // Create thread form
    document.getElementById('create-thread-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const categoryId = (document.getElementById('thread-category') as HTMLSelectElement).value;
      const title = (document.getElementById('thread-title') as HTMLInputElement).value;
      const content = (document.getElementById('thread-content') as HTMLTextAreaElement).value;
      const tagsStr = (document.getElementById('thread-tags') as HTMLInputElement).value;
      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

      const thread = this.createThread(categoryId, title, content, tags);
      this.viewThread(thread.id);
    });

    // Like buttons
    this.container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { id, type } = btn as HTMLElement;
        if (type === 'thread') {
          this.likeThread(id!);
        } else {
          this.likeReply(id!);
        }
        this.render();
      });
    });

    // Solution buttons
    this.container.querySelectorAll('.solution-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const threadId = (btn as HTMLElement).dataset.thread!;
        const replyId = (btn as HTMLElement).dataset.reply!;
        this.markAsSolution(threadId, replyId);
        this.render();
      });
    });

    // Reply form
    document.getElementById('reply-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const content = (document.getElementById('reply-content') as HTMLTextAreaElement).value;
      if (content.trim()) {
        this.replyToThread(this.currentThread, content);
        this.render();
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { ForumEngine, ForumUser, ForumCategory, ForumThread, ForumReply };
export default ForumEngine;