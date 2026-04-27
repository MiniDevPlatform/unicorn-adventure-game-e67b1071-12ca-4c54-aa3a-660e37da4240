/**
 * MiniDev ONE Template - Social Features
 * 
 * Feeds, posts, follows, likes, comments, and social interactions.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
  isFollowing: boolean;
  createdAt: number;
}

interface Post {
  id: string;
  author: User;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: number;
  poll?: Poll;
}

interface Poll {
  question: string;
  options: PollOption[];
  endsAt?: number;
  totalVotes: number;
  hasVoted: boolean;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

interface Comment {
  id: string;
  author: User;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: number;
  replies?: Comment[];
}

interface Story {
  id: string;
  author: User;
  image: string;
  viewers: number;
  isViewed: boolean;
  expiresAt: number;
}

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'share';
  actor: User;
  message: string;
  post?: Post;
  isRead: boolean;
  createdAt: number;
}

// =============================================================================
// SOCIAL FEED
// =============================================================================
class SocialFeed {
  private container: HTMLElement;
  private posts: Post[] = [];
  private users: Map<string, User> = new Map();
  private stories: Story[] = [];
  private notifications: Notification[] = [];
  private currentUser: User;
  private storageKey: string;
  private view: 'feed' | 'notifications' | 'profile' | 'explore' = 'feed';
  private sortBy: 'recent' | 'popular' | 'following' = 'recent';
  private page: number = 1;
  private hasMore: boolean = true;

  constructor(selector: string, storageKey: string = 'social') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.currentUser = this.getDefaultUser();
    this.load();
    this.render();
  }

  private getDefaultUser(): User {
    return {
      id: 'user_me',
      username: 'me',
      displayName: 'Current User',
      avatar: '👤',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
      isFollowing: false,
      createdAt: Date.now(),
    };
  }

  private load(): void {
    const saved = storage.get<{
      posts: Post[];
      users: User[];
      stories: Story[];
      notifications: Notification[];
    }>(this.storageKey);

    if (saved) {
      this.posts = saved.posts || [];
      saved.users?.forEach(u => this.users.set(u.id, u));
      this.stories = saved.stories || [];
      this.notifications = saved.notifications || [];
    } else {
      this.initSampleData();
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      posts: this.posts,
      users: Array.from(this.users.values()),
      stories: this.stories,
      notifications: this.notifications,
    });
  }

  private initSampleData(): void {
    // Sample users
    const sampleUsers: User[] = [
      { id: 'user_1', username: 'alice', displayName: 'Alice Johnson', avatar: '👩', bio: 'Designer & Developer', followers: 1250, following: 89, posts: 42, isVerified: true, isFollowing: true, createdAt: Date.now() - 86400000 * 30 },
      { id: 'user_2', username: 'bob', displayName: 'Bob Smith', avatar: '👨', bio: 'Tech enthusiast', followers: 890, following: 156, posts: 28, isVerified: false, isFollowing: false, createdAt: Date.now() - 86400000 * 45 },
      { id: 'user_3', username: 'carol', displayName: 'Carol White', avatar: '👩‍🦰', bio: 'Creative soul', followers: 2100, following: 234, posts: 67, isVerified: true, isFollowing: true, createdAt: Date.now() - 86400000 * 60 },
    ];
    sampleUsers.forEach(u => this.users.set(u.id, u));

    // Sample posts
    const samplePosts: Post[] = [
      {
        id: 'post_1',
        author: sampleUsers[0],
        content: 'Just launched my new project! 🚀 Check it out and let me know what you think. #coding #launch',
        likes: 234,
        comments: 45,
        shares: 12,
        isLiked: false,
        isBookmarked: false,
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: 'post_2',
        author: sampleUsers[1],
        content: 'The sunset today was absolutely stunning. Sometimes you just need to stop and appreciate the beauty around us. 🌅',
        images: ['https://picsum.photos/600/400?random=10'],
        likes: 567,
        comments: 89,
        shares: 34,
        isLiked: true,
        isBookmarked: false,
        createdAt: Date.now() - 3600000 * 5,
      },
      {
        id: 'post_3',
        author: sampleUsers[2],
        content: 'Working on something big... 👀',
        likes: 89,
        comments: 12,
        shares: 3,
        isLiked: false,
        isBookmarked: true,
        createdAt: Date.now() - 3600000 * 8,
      },
    ];
    this.posts = samplePosts;

    // Sample stories
    this.stories = sampleUsers.map((u, i) => ({
      id: `story_${i}`,
      author: u,
      image: `https://picsum.photos/200/350?random=${i + 20}`,
      viewers: Math.floor(Math.random() * 500),
      isViewed: i > 1,
      expiresAt: Date.now() + 86400000,
    }));

    // Sample notifications
    this.notifications = [
      { id: 'notif_1', type: 'like', actor: sampleUsers[0], message: 'liked your post', isRead: false, createdAt: Date.now() - 1800000 },
      { id: 'notif_2', type: 'follow', actor: sampleUsers[2], message: 'started following you', isRead: false, createdAt: Date.now() - 3600000 },
      { id: 'notif_3', type: 'comment', actor: sampleUsers[1], message: 'commented: "Great work!"', isRead: true, createdAt: Date.now() - 7200000 },
    ];

    this.save();
  }

  // =============================================================================
  // POST MANAGEMENT
  // =============================================================================
  createPost(content: string, images?: string[]): Post {
    const post: Post = {
      id: `post_${Date.now()}`,
      author: this.currentUser,
      content,
      images,
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: Date.now(),
    };

    this.posts.unshift(post);
    this.currentUser.posts++;
    this.save();
    this.render();
    return post;
  }

  deletePost(postId: string): void {
    this.posts = this.posts.filter(p => p.id !== postId);
    this.currentUser.posts--;
    this.save();
    this.render();
  }

  likePost(postId: string): void {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
      this.save();
      this.render();
    }
  }

  bookmarkPost(postId: string): void {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      post.isBookmarked = !post.isBookmarked;
      this.save();
      this.render();
    }
  }

  // =============================================================================
  // USER MANAGEMENT
  // =============================================================================
  followUser(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.isFollowing = !user.isFollowing;
      user.followers += user.isFollowing ? 1 : -1;
      this.currentUser.following += user.isFollowing ? 1 : -1;
      this.save();
      this.render();
    }
  }

  // =============================================================================
  // COMMENTS
  // =============================================================================
  addComment(postId: string, content: string): Comment {
    const post = this.posts.find(p => p.id === postId);
    if (!post) throw new Error('Post not found');

    const comment: Comment = {
      id: `comment_${Date.now()}`,
      author: this.currentUser,
      content,
      likes: 0,
      isLiked: false,
      createdAt: Date.now(),
    };

    post.comments++;
    this.save();
    this.render();
    return comment;
  }

  // =============================================================================
  // NAVIGATION
  // =============================================================================
  setView(view: typeof this.view): void {
    this.view = view;
    this.page = 1;
    this.render();
  }

  setSortBy(sortBy: typeof this.sortBy): void {
    this.sortBy = sortBy;
    this.page = 1;
    this.render();
  }

  loadMore(): void {
    this.page++;
    // In real app, would fetch more posts
    this.hasMore = false;
    this.render();
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    switch (this.view) {
      case 'feed':
        this.renderFeed();
        break;
      case 'notifications':
        this.renderNotifications();
        break;
      case 'profile':
        this.renderProfile();
        break;
      case 'explore':
        this.renderExplore();
        break;
    }
  }

  private renderFeed(): void {
    const c = getColors();
    const unreadCount = this.notifications.filter(n => !n.isRead).length;

    this.container.innerHTML = `
      <div class="social-feed flex flex-col h-full" style="background: ${c.background}">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-border bg-card">
          <h1 class="text-xl font-bold">${FEATURES.pwa.name || 'Social'}</h1>
          <div class="flex items-center gap-4">
            <button id="search-btn" class="p-2 rounded-lg hover:bg-muted">🔍</button>
            <button id="notifications-btn" class="p-2 rounded-lg hover:bg-muted relative">
              🔔
              ${unreadCount > 0 ? `<span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">${unreadCount}</span>` : ''}
            </button>
          </div>
        </div>

        <!-- Stories -->
        ${this.renderStories()}

        <!-- Sort Options -->
        <div class="flex gap-2 px-4 py-2 border-b border-border">
          <button class="sort-btn px-3 py-1 rounded-lg ${this.sortBy === 'recent' ? 'bg-primary text-white' : 'bg-muted'}" data-sort="recent">Recent</button>
          <button class="sort-btn px-3 py-1 rounded-lg ${this.sortBy === 'popular' ? 'bg-primary text-white' : 'bg-muted'}" data-sort="popular">Popular</button>
          <button class="sort-btn px-3 py-1 rounded-lg ${this.sortBy === 'following' ? 'bg-primary text-white' : 'bg-muted'}" data-sort="following">Following</button>
        </div>

        <!-- Create Post -->
        <div class="p-4 border-b border-border">
          <div class="flex gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
              ${this.currentUser.avatar}
            </div>
            <div class="flex-1">
              <input type="text" id="post-input" placeholder="What's on your mind?" 
                     class="w-full px-4 py-3 rounded-full bg-muted border-none focus:ring-2 focus:ring-primary">
              <div class="flex gap-2 mt-3">
                <button id="add-image" class="px-4 py-2 bg-muted rounded-lg flex items-center gap-2">📷 Image</button>
                <button id="create-poll" class="px-4 py-2 bg-muted rounded-lg flex items-center gap-2">📊 Poll</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Posts Feed -->
        <div class="flex-1 overflow-y-auto">
          <div id="posts-container" class="space-y-4">
            ${this.posts.map(post => this.renderPost(post)).join('')}
          </div>
          
          ${this.hasMore ? `
            <button id="load-more" class="w-full py-4 text-center text-muted hover:text-primary">
              Load more...
            </button>
          ` : ''}
        </div>

        <!-- Bottom Navigation -->
        <div class="flex justify-around py-3 border-t border-border bg-card">
          <button class="nav-btn p-2" data-view="feed">🏠<span class="block text-xs">Home</span></button>
          <button class="nav-btn p-2" data-view="explore">🔍<span class="block text-xs">Explore</span></button>
          <button class="nav-btn p-2" data-view="notifications">🔔<span class="block text-xs">Alerts</span></button>
          <button class="nav-btn p-2" data-view="profile">👤<span class="block text-xs">Profile</span></button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderStories(): string {
    return `
      <div class="p-4 border-b border-border">
        <div class="flex gap-4 overflow-x-auto pb-2">
          <!-- Add Story -->
          <div class="flex-shrink-0 w-20 text-center cursor-pointer">
            <div class="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-dashed border-border hover:border-primary">
              ➕
            </div>
            <span class="text-xs text-muted mt-1 block">Add Story</span>
          </div>
          
          ${this.stories.map(story => `
            <div class="flex-shrink-0 w-20 text-center cursor-pointer" data-user="${story.author.id}">
              <div class="w-16 h-16 mx-auto rounded-full ${story.isViewed ? 'border-2 border-muted' : 'border-2 border-primary'} overflow-hidden p-0.5">
                <div class="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  <img src="${story.image}" alt="" class="w-full h-full object-cover">
                </div>
              </div>
              <span class="text-xs text-muted mt-1 block truncate">${story.author.displayName}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderPost(post: Post): string {
    return `
      <article class="p-4 border-b border-border" data-post="${post.id}">
        <!-- Author Header -->
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
            ${post.author.avatar}
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-bold">${post.author.displayName}</span>
              ${post.author.isVerified ? '<span class="text-blue-500">✓</span>' : ''}
            </div>
            <span class="text-sm text-muted">@${post.author.username} • ${this.formatTimeAgo(post.createdAt)}</span>
          </div>
          <button class="p-2 hover:bg-muted rounded-full">•••</button>
        </div>

        <!-- Content -->
        <p class="mb-3 whitespace-pre-wrap">${this.escapeHtml(post.content)}</p>

        <!-- Images -->
        ${post.images && post.images.length > 0 ? `
          <div class="mb-3 rounded-xl overflow-hidden ${post.images.length > 1 ? 'grid grid-cols-2 gap-1' : ''}">
            ${post.images.map(img => `<img src="${img}" alt="" class="w-full object-cover ${post.images!.length > 1 ? 'h-48' : 'max-h-96'}">`).join('')}
          </div>
        ` : ''}

        <!-- Poll -->
        ${post.poll ? this.renderPoll(post.poll) : ''}

        <!-- Actions -->
        <div class="flex items-center justify-between pt-3">
          <button class="action-btn flex items-center gap-1 ${post.isLiked ? 'text-red-500' : 'text-muted hover:text-red-500'}" data-action="like" data-id="${post.id}">
            ${post.isLiked ? '❤️' : '🤍'} ${post.likes}
          </button>
          <button class="action-btn flex items-center gap-1 text-muted hover:text-blue-500" data-action="comment" data-id="${post.id}">
            💬 ${post.comments}
          </button>
          <button class="action-btn flex items-center gap-1 text-muted hover:text-green-500" data-action="share" data-id="${post.id}">
            ↗️ ${post.shares}
          </button>
          <button class="action-btn ${post.isBookmarked ? 'text-yellow-500' : 'text-muted hover:text-yellow-500'}" data-action="bookmark" data-id="${post.id}">
            ${post.isBookmarked ? '🔖' : '📑'}
          </button>
        </div>
      </article>
    `;
  }

  private renderPoll(poll: Poll): string {
    return `
      <div class="poll-container p-4 bg-muted rounded-xl mb-3">
        <h4 class="font-bold mb-3">${this.escapeHtml(poll.question)}</h4>
        <div class="space-y-2">
          ${poll.options.map(option => `
            <button class="poll-option w-full p-3 rounded-lg bg-card border border-border hover:border-primary transition-colors text-left"
                    data-option="${option.id}" ${poll.hasVoted ? 'disabled' : ''}>
              <div class="flex justify-between mb-1">
                <span>${this.escapeHtml(option.text)}</span>
                ${poll.hasVoted ? `<span class="text-muted">${option.percentage}%</span>` : ''}
              </div>
              ${poll.hasVoted ? `
                <div class="h-2 bg-muted rounded-full overflow-hidden">
                  <div class="h-full bg-primary rounded-full" style="width: ${option.percentage}%"></div>
                </div>
              ` : ''}
            </button>
          `).join('')}
        </div>
        <p class="text-sm text-muted mt-2">${poll.totalVotes} votes • ${poll.endsAt ? `Ends ${this.formatTimeAgo(poll.endsAt)}` : 'No end date'}</p>
      </div>
    `;
  }

  private renderNotifications(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="social-notifications flex flex-col h-full" style="background: ${c.background}">
        <div class="p-4 border-b border-border bg-card">
          <h1 class="text-xl font-bold">Notifications</h1>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4">
          ${this.notifications.length === 0 ? `
            <div class="text-center py-12 text-muted">
              <p class="text-4xl mb-4">🔔</p>
              <p>No notifications yet</p>
            </div>
          ` : `
            <div class="space-y-4">
              ${this.notifications.map(notif => `
                <div class="flex gap-3 p-4 rounded-xl ${notif.isRead ? 'bg-card' : 'bg-primary/5'} border border-border cursor-pointer hover:bg-muted">
                  <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                    ${notif.actor.avatar}
                  </div>
                  <div class="flex-1">
                    <p><strong>${notif.actor.displayName}</strong> ${notif.message}</p>
                    <p class="text-sm text-muted">${this.formatTimeAgo(notif.createdAt)}</p>
                  </div>
                  ${notif.post ? `<img src="${notif.post.images?.[0] || 'https://picsum.photos/100/100'}" alt="" class="w-12 h-12 rounded-lg object-cover">` : ''}
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <button class="nav-btn p-3 border-t border-border bg-card" data-view="feed">← Back to Feed</button>
      </div>
    `;

    this.attachEvents();
  }

  private renderProfile(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="social-profile flex flex-col h-full" style="background: ${c.background}">
        <!-- Header -->
        <div class="relative">
          <div class="h-32 bg-gradient-to-r from-primary to-secondary"></div>
          <div class="absolute bottom-0 left-6 transform translate-y-1/2">
            <div class="w-24 h-24 rounded-full bg-card border-4 border-background flex items-center justify-center text-4xl">
              ${this.currentUser.avatar}
            </div>
          </div>
        </div>

        <!-- Profile Info -->
        <div class="pt-16 px-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold">${this.currentUser.displayName}</h1>
              <p class="text-muted">@${this.currentUser.username}</p>
            </div>
            <button class="px-4 py-2 border border-border rounded-lg">Edit Profile</button>
          </div>

          <p class="mt-4 text-muted">${this.currentUser.bio || 'No bio yet'}</p>

          <div class="flex gap-6 mt-4 text-sm text-muted">
            <span><strong>${this.currentUser.posts}</strong> posts</span>
            <span><strong>${this.currentUser.followers}</strong> followers</span>
            <span><strong>${this.currentUser.following}</strong> following</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-border mt-4">
          <button class="flex-1 py-3 text-center font-medium border-b-2 border-primary">Posts</button>
          <button class="flex-1 py-3 text-center font-medium text-muted">Replies</button>
          <button class="flex-1 py-3 text-center font-medium text-muted">Media</button>
          <button class="flex-1 py-3 text-center font-medium text-muted">Likes</button>
        </div>

        <!-- Posts -->
        <div class="flex-1 overflow-y-auto p-4">
          ${this.posts.filter(p => p.author.id === this.currentUser.id).map(post => this.renderPost(post)).join('')}
        </div>

        <button class="nav-btn p-3 border-t border-border bg-card" data-view="feed">← Back to Feed</button>
      </div>
    `;

    this.attachEvents();
  }

  private renderExplore(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="social-explore flex flex-col h-full" style="background: ${c.background}">
        <!-- Search -->
        <div class="p-4 border-b border-border bg-card">
          <input type="search" placeholder="Search users, posts, tags..." 
                 class="w-full px-4 py-3 rounded-full bg-muted border-none focus:ring-2 focus:ring-primary">
        </div>

        <!-- Trending -->
        <div class="p-4">
          <h2 class="font-bold mb-4">🔥 Trending</h2>
          <div class="space-y-4">
            ${['#coding', '#design', '#ai', '#tech', '#music'].map(tag => `
              <div class="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary">
                <div>
                  <span class="font-bold">${tag}</span>
                  <p class="text-sm text-muted">12.5K posts</p>
                </div>
                <button class="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">Follow</button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Suggested Users -->
        <div class="p-4 border-t border-border">
          <h2 class="font-bold mb-4">👥 Suggested for you</h2>
          <div class="space-y-3">
            ${Array.from(this.users.values()).filter(u => u.id !== this.currentUser.id && !u.isFollowing).map(user => `
              <div class="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                  ${user.avatar}
                </div>
                <div class="flex-1">
                  <div class="font-bold">${user.displayName}</div>
                  <p class="text-sm text-muted">@${user.username} • ${user.followers} followers</p>
                </div>
                <button class="follow-btn px-4 py-2 bg-primary text-white rounded-full text-sm" data-user="${user.id}">
                  Follow
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <button class="nav-btn p-3 border-t border-border bg-card" data-view="feed">← Back to Feed</button>
      </div>
    `;

    this.attachEvents();
  }

  // =============================================================================
  // EVENTS
  // =============================================================================
  private attachEvents(): void {
    // Navigation
    this.container.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as typeof this.view;
        this.setView(view);
      });
    });

    // Sort buttons
    this.container.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sort = (btn as HTMLElement).dataset.sort as typeof this.sortBy;
        this.setSortBy(sort);
      });
    });

    // Create post
    const postInput = document.getElementById('post-input') as HTMLInputElement;
    postInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && postInput.value.trim()) {
        this.createPost(postInput.value.trim());
        postInput.value = '';
      }
    });

    // Action buttons (like, comment, etc.)
    this.container.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        const id = (btn as HTMLElement).dataset.id;

        if (action === 'like') this.likePost(id!);
        else if (action === 'bookmark') this.bookmarkPost(id!);
      });
    });

    // Follow buttons
    this.container.querySelectorAll('.follow-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = (btn as HTMLElement).dataset.user;
        if (userId) this.followUser(userId);
      });
    });

    // Load more
    document.getElementById('load-more')?.addEventListener('click', () => this.loadMore());

    // Notifications
    document.getElementById('notifications-btn')?.addEventListener('click', () => this.setView('notifications'));
  }

  // =============================================================================
  // HELPERS
  // =============================================================================
  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { SocialFeed, User, Post, Comment, Story, Notification, Poll, PollOption };
export default SocialFeed;