/**
 * MiniDev ONE Template - Wiki Renderer
 * 
 * Wiki/knowledge base with markdown, search, and categories.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: number;
  updatedAt: number;
  views: number;
  likes: number;
  version: number;
  parent?: string;
  children?: string[];
}

interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  articleCount: number;
  color: string;
}

interface WikiSearchResult {
  article: WikiArticle;
  relevance: number;
  matchedIn: ('title' | 'content' | 'tags')[];
}

// =============================================================================
// MARKDOWN PARSER
// =============================================================================
class MarkdownParser {
  parse(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-4">');

    // Blockquotes
    html = html.replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-primary pl-4 my-4 text-muted">$1</blockquote>');

    // Lists
    html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-6 my-4">$&</ul>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr class="my-8 border-border">');

    // Tables (basic)
    html = this.parseTables(html);

    // Paragraphs
    html = html.replace(/^(?!<[a-z]|$)(.*$)/gm, '<p class="my-4">$1</p>');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<[a-z]+.*<\/a-z]+>)<\/p>/g, '$1');
    html = html.replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>.*<\/pre>)<\/p>/gs, '$1');
    html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/gs, '$1');
    html = html.replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/gs, '$1');

    return html;
  }

  private parseTables(html: string): string {
    const tableRegex = /^\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/gm;
    
    return html.replace(tableRegex, (match, header, body) => {
      const headers = header.split('|').filter(h => h.trim()).map(h => `<th class="px-4 py-2 text-left border">${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td class="px-4 py-2 border">${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      
      return `<table class="w-full border-collapse my-6"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });
  }

  extractExcerpt(markdown: string, maxLength: number = 160): string {
    // Remove markdown formatting
    let text = markdown
      .replace(/^#+\s/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\- /gm, '')
      .replace(/^\* /gm, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    
    return text;
  }
}

// =============================================================================
// WIKI RENDERER
// =============================================================================
class WikiRenderer {
  private container: HTMLElement;
  private articles: Map<string, WikiArticle> = new Map();
  private categories: Map<string, WikiCategory> = new Map();
  private storageKey: string;
  private currentArticle: string = '';
  private searchQuery: string = '';
  private markdown: MarkdownParser;
  private editorMode: boolean = false;

  constructor(selector: string, storageKey: string = 'wiki') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.markdown = new MarkdownParser();
    this.load();
    this.render();
  }

  private load(): void {
    const saved = storage.get<{
      articles: WikiArticle[];
      categories: WikiCategory[];
    }>(this.storageKey);

    if (saved) {
      saved.articles.forEach(a => this.articles.set(a.id, a));
      saved.categories.forEach(c => this.categories.set(c.id, c));
    } else {
      this.initDefaultContent();
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      articles: Array.from(this.articles.values()),
      categories: Array.from(this.categories.values()),
    });
  }

  private initDefaultContent(): void {
    // Default categories
    const defaultCategories: WikiCategory[] = [
      { id: 'cat_getting_started', name: 'Getting Started', slug: 'getting-started', description: 'Learn the basics', icon: '🚀', articleCount: 0, color: '#22c55e' },
      { id: 'cat_tutorials', name: 'Tutorials', slug: 'tutorials', description: 'Step-by-step guides', icon: '📚', articleCount: 0, color: '#3b82f6' },
      { id: 'cat_reference', name: 'Reference', slug: 'reference', description: 'API and documentation', icon: '📖', articleCount: 0, color: '#f59e0b' },
      { id: 'cat_guides', name: 'How-To Guides', slug: 'guides', description: 'Practical guides', icon: '🔧', articleCount: 0, color: '#8b5cf6' },
    ];
    defaultCategories.forEach(c => this.categories.set(c.id, c));

    // Default articles
    const defaultArticles: WikiArticle[] = [
      {
        id: 'art_welcome',
        slug: 'welcome',
        title: 'Welcome to the Wiki',
        content: `# Welcome to the Wiki

Welcome to our knowledge base! This wiki contains all the information you need.

## Getting Started

1. Browse categories using the sidebar
2. Use **search** to find specific topics
3. Create an account to contribute

## Features

- **Markdown support** - Write articles in Markdown
- **Categories** - Organize content
- **Version history** - Track changes
- **Search** - Find content quickly

> Tip: Press \`/\` anywhere to open search

## Need Help?

Contact support if you can't find what you're looking for.`,
        excerpt: 'Welcome to our knowledge base!',
        category: 'cat_getting_started',
        tags: ['welcome', 'intro', 'basics'],
        author: 'Admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0,
        likes: 0,
        version: 1,
      },
    ];
    defaultArticles.forEach(a => this.articles.set(a.id, a));

    // Update category counts
    defaultCategories.forEach(cat => {
      cat.articleCount = defaultArticles.filter(a => a.category === cat.id).length;
    });

    this.save();
  }

  // =============================================================================
  // ARTICLE MANAGEMENT
  // =============================================================================
  createArticle(article: Omit<WikiArticle, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'likes' | 'version'>): WikiArticle {
    const newArticle: WikiArticle = {
      ...article,
      id: `art_${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      likes: 0,
      version: 1,
    };
    this.articles.set(newArticle.id, newArticle);
    this.updateCategoryCount(article.category);
    this.save();
    return newArticle;
  }

  updateArticle(id: string, updates: Partial<WikiArticle>): void {
    const article = this.articles.get(id);
    if (article) {
      Object.assign(article, updates, { updatedAt: Date.now(), version: article.version + 1 });
      this.save();
    }
  }

  deleteArticle(id: string): void {
    const article = this.articles.get(id);
    if (article) {
      this.updateCategoryCount(article.category, true);
      this.articles.delete(id);
      this.save();
      if (this.currentArticle === id) {
        this.currentArticle = '';
        this.render();
      }
    }
  }

  private updateCategoryCount(categoryId: string, decrease: boolean = false): void {
    const category = this.categories.get(categoryId);
    if (category) {
      if (decrease) {
        category.articleCount = Math.max(0, category.articleCount - 1);
      } else {
        category.articleCount++;
      }
    }
  }

  // =============================================================================
  // NAVIGATION
  // =============================================================================
  selectArticle(slug: string): void {
    const article = Array.from(this.articles.values()).find(a => a.slug === slug);
    if (article) {
      article.views++;
      this.currentArticle = article.id;
      this.save();
      this.render();
    }
  }

  selectCategory(categoryId: string): void {
    this.currentArticle = `cat_${categoryId}`;
    this.render();
  }

  // =============================================================================
  // SEARCH
  // =============================================================================
  search(query: string): WikiSearchResult[] {
    this.searchQuery = query.toLowerCase().trim();
    if (!this.searchQuery) return [];

    const results: WikiSearchResult[] = [];

    for (const article of this.articles.values()) {
      const matchedIn: ('title' | 'content' | 'tags')[] = [];
      let relevance = 0;

      if (article.title.toLowerCase().includes(this.searchQuery)) {
        matchedIn.push('title');
        relevance += 10;
      }

      if (article.content.toLowerCase().includes(this.searchQuery)) {
        matchedIn.push('content');
        relevance += 5;
      }

      if (article.tags.some(t => t.toLowerCase().includes(this.searchQuery))) {
        matchedIn.push('tags');
        relevance += 8;
      }

      if (relevance > 0) {
        results.push({ article, relevance, matchedIn });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    const { colors } = FEATURES.theme;
    const isDark = getColors() === FEATURES.theme.colors.dark;
    const c = isDark ? colors.dark : colors.light;

    this.container.innerHTML = `
      <div class="flex h-full" style="background: ${c.background}">
        <!-- Sidebar -->
        <div class="w-72 border-r overflow-y-auto flex-shrink-0" style="background: ${c.card}; border-color: ${c.border}">
          <!-- Search -->
          <div class="p-4 border-b" style="border-color: ${c.border}">
            <form id="wiki-search" class="relative">
              <input type="text" id="search-input" placeholder="Search wiki..." 
                     class="w-full px-4 py-2 pl-10 rounded-lg border" value="${this.escapeHtml(this.searchQuery)}">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
            </form>
          </div>
          
          <!-- Categories -->
          <div class="p-4">
            <h3 class="font-bold mb-3 flex items-center gap-2">
              📁 Categories
              <button id="new-category" class="ml-auto text-sm text-primary">+</button>
            </h3>
            ${this.renderCategories()}
          </div>
          
          <!-- Recent Articles -->
          <div class="p-4 border-t" style="border-color: ${c.border}">
            <h3 class="font-bold mb-3">📄 Recent</h3>
            ${this.renderRecentArticles()}
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="flex-1 overflow-y-auto">
          ${this.currentArticle.startsWith('cat_') 
            ? this.renderCategoryView() 
            : this.currentArticle 
              ? this.renderArticleView()
              : this.renderHomeView()}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderCategories(): string {
    const categories = Array.from(this.categories.values());
    
    if (categories.length === 0) {
      return '<p class="text-muted">No categories yet</p>';
    }

    return categories.map(cat => `
      <div class="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted" 
           data-category="${cat.id}">
        <span style="color: ${cat.color}">${cat.icon}</span>
        <span class="flex-1">${this.escapeHtml(cat.name)}</span>
        <span class="text-sm text-muted">${cat.articleCount}</span>
      </div>
    `).join('');
  }

  private renderRecentArticles(): string {
    const recent = Array.from(this.articles.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    if (recent.length === 0) {
      return '<p class="text-muted">No articles yet</p>';
    }

    return recent.map(article => `
      <div class="p-2 rounded-lg cursor-pointer hover:bg-muted" data-article="${article.slug}">
        <div class="font-medium truncate">${this.escapeHtml(article.title)}</div>
        <div class="text-xs text-muted">${this.formatDate(article.updatedAt)}</div>
      </div>
    `).join('');
  }

  private renderCategoryView(): string {
    const categoryId = this.currentArticle.replace('cat_', '');
    const category = this.categories.get(categoryId);
    if (!category) return this.renderHomeView();

    const articles = Array.from(this.articles.values())
      .filter(a => a.category === categoryId);

    return `
      <div class="max-w-4xl mx-auto p-8">
        <div class="flex items-center gap-3 mb-8">
          <span class="text-4xl">${category.icon}</span>
          <div>
            <h1 class="text-3xl font-bold">${this.escapeHtml(category.name)}</h1>
            <p class="text-muted">${this.escapeHtml(category.description)}</p>
          </div>
        </div>
        
        <div class="flex justify-between items-center mb-6">
          <p class="text-muted">${articles.length} articles</p>
          <button id="new-article" class="px-4 py-2 bg-primary text-white rounded-lg font-medium">
            + New Article
          </button>
        </div>
        
        <div class="grid gap-4">
          ${articles.length === 0 ? `
            <div class="text-center py-12 text-muted">
              <p class="text-4xl mb-4">📝</p>
              <p>No articles in this category yet.</p>
            </div>
          ` : articles.map(article => `
            <div class="p-6 rounded-xl border cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                 data-article="${article.slug}" style="background: ${getColors().card}; border-color: ${getColors().border}">
              <h2 class="text-xl font-bold mb-2">${this.escapeHtml(article.title)}</h2>
              <p class="text-muted mb-4">${this.escapeHtml(article.excerpt)}</p>
              <div class="flex items-center gap-4 text-sm text-muted">
                <span>👤 ${article.author}</span>
                <span>📅 ${this.formatDate(article.updatedAt)}</span>
                <span>👁 ${article.views}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderArticleView(): string {
    const article = this.articles.get(this.currentArticle);
    if (!article) return this.renderHomeView();

    const category = this.categories.get(article.category);

    return `
      <article class="max-w-4xl mx-auto p-8">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-muted mb-6">
          <a href="#" data-home class="hover:text-primary">Home</a>
          <span>/</span>
          ${category ? `
            <a href="#" data-category="${category.id}" class="hover:text-primary">${this.escapeHtml(category.name)}</a>
            <span>/</span>
          ` : ''}
          <span>${this.escapeHtml(article.title)}</span>
        </nav>
        
        <!-- Header -->
        <header class="mb-8">
          <h1 class="text-4xl font-bold mb-4">${this.escapeHtml(article.title)}</h1>
          <div class="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>👤 ${article.author}</span>
            <span>📅 ${this.formatDate(article.updatedAt)}</span>
            <span>👁 ${article.views} views</span>
            <span>v${article.version}</span>
            ${article.tags.map(tag => `
              <span class="px-2 py-1 rounded-full bg-muted text-xs">${this.escapeHtml(tag)}</span>
            `).join('')}
          </div>
        </header>
        
        <!-- Content -->
        <div class="prose max-w-none">
          ${this.markdown.parse(article.content)}
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-4 mt-8 pt-8 border-t">
          <button id="like-article" class="px-4 py-2 rounded-lg bg-muted flex items-center gap-2">
            👍 Like (${article.likes})
          </button>
          <button id="edit-article" class="px-4 py-2 rounded-lg bg-muted">
            ✏️ Edit
          </button>
          <button id="delete-article" class="px-4 py-2 rounded-lg bg-red-100 text-red-600">
            🗑️ Delete
          </button>
        </div>
      </article>
    `;
  }

  private renderHomeView(): string {
    const featured = Array.from(this.articles.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 3);

    const categories = Array.from(this.categories.values());

    return `
      <div class="max-w-4xl mx-auto p-8">
        <!-- Hero -->
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold mb-4">📖 Knowledge Base</h1>
          <p class="text-xl text-muted mb-6">Find answers, guides, and documentation</p>
          <form id="hero-search" class="max-w-lg mx-auto relative">
            <input type="text" placeholder="Search articles..." 
                   class="w-full px-6 py-4 rounded-xl border text-lg">
            <button type="submit" class="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              🔍
            </button>
          </form>
        </div>
        
        <!-- Categories Grid -->
        <section class="mb-12">
          <h2 class="text-2xl font-bold mb-6">Browse by Category</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${categories.map(cat => `
              <div class="p-6 rounded-xl border cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                   data-category="${cat.id}" style="background: ${getColors().card}; border-color: ${getColors().border}">
                <span class="text-3xl mb-2 block">${cat.icon}</span>
                <h3 class="font-bold">${this.escapeHtml(cat.name)}</h3>
                <p class="text-sm text-muted">${cat.articleCount} articles</p>
              </div>
            `).join('')}
          </div>
        </section>
        
        <!-- Popular Articles -->
        ${featured.length > 0 ? `
          <section>
            <h2 class="text-2xl font-bold mb-6">🔥 Popular Articles</h2>
            <div class="grid gap-4">
              ${featured.map(article => `
                <div class="p-6 rounded-xl border cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                     data-article="${article.slug}" style="background: ${getColors().card}; border-color: ${getColors().border}">
                  <h3 class="font-bold mb-2">${this.escapeHtml(article.title)}</h3>
                  <p class="text-muted mb-4">${this.escapeHtml(article.excerpt)}</p>
                  <div class="flex items-center gap-4 text-sm text-muted">
                    <span>👁 ${article.views}</span>
                    <span>📅 ${this.formatDate(article.updatedAt)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        ` : ''}
      </div>
    `;
  }

  private attachEvents(): void {
    // Search
    const searchForm = document.getElementById('wiki-search') || document.getElementById('hero-search');
    searchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = searchForm.querySelector('input') as HTMLInputElement;
      if (input?.value) {
        const results = this.search(input.value);
        this.showSearchResults(results);
      }
    });

    // Category navigation
    this.container.querySelectorAll('[data-category]').forEach(el => {
      el.addEventListener('click', () => {
        const catId = (el as HTMLElement).dataset.category!;
        this.selectCategory(catId);
      });
    });

    // Article navigation
    this.container.querySelectorAll('[data-article]').forEach(el => {
      el.addEventListener('click', () => {
        const slug = (el as HTMLElement).dataset.article!;
        this.selectArticle(slug);
      });
    });

    // Home
    this.container.querySelectorAll('[data-home]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentArticle = '';
        this.render();
      });
    });

    // Article actions
    document.getElementById('like-article')?.addEventListener('click', () => {
      const article = this.articles.get(this.currentArticle);
      if (article) {
        article.likes++;
        this.save();
        this.render();
      }
    });

    document.getElementById('delete-article')?.addEventListener('click', () => {
      if (confirm('Delete this article?')) {
        this.deleteArticle(this.currentArticle);
      }
    });
  }

  private showSearchResults(results: WikiSearchResult[]): void {
    const { colors } = FEATURES.theme;
    const c = getColors();

    this.container.innerHTML = `
      <div class="max-w-4xl mx-auto p-8">
        <h1 class="text-2xl font-bold mb-6">Search Results (${results.length})</h1>
        
        ${results.length === 0 ? `
          <div class="text-center py-12 text-muted">
            <p class="text-4xl mb-4">🔍</p>
            <p>No results found for "${this.escapeHtml(this.searchQuery)}"</p>
          </div>
        ` : `
          <div class="space-y-4">
            ${results.map(result => `
              <div class="p-6 rounded-xl border cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                   data-article="${result.article.slug}" style="background: ${c.card}; border-color: ${c.border}">
                <h3 class="font-bold mb-2">${this.highlightMatch(result.article.title)}</h3>
                <p class="text-muted mb-2">${this.escapeHtml(result.article.excerpt)}</p>
                <div class="flex gap-2">
                  ${result.matchedIn.map(m => `<span class="px-2 py-1 rounded bg-muted text-xs">${m}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
        
        <button id="clear-search" class="mt-6 px-4 py-2 bg-muted rounded-lg">← Back to Wiki</button>
      </div>
    `;

    this.container.querySelectorAll('[data-article]').forEach(el => {
      el.addEventListener('click', () => {
        const slug = (el as HTMLElement).dataset.article!;
        this.selectArticle(slug);
      });
    });

    document.getElementById('clear-search')?.addEventListener('click', () => {
      this.currentArticle = '';
      this.searchQuery = '';
      this.render();
    });
  }

  private highlightMatch(text: string): string {
    if (!this.searchQuery) return this.escapeHtml(text);
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
    return this.escapeHtml(text).replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { WikiRenderer, WikiArticle, WikiCategory, MarkdownParser };
export default WikiRenderer;
