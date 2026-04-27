/**
 * MiniDev ONE Template - Generic Tracker
 * 
 * Flexible tracker for habits, expenses, goals, inventory, and custom tracking.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';

// =============================================================================
// TYPES
// =============================================================================
type TrackerType = 'habit' | 'expense' | 'goal' | 'inventory' | 'custom';

interface TrackerItem {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  category?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

interface TrackerConfig {
  type: TrackerType;
  name: string;
  icon: string;
  color: string;
  fields: TrackerField[];
  categories?: string[];
  autoArchive?: boolean;
  archiveAfterDays?: number;
}

interface TrackerField {
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'currency' | 'rating';
  required?: boolean;
  default?: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface TrackerView {
  id: string;
  name: string;
  type: 'list' | 'grid' | 'calendar' | 'chart' | 'summary';
  filters?: Record<string, any>;
  sortBy?: string;
  groupBy?: string;
}

// =============================================================================
// TRACKER ENGINE
// =============================================================================
class GenericTracker {
  private container: HTMLElement;
  private config: TrackerConfig;
  private items: TrackerItem[] = [];
  private storageKey: string;
  private currentView: TrackerView;
  private filters: Record<string, any> = {};
  private searchQuery: string = '';

  constructor(selector: string, config: Partial<TrackerConfig> = {}) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;

    this.config = {
      type: 'custom',
      name: 'Tracker',
      icon: '📊',
      color: '#6366f1',
      fields: [],
      ...config,
    };

    this.storageKey = `tracker_${this.config.type}`;
    this.currentView = { id: 'list', name: 'List', type: 'list' };

    this.load();
    this.render();
  }

  private load(): void {
    const saved = storage.get<TrackerItem[]>(this.storageKey);
    if (saved) {
      this.items = saved;
    }
  }

  private save(): void {
    storage.set(this.storageKey, this.items);
  }

  // =============================================================================
  // ITEM MANAGEMENT
  // =============================================================================
  addItem(data: Partial<TrackerItem>): TrackerItem {
    const item: TrackerItem = {
      id: `${this.config.type}_${Date.now()}`,
      name: '',
      value: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...data,
    };

    this.items.push(item);
    this.save();
    this.render();
    return item;
  }

  updateItem(id: string, updates: Partial<TrackerItem>): void {
    const item = this.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates, { updatedAt: Date.now() });
      this.save();
      this.render();
    }
  }

  deleteItem(id: string): void {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.render();
  }

  // =============================================================================
  // FILTERING & SEARCH
  // =============================================================================
  setFilter(key: string, value: any): void {
    this.filters[key] = value;
    this.render();
  }

  clearFilters(): void {
    this.filters = {};
    this.render();
  }

  search(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.render();
  }

  private getFilteredItems(): TrackerItem[] {
    return this.items.filter(item => {
      // Search filter
      if (this.searchQuery) {
        const searchMatch =
          item.name.toLowerCase().includes(this.searchQuery) ||
          (item.category && item.category.toLowerCase().includes(this.searchQuery)) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(this.searchQuery)));
        if (!searchMatch) return false;
      }

      // Category filter
      if (this.filters.category && item.category !== this.filters.category) {
        return false;
      }

      // Date range filter
      if (this.filters.startDate && item.createdAt < this.filters.startDate) {
        return false;
      }
      if (this.filters.endDate && item.createdAt > this.filters.endDate) {
        return false;
      }

      return true;
    });
  }

  // =============================================================================
  // VIEWS
  // =============================================================================
  setView(view: TrackerView): void {
    this.currentView = view;
    this.render();
  }

  // =============================================================================
  // STATISTICS
  // =============================================================================
  getStats(): Record<string, any> {
    const items = this.getFilteredItems();

    return {
      total: items.length,
      totalValue: items.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      byCategory: this.groupByCategory(items),
      byTag: this.groupByTag(items),
      recent: items.slice(-5),
      todayAdded: items.filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString()).length,
    };
  }

  private groupByCategory(items: TrackerItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.category || 'uncategorized';
      grouped[cat] = (grouped[cat] || 0) + 1;
    });
    return grouped;
  }

  private groupByTag(items: TrackerItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    items.forEach(item => {
      item.tags?.forEach(tag => {
        grouped[tag] = (grouped[tag] || 0) + 1;
      });
    });
    return grouped;
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    switch (this.currentView.type) {
      case 'list':
        this.renderList();
        break;
      case 'grid':
        this.renderGrid();
        break;
      case 'calendar':
        this.renderCalendar();
        break;
      case 'chart':
        this.renderChart();
        break;
      case 'summary':
        this.renderSummary();
        break;
    }
  }

  private renderList(): void {
    const c = getColors();
    const items = this.getFilteredItems();

    this.container.innerHTML = `
      <div class="tracker-list p-4 space-y-4" style="background: ${c.background}">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${this.config.icon}</span>
            <div>
              <h1 class="text-xl font-bold">${this.config.name}</h1>
              <p class="text-sm text-muted">${items.length} items</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button id="add-btn" class="px-4 py-2 bg-primary text-white rounded-lg">+ Add</button>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex gap-2 flex-wrap">
          <input type="search" id="search-input" placeholder="Search..." 
                 class="px-4 py-2 rounded-lg border border-border bg-muted" value="${this.searchQuery}">
          
          ${this.config.categories ? `
            <select id="filter-category" class="px-4 py-2 rounded-lg border border-border bg-muted">
              <option value="">All Categories</option>
              ${this.config.categories.map(cat => `
                <option value="${cat}" ${this.filters.category === cat ? 'selected' : ''}>${cat}</option>
              `).join('')}
            </select>
          ` : ''}
        </div>

        <!-- Items -->
        <div class="space-y-3">
          ${items.length === 0 ? `
            <div class="text-center py-12 text-muted">
              <p class="text-4xl mb-4">${this.config.icon}</p>
              <p>No items yet. Add your first one!</p>
            </div>
          ` : items.map(item => this.renderListItem(item)).join('')}
        </div>

        <!-- View Switcher -->
        <div class="flex justify-center gap-2 pt-4 border-t">
          <button class="view-btn px-3 py-1 rounded-lg ${this.currentView.type === 'list' ? 'bg-primary text-white' : 'bg-muted'}" data-view="list">📋 List</button>
          <button class="view-btn px-3 py-1 rounded-lg ${this.currentView.type === 'grid' ? 'bg-primary text-white' : 'bg-muted'}" data-view="grid">⊞ Grid</button>
          <button class="view-btn px-3 py-1 rounded-lg ${this.currentView.type === 'chart' ? 'bg-primary text-white' : 'bg-muted'}" data-view="chart">📊 Chart</button>
          <button class="view-btn px-3 py-1 rounded-lg ${this.currentView.type === 'summary' ? 'bg-primary text-white' : 'bg-muted'}" data-view="summary">📈 Summary</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderListItem(item: TrackerItem): string {
    return `
      <div class="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors" data-item="${item.id}">
        <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style="background: ${this.config.color}20">
          ${this.config.icon}
        </div>
        <div class="flex-1">
          <div class="font-bold">${item.name}</div>
          <div class="text-sm text-muted">
            ${item.value}${item.unit ? ` ${item.unit}` : ''}
            ${item.category ? ` • ${item.category}` : ''}
          </div>
          ${item.tags && item.tags.length > 0 ? `
            <div class="flex gap-1 mt-1">
              ${item.tags.map(tag => `<span class="px-2 py-0.5 bg-muted rounded text-xs">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="flex gap-2">
          <button class="edit-btn p-2 hover:bg-muted rounded-lg" data-id="${item.id}">✏️</button>
          <button class="delete-btn p-2 hover:bg-muted rounded-lg text-red-500" data-id="${item.id}">🗑️</button>
        </div>
      </div>
    `;
  }

  private renderGrid(): void {
    const c = getColors();
    const items = this.getFilteredItems();

    this.container.innerHTML = `
      <div class="tracker-grid p-4" style="background: ${c.background}">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${this.config.icon}</span>
            <h1 class="text-xl font-bold">${this.config.name}</h1>
          </div>
          <button id="add-btn" class="px-4 py-2 bg-primary text-white rounded-lg">+ Add</button>
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${items.map(item => `
            <div class="p-4 bg-card rounded-xl border border-border hover:border-primary transition-colors cursor-pointer" data-item="${item.id}">
              <div class="text-3xl mb-2">${this.config.icon}</div>
              <div class="font-bold truncate">${item.name}</div>
              <div class="text-2xl font-bold" style="color: ${this.config.color}">${item.value}${item.unit ? `<span class="text-sm text-muted">${item.unit}</span>` : ''}</div>
              ${item.category ? `<div class="text-xs text-muted mt-1">${item.category}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <!-- View Switcher -->
        <div class="flex justify-center gap-2 pt-4 border-t mt-4">
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="list">📋 List</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-primary text-white" data-view="grid">⊞ Grid</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="chart">📊 Chart</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="summary">📈 Summary</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderChart(): void {
    const c = getColors();
    const stats = this.getStats();
    const categories = Object.entries(stats.byCategory);

    this.container.innerHTML = `
      <div class="tracker-chart p-4" style="background: ${c.background}">
        <h1 class="text-xl font-bold mb-6">📊 ${this.config.name} Statistics</h1>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="p-4 bg-card rounded-xl border border-border text-center">
            <div class="text-3xl font-bold">${stats.total}</div>
            <div class="text-muted">Total Items</div>
          </div>
          <div class="p-4 bg-card rounded-xl border border-border text-center">
            <div class="text-3xl font-bold" style="color: ${this.config.color}">${stats.totalValue}</div>
            <div class="text-muted">Total Value</div>
          </div>
          <div class="p-4 bg-card rounded-xl border border-border text-center">
            <div class="text-3xl font-bold">${stats.todayAdded}</div>
            <div class="text-muted">Added Today</div>
          </div>
          <div class="p-4 bg-card rounded-xl border border-border text-center">
            <div class="text-3xl font-bold">${Object.keys(stats.byCategory).length}</div>
            <div class="text-muted">Categories</div>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="bg-card rounded-xl border border-border p-6 mb-8">
          <h2 class="font-bold mb-4">Categories</h2>
          <div class="space-y-3">
            ${categories.map(([cat, count]) => {
              const percentage = (Number(count) / stats.total) * 100;
              return `
                <div class="flex items-center gap-4">
                  <span class="w-24 text-sm">${cat}</span>
                  <div class="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" style="width: ${percentage}%; background: ${this.config.color}"></div>
                  </div>
                  <span class="w-12 text-right text-sm">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recent Items -->
        <div class="bg-card rounded-xl border border-border p-6">
          <h2 class="font-bold mb-4">Recent Items</h2>
          <div class="space-y-2">
            ${stats.recent.map(item => `
              <div class="flex justify-between p-2 bg-muted rounded-lg">
                <span>${item.name}</span>
                <span style="color: ${this.config.color}">${item.value}${item.unit || ''}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- View Switcher -->
        <div class="flex justify-center gap-2 pt-4 border-t mt-4">
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="list">📋 List</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="grid">⊞ Grid</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-primary text-white" data-view="chart">📊 Chart</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="summary">📈 Summary</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderSummary(): void {
    const c = getColors();
    const stats = this.getStats();

    this.container.innerHTML = `
      <div class="tracker-summary p-4" style="background: ${c.background}">
        <h1 class="text-xl font-bold mb-6">📈 ${this.config.name} Summary</h1>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div class="col-span-2 md:col-span-1 p-6 bg-card rounded-xl border border-border text-center">
            <div class="text-6xl mb-2">${this.config.icon}</div>
            <div class="text-3xl font-bold">${stats.total}</div>
            <div class="text-muted">Total Items</div>
          </div>
          <div class="p-6 bg-card rounded-xl border border-border text-center">
            <div class="text-4xl font-bold" style="color: ${this.config.color}">${stats.totalValue}</div>
            <div class="text-muted">Total Value</div>
          </div>
          <div class="p-6 bg-card rounded-xl border border-border text-center">
            <div class="text-4xl font-bold">${Object.keys(stats.byCategory).length}</div>
            <div class="text-muted">Categories</div>
          </div>
        </div>

        <!-- Top Items -->
        <div class="bg-card rounded-xl border border-border p-6 mb-8">
          <h2 class="font-bold mb-4">Top Items by Value</h2>
          <div class="space-y-2">
            ${this.items.slice().sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5).map((item, i) => `
              <div class="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <span class="w-8 text-center font-bold text-muted">#${i + 1}</span>
                <div class="flex-1">
                  <div class="font-bold">${item.name}</div>
                  ${item.category ? `<div class="text-xs text-muted">${item.category}</div>` : ''}
                </div>
                <div class="text-xl font-bold" style="color: ${this.config.color}">${item.value}${item.unit || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- View Switcher -->
        <div class="flex justify-center gap-2 pt-4 border-t mt-4">
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="list">📋 List</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="grid">⊞ Grid</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-muted" data-view="chart">📊 Chart</button>
          <button class="view-btn px-3 py-1 rounded-lg bg-primary text-white" data-view="summary">📈 Summary</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderCalendar(): void {
    // Simple calendar view - group items by date
    const c = getColors();

    this.container.innerHTML = `
      <div class="tracker-calendar p-4" style="background: ${c.background}">
        <h1 class="text-xl font-bold mb-6">📅 ${this.config.name} Calendar</h1>
        <div class="bg-card rounded-xl border border-border p-6">
          <p class="text-muted text-center">Calendar view coming soon</p>
          <p class="text-sm text-muted text-center mt-2">${this.items.length} items total</p>
        </div>
        <button class="view-btn mt-4 px-3 py-1 rounded-lg bg-muted" data-view="list">← Back to List</button>
      </div>
    `;

    this.attachEvents();
  }

  // =============================================================================
  // EVENTS
  // =============================================================================
  private attachEvents(): void {
    // Add button
    document.getElementById('add-btn')?.addEventListener('click', () => {
      this.showAddModal();
    });

    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.search((e.target as HTMLInputElement).value);
    });

    // Category filter
    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.setFilter('category', (e.target as HTMLSelectElement).value);
    });

    // View buttons
    this.container.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const viewType = (btn as HTMLElement).dataset.view as TrackerView['type'];
        this.currentView = { id: viewType, name: viewType, type: viewType };
        this.render();
      });
    });

    // Edit buttons
    this.container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        this.showEditModal(id);
      });
    });

    // Delete buttons
    this.container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id!;
        if (confirm('Delete this item?')) {
          this.deleteItem(id);
        }
      });
    });

    // Item click (for grid view)
    this.container.querySelectorAll('[data-item]').forEach(el => {
      if (!el.classList.contains('edit-btn') && !el.classList.contains('delete-btn')) {
        el.addEventListener('click', () => {
          const id = (el as HTMLElement).dataset.item!;
          this.showEditModal(id);
        });
      }
    });
  }

  private showAddModal(): void {
    const name = prompt('Item name:');
    if (!name) return;

    const value = prompt('Value:', '0');
    const category = this.config.categories?.length ? prompt(`Category (${this.config.categories.join(', ')}):`) : undefined;

    this.addItem({
      name,
      value: Number(value) || 0,
      category: category || undefined,
    });
  }

  private showEditModal(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    const name = prompt('Item name:', item.name);
    const value = prompt('Value:', String(item.value));

    if (name !== null) item.name = name;
    if (value !== null) item.value = Number(value) || 0;

    this.save();
    this.render();
  }
}

// =============================================================================
// PRESET TRACKERS
// =============================================================================
export function createExpenseTracker(selector: string): GenericTracker {
  return new GenericTracker(selector, {
    type: 'expense',
    name: 'Expenses',
    icon: '💰',
    color: '#22c55e',
    categories: ['Food', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Health', 'Other'],
  });
}

export function createHabitTracker(selector: string): GenericTracker {
  return new GenericTracker(selector, {
    type: 'habit',
    name: 'Habits',
    icon: '✅',
    color: '#6366f1',
    categories: ['Health', 'Work', 'Learning', 'Social', 'Hobby', 'Other'],
  });
}

export function createGoalTracker(selector: string): GenericTracker {
  return new GenericTracker(selector, {
    type: 'goal',
    name: 'Goals',
    icon: '🎯',
    color: '#f59e0b',
    categories: ['Short-term', 'Long-term', 'Daily', 'Weekly', 'Monthly'],
  });
}

export function createInventoryTracker(selector: string): GenericTracker {
  return new GenericTracker(selector, {
    type: 'inventory',
    name: 'Inventory',
    icon: '📦',
    color: '#8b5cf6',
    categories: ['Electronics', 'Furniture', 'Clothing', 'Books', 'Other'],
  });
}

// =============================================================================
// EXPORTS
// =============================================================================
export { GenericTracker, TrackerType, TrackerItem, TrackerConfig, TrackerView };
export default GenericTracker;