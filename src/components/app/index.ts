/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MINIDEV ONE TEMPLATE - APP COMPONENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Complete UI component library for apps.
 * Todos, Notes, Flashcards, Habits, Timer, Quiz, Drawing, Chat, etc.
 */

import { FEATURES, getColors, getTheme } from '@/lib/config';
import { HealthTracker } from './health';
import { PhotoEditor } from './photo';
import { SocialFeed } from './social';
import { GenericTracker, createExpenseTracker, createHabitTracker, createGoalTracker, createInventoryTracker } from './tracker';
import { VisualNovelEngine, VisualNovelBuilder } from '@/engine/visual-novel';

// =============================================================================
// STORAGE
// =============================================================================
class Storage {
  private prefix: string;
  private adapter: 'local' | 'indexeddb';

  constructor(prefix: string = 'minidev') {
    this.prefix = prefix;
    this.adapter = FEATURES.storage.type === 'indexeddb' ? 'indexeddb' : 'local';
  }

  private key(key: string): string {
    return `${this.prefix}_${key}`;
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      if (this.adapter === 'local') {
        const value = localStorage.getItem(this.key(key));
        return value ? JSON.parse(value) : defaultValue;
      }
    } catch {
      return defaultValue;
    }
    return defaultValue;
  }

  set<T>(key: string, value: T): void {
    try {
      if (this.adapter === 'local') {
        localStorage.setItem(this.key(key), JSON.stringify(value));
      }
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  remove(key: string): void {
    try {
      if (this.adapter === 'local') {
        localStorage.removeItem(this.key(key));
      }
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  clear(): void {
    try {
      if (this.adapter === 'local') {
        Object.keys(localStorage)
          .filter(k => k.startsWith(this.prefix))
          .forEach(k => localStorage.removeItem(k));
      }
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  export(): string {
    const data: Record<string, any> = {};
    try {
      if (this.adapter === 'local') {
        Object.keys(localStorage)
          .filter(k => k.startsWith(this.prefix))
          .forEach(k => {
            data[k.replace(this.prefix + '_', '')] = JSON.parse(localStorage.getItem(k) || '{}');
          });
      }
    } catch (e) {
      console.error('Export error:', e);
    }
    return JSON.stringify(data, null, 2);
  }

  import(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }
}

const storage = new Storage();

// =============================================================================
// TOAST NOTIFICATIONS
// =============================================================================
class ToastManager {
  private container: HTMLElement | null = null;
  private toasts: Map<string, { message: string; type: string; timeout: number }> = new Map();

  init(): void {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm';
    document.body.appendChild(this.container);
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 3000): string {
    this.init();
    const id = `toast_${Date.now()}`;
    this.toasts.set(id, { message, type, timeout: duration });

    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`;

    const icons: Record<string, string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    toast.innerHTML = `
      <span class="text-lg">${icons[type]}</span>
      <span class="flex-1">${message}</span>
      <button class="hover:opacity-70 text-lg">&times;</button>
    `;

    toast.querySelector('button')?.addEventListener('click', () => this.dismiss(id));
    this.container?.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  dismiss(id: string): void {
    const toast = document.getElementById(id);
    if (toast) {
      toast.style.animation = 'slide-out 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }
    this.toasts.delete(id);
  }

  success(message: string): string {
    return this.show(message, 'success');
  }

  error(message: string): string {
    return this.show(message, 'error');
  }

  warning(message: string): string {
    return this.show(message, 'warning');
  }

  info(message: string): string {
    return this.show(message, 'info');
  }
}

const toast = new ToastManager();

// =============================================================================
// MODAL
// =============================================================================
class Modal {
  private modal: HTMLElement | null = null;

  init(): void {
    if (this.modal) return;
    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-50 hidden';
    this.modal.innerHTML = `
      <div class="absolute inset-0 bg-black/50" data-close></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl shadow-2xl p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 id="modal-title" class="text-xl font-bold"></h3>
          <button data-close class="text-2xl hover:opacity-70">&times;</button>
        </div>
        <div id="modal-content"></div>
      </div>
    `;
    document.body.appendChild(this.modal);

    this.modal.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => this.hide());
    });
  }

  show(title: string, content: string | HTMLElement, options?: {
    confirm?: string;
    cancel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    wide?: boolean;
  }): void {
    this.init();
    const modalContent = this.modal!.querySelector('#modal-content')!;
    const modalDialog = this.modal!.querySelector('.max-w-md') as HTMLElement;

    (document.getElementById('modal-title')!).textContent = title;

    if (typeof content === 'string') {
      modalContent.innerHTML = content;
    } else {
      modalContent.innerHTML = '';
      modalContent.appendChild(content);
    }

    if (options?.wide) {
      modalDialog.classList.remove('max-w-md');
      modalDialog.classList.add('max-w-2xl');
    } else {
      modalDialog.classList.add('max-w-md');
      modalDialog.classList.remove('max-w-2xl');
    }

    if (options?.confirm || options?.cancel) {
      modalContent.innerHTML += `
        <div class="flex gap-3 mt-6 justify-end">
          ${options.cancel ? `<button id="modal-cancel" class="px-4 py-2 rounded-lg bg-muted">${options.cancel}</button>` : ''}
          ${options.confirm ? `<button id="modal-confirm" class="px-4 py-2 rounded-lg bg-primary text-white">${options.confirm}</button>` : ''}
        </div>
      `;

      if (options.cancel) {
        document.getElementById('modal-cancel')?.addEventListener('click', () => {
          options.onCancel?.();
          this.hide();
        });
      }

      if (options.confirm) {
        document.getElementById('modal-confirm')?.addEventListener('click', () => {
          options.onConfirm?.();
          this.hide();
        });
      }
    }

    this.modal!.classList.remove('hidden');
  }

  hide(): void {
    this.modal?.classList.add('hidden');
  }

  confirm(title: string, message: string): Promise<boolean> {
    return new Promise(resolve => {
      this.show(title, `<p>${message}</p>`, {
        confirm: 'Yes',
        cancel: 'No',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  prompt(title: string, label: string, defaultValue: string = ''): Promise<string | null> {
    return new Promise(resolve => {
      this.show(title, `
        <label class="block text-sm font-medium mb-2">${label}</label>
        <input type="text" id="modal-input" class="w-full px-4 py-2 rounded-lg border" value="${defaultValue}">
      `, {
        confirm: 'OK',
        cancel: 'Cancel',
        onConfirm: () => {
          const value = (document.getElementById('modal-input') as HTMLInputElement)?.value;
          resolve(value || null);
        },
        onCancel: () => resolve(null),
      });
    });
  }
}

const modal = new Modal();

// =============================================================================
// TODO APP
// =============================================================================
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  dueDate?: string;
  createdAt: number;
}

class TodoApp {
  private container: HTMLElement;
  private todos: Todo[] = [];
  private storageKey: string;
  private filter: 'all' | 'active' | 'completed' = 'all';

  constructor(selector: string, storageKey: string = 'todos') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.load();
    this.render();
  }

  private load(): void {
    this.todos = storage.get<Todo[]>(this.storageKey, []);
  }

  private save(): void {
    storage.set(this.storageKey, this.todos);
  }

  add(text: string, priority: Todo['priority'] = 'medium', category: string = '', dueDate?: string): void {
    const todo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority,
      category,
      dueDate,
      createdAt: Date.now(),
    };
    this.todos.push(todo);
    this.save();
    this.render();
    toast.success('Task added!');
  }

  toggle(id: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.save();
      this.render();
    }
  }

  delete(id: string): void {
    this.todos = this.todos.filter(t => t.id !== id);
    this.save();
    this.render();
  }

  edit(id: string, text: string): void {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.text = text;
      this.save();
      this.render();
    }
  }

  clearCompleted(): void {
    this.todos = this.todos.filter(t => !t.completed);
    this.save();
    this.render();
    toast.info('Completed tasks cleared');
  }

  setFilter(filter: 'all' | 'active' | 'completed'): void {
    this.filter = filter;
    this.render();
  }

  private getFiltered(): Todo[] {
    switch (this.filter) {
      case 'active':
        return this.todos.filter(t => !t.completed);
      case 'completed':
        return this.todos.filter(t => t.completed);
      default:
        return this.todos;
    }
  }

  private render(): void {
    const filtered = this.getFiltered();
    const activeCount = this.todos.filter(t => !t.completed).length;

    const priorityColors: Record<string, string> = {
      low: 'border-l-blue-500',
      medium: 'border-l-yellow-500',
      high: 'border-l-red-500',
    };

    this.container.innerHTML = `
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-4">Tasks</h2>
        <form id="todo-form" class="flex gap-2">
          <input 
            type="text" 
            id="todo-input" 
            placeholder="Add a task..." 
            class="flex-1 px-4 py-2 rounded-lg border bg-background"
            autocomplete="off"
          >
          <select id="todo-priority" class="px-3 py-2 rounded-lg border bg-background">
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
          <button type="submit" class="px-6 py-2 bg-primary text-white rounded-lg font-medium">Add</button>
        </form>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-2 mb-4">
        <button data-filter="all" class="px-4 py-2 rounded-lg ${this.filter === 'all' ? 'bg-primary text-white' : 'bg-muted'}">All (${this.todos.length})</button>
        <button data-filter="active" class="px-4 py-2 rounded-lg ${this.filter === 'active' ? 'bg-primary text-white' : 'bg-muted'}">Active (${activeCount})</button>
        <button data-filter="completed" class="px-4 py-2 rounded-lg ${this.filter === 'completed' ? 'bg-primary text-white' : 'bg-muted'}">Done (${this.todos.length - activeCount})</button>
      </div>

      <!-- Todo list -->
      <ul class="space-y-2">
        ${filtered.length === 0 ? `
          <li class="text-center py-8 text-muted">
            ${this.filter === 'completed' ? 'No completed tasks' : 'No tasks yet. Add one above!'}
          </li>
        ` : filtered.map(todo => `
          <li class="flex items-center gap-3 p-4 bg-card rounded-xl border-l-4 ${priorityColors[todo.priority]} border border-border ${todo.completed ? 'opacity-50' : ''}">
            <input type="checkbox" ${todo.completed ? 'checked' : ''} data-toggle="${todo.id}" class="w-5 h-5 rounded">
            <span class="flex-1 ${todo.completed ? 'line-through' : ''}">${this.escapeHtml(todo.text)}</span>
            ${todo.dueDate ? `<span class="text-sm text-muted">${todo.dueDate}</span>` : ''}
            <button data-edit="${todo.id}" class="text-muted hover:text-primary">✏️</button>
            <button data-delete="${todo.id}" class="text-muted hover:text-red-500">🗑️</button>
          </li>
        `).join('')}
      </ul>

      <!-- Footer -->
      ${this.todos.length > 0 ? `
        <div class="flex justify-between items-center mt-6 pt-4 border-t">
          <span class="text-sm text-muted">${activeCount} items left</span>
          ${this.todos.some(t => t.completed) ? `
            <button id="clear-completed" class="text-sm text-muted hover:text-red-500">Clear completed</button>
          ` : ''}
        </div>
      ` : ''}
    `;

    // Event listeners
    document.getElementById('todo-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('todo-input') as HTMLInputElement;
      const priority = (document.getElementById('todo-priority') as HTMLSelectElement).value as Todo['priority'];
      if (input.value.trim()) {
        this.add(input.value.trim(), priority);
        input.value = '';
      }
    });

    this.container.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('change', (e) => {
        const id = (e.target as HTMLElement).id.replace('toggle-', '');
        this.toggle(id);
      });
    });

    this.container.querySelectorAll('[data-delete]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.delete || (e.target as HTMLElement).id.replace('delete-', '');
        this.delete(id);
      });
    });

    this.container.querySelectorAll('[data-edit]').forEach(el => {
      el.addEventListener('click', async (e) => {
        const id = (e.target as HTMLElement).dataset.edit!;
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
          const newText = await modal.prompt('Edit Task', 'Task', todo.text);
          if (newText) {
            this.edit(id, newText);
          }
        }
      });
    });

    this.container.querySelectorAll('[data-filter]').forEach(el => {
      el.addEventListener('click', (e) => {
        const filter = (e.target as HTMLElement).dataset.filter as 'all' | 'active' | 'completed';
        this.setFilter(filter);
      });
    });

    document.getElementById('clear-completed')?.addEventListener('click', () => {
      this.clearCompleted();
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// =============================================================================
// HABITS TRACKER
// =============================================================================
interface Habit {
  id: string;
  name: string;
  streak: number;
  completedDates: string[];
  color: string;
  icon: string;
  createdAt: number;
}

class HabitTracker {
  private container: HTMLElement;
  private habits: Habit[] = [];
  private storageKey: string;
  private currentDate: string;

  constructor(selector: string, storageKey: string = 'habits') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.currentDate = new Date().toISOString().split('T')[0];
    this.load();
    this.render();
  }

  private load(): void {
    this.habits = storage.get<Habit[]>(this.storageKey, []);
  }

  private save(): void {
    storage.set(this.storageKey, this.habits);
  }

  add(name: string, icon: string = '⭐', color: string = '#667eea'): void {
    const habit: Habit = {
      id: Date.now().toString(),
      name,
      streak: 0,
      completedDates: [],
      color,
      icon,
      createdAt: Date.now(),
    };
    this.habits.push(habit);
    this.save();
    this.render();
    toast.success('Habit added!');
  }

  toggle(id: string): void {
    const habit = this.habits.find(h => h.id === id);
    if (!habit) return;

    if (habit.completedDates.includes(this.currentDate)) {
      habit.completedDates = habit.completedDates.filter(d => d !== this.currentDate);
      habit.streak = this.calculateStreak(habit);
    } else {
      habit.completedDates.push(this.currentDate);
      habit.streak = this.calculateStreak(habit);
    }

    this.save();
    this.render();
  }

  delete(id: string): void {
    this.habits = this.habits.filter(h => h.id !== id);
    this.save();
    this.render();
  }

  private calculateStreak(habit: Habit): number {
    let streak = 0;
    let date = new Date();

    while (true) {
      const dateStr = date.toISOString().split('T')[0];
      if (habit.completedDates.includes(dateStr)) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  private render(): void {
    this.container.innerHTML = `
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold mb-4">Habits</h2>
        <form id="habit-form" class="flex gap-2">
          <input type="text" id="habit-input" placeholder="New habit..." class="flex-1 px-4 py-2 rounded-lg border bg-background">
          <button type="submit" class="px-6 py-2 bg-primary text-white rounded-lg font-medium">Add</button>
        </form>
      </div>

      <!-- Habit list -->
      <div class="space-y-3">
        ${this.habits.length === 0 ? `
          <p class="text-center py-8 text-muted">No habits tracked. Add one above!</p>
        ` : this.habits.map(habit => {
          const completed = habit.completedDates.includes(this.currentDate);
          return `
            <div class="flex items-center gap-4 p-4 bg-card rounded-xl border border-border ${completed ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}">
              <button data-toggle="${habit.id}" class="w-10 h-10 rounded-full border-2 ${completed ? 'bg-green-500 border-green-500' : 'border-border'} flex items-center justify-center text-lg">
                ${completed ? '✓' : habit.icon}
              </button>
              <div class="flex-1">
                <span class="font-medium">${this.escapeHtml(habit.name)}</span>
                <span class="text-sm text-muted ml-2">🔥 ${habit.streak} day streak</span>
              </div>
              <span class="text-sm text-muted">${habit.completedDates.length} total</span>
              <button data-delete="${habit.id}" class="text-muted hover:text-red-500">🗑️</button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    document.getElementById('habit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('habit-input') as HTMLInputElement;
      if (input.value.trim()) {
        this.add(input.value.trim());
        input.value = '';
      }
    });

    this.container.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.toggle!;
        this.toggle(id);
      });
    });

    this.container.querySelectorAll('[data-delete]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.delete!;
        this.delete(id);
      });
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// =============================================================================
// FLASHCARDS
// =============================================================================
interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  nextReview: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

class FlashcardApp {
  private container: HTMLElement;
  private cards: Flashcard[] = [];
  private currentIndex: number = 0;
  private showingFront: boolean = true;
  private storageKey: string;

  constructor(selector: string, storageKey: string = 'flashcards') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.load();
    this.render();
  }

  private load(): void {
    this.cards = storage.get<Flashcard[]>(this.storageKey, []);
  }

  private save(): void {
    storage.set(this.storageKey, this.cards);
  }

  add(front: string, back: string, tags: string[] = []): void {
    const card: Flashcard = {
      id: Date.now().toString(),
      front,
      back,
      tags,
      nextReview: Date.now(),
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    };
    this.cards.push(card);
    this.save();
    this.currentIndex = this.cards.length - 1;
    this.showingFront = true;
    this.render();
    toast.success('Card added!');
  }

  edit(id: string, front: string, back: string): void {
    const card = this.cards.find(c => c.id === id);
    if (card) {
      card.front = front;
      card.back = back;
      this.save();
      this.render();
    }
  }

  delete(id: string): void {
    this.cards = this.cards.filter(c => c.id !== id);
    if (this.currentIndex >= this.cards.length) {
      this.currentIndex = Math.max(0, this.cards.length - 1);
    }
    this.save();
    this.render();
  }

  rate(remaning: number): void {
    // SM-2 algorithm
    if (this.currentIndex >= this.cards.length) return;

    const card = this.cards[this.currentIndex];
    if (remaning < 3) {
      // Reset
      card.repetitions = 0;
      card.interval = 1;
    } else {
      // Good recall
      if (card.repetitions === 0) {
        card.interval = 1;
      } else if (card.repetitions === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetitions++;
    }

    card.nextReview = Date.now() + card.interval * 24 * 60 * 60 * 1000;
    this.save();

    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.showingFront = true;
    this.render();
  }

  private render(): void {
    if (this.cards.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-12">
          <p class="text-muted mb-4">No flashcards yet!</p>
          <button id="add-card" class="px-6 py-3 bg-primary text-white rounded-lg">Add First Card</button>
        </div>
      `;

      document.getElementById('add-card')?.addEventListener('click', () => this.showAddModal());
      return;
    }

    const card = this.cards[this.currentIndex];
    const due = card.nextReview <= Date.now();

    this.container.innerHTML = `
      <div class="mb-4 flex justify-between items-center">
        <span class="text-muted">${this.currentIndex + 1} / ${this.cards.length}</span>
        ${due ? '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Due for review</span>' : ''}
        <button id="add-card" class="text-primary">+ Add Card</button>
      </div>

      <!-- Card -->
      <div id="flashcard" class="min-h-[300px] p-8 bg-card rounded-2xl border-2 border-border cursor-pointer flex items-center justify-center text-center">
        <div class="text-2xl font-medium">
          ${this.showingFront ? this.escapeHtml(card.front) : this.escapeHtml(card.back)}
        </div>
      </div>

      <div class="text-center text-sm text-muted mt-4">
        Click to flip
      </div>

      <!-- Rating buttons -->
      <div class="flex gap-3 mt-6">
        <button data-rate="0" class="flex-1 py-3 rounded-lg bg-red-100 text-red-800 hover:bg-red-200">Again</button>
        <button data-rate="3" class="flex-1 py-3 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Hard</button>
        <button data-rate="4" class="flex-1 py-3 rounded-lg bg-green-100 text-green-800 hover:bg-green-200">Good</button>
        <button data-rate="5" class="flex-1 py-3 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200">Easy</button>
      </div>

      <!-- Actions -->
      <div class="flex justify-center gap-4 mt-6">
        <button id="edit-card" class="text-muted hover:text-primary">✏️ Edit</button>
        <button id="delete-card" class="text-muted hover:text-red-500">🗑️ Delete</button>
        <button id="browse-cards" class="text-muted hover:text-primary">📋 Browse All</button>
      </div>
    `;

    document.getElementById('flashcard')?.addEventListener('click', () => {
      this.showingFront = !this.showingFront;
      this.render();
    });

    this.container.querySelectorAll('[data-rate]').forEach(el => {
      el.addEventListener('click', (e) => {
        const rating = parseInt((e.target as HTMLElement).dataset.rate || '3');
        this.rate(rating);
      });
    });

    document.getElementById('add-card')?.addEventListener('click', () => this.showAddModal());
    document.getElementById('edit-card')?.addEventListener('click', () => this.showEditModal(card));
    document.getElementById('delete-card')?.addEventListener('click', () => {
      this.delete(card.id);
    });
  }

  private async showAddModal(): Promise<void> {
    const front = await modal.prompt('Add Flashcard', 'Front (question)');
    if (!front) return;
    const back = await modal.prompt('Add Flashcard', 'Back (answer)');
    if (back) {
      this.add(front, back);
    }
  }

  private async showEditModal(card: Flashcard): Promise<void> {
    const front = await modal.prompt('Edit Card', 'Front', card.front);
    if (front === null) return;
    const back = await modal.prompt('Edit Card', 'Back', card.back);
    if (back !== null) {
      this.edit(card.id, front, back);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// =============================================================================
// TIMER / STOPWATCH
// =============================================================================
class Timer {
  private container: HTMLElement;
  private time: number = 0;
  private running: boolean = false;
  private interval: number | null = null;
  private mode: 'stopwatch' | 'countdown' = 'stopwatch';
  private duration: number = 60;
  private presets: number[] = [60, 300, 600, 900, 1800, 3600];

  constructor(selector: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.render();
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    if (this.mode === 'countdown' && this.time <= 0) {
      this.time = this.duration;
    }

    this.interval = window.setInterval(() => {
      if (this.mode === 'countdown') {
        this.time--;
        if (this.time <= 0) {
          this.stop();
          toast.success('Time\'s up!');
        }
      } else {
        this.time++;
      }
      this.updateDisplay();
    }, 1000);
  }

  stop(): void {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  reset(): void {
    this.stop();
    this.time = this.mode === 'countdown' ? this.duration : 0;
    this.updateDisplay();
  }

  setMode(mode: 'stopwatch' | 'countdown'): void {
    this.mode = mode;
    this.reset();
    this.render();
  }

  setPreset(seconds: number): void {
    this.duration = seconds;
    this.reset();
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const display = this.container.querySelector('#timer-display');
    if (display) {
      display.textContent = this.formatTime(this.time);
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="text-center">
        <div class="text-7xl font-bold font-mono mb-8" id="timer-display">
          ${this.formatTime(this.time)}
        </div>

        <div class="flex justify-center gap-3 mb-6">
          <button id="start" class="w-16 h-16 rounded-full bg-primary text-white text-2xl flex items-center justify-center">
            ${this.running ? '⏸' : '▶'}
          </button>
          <button id="reset" class="w-16 h-16 rounded-full bg-muted text-2xl flex items-center justify-center">↺</button>
        </div>

        <div class="flex justify-center gap-2 mb-4">
          <button data-mode="stopwatch" class="px-4 py-2 rounded-lg ${this.mode === 'stopwatch' ? 'bg-primary text-white' : 'bg-muted'}">Stopwatch</button>
          <button data-mode="countdown" class="px-4 py-2 rounded-lg ${this.mode === 'countdown' ? 'bg-primary text-white' : 'bg-muted'}">Timer</button>
        </div>

        ${this.mode === 'countdown' ? `
          <div class="flex justify-center gap-2 flex-wrap">
            ${this.presets.map(p => `
              <button data-preset="${p}" class="px-3 py-1 rounded-lg bg-muted text-sm">${p < 60 ? `${p}s` : `${p / 60}m`}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('start')?.addEventListener('click', () => {
      if (this.running) {
        this.stop();
      } else {
        this.start();
      }
      this.render();
    });

    document.getElementById('reset')?.addEventListener('click', () => this.reset());

    this.container.querySelectorAll('[data-mode]').forEach(el => {
      el.addEventListener('click', (e) => {
        const mode = (e.target as HTMLElement).dataset.mode as 'stopwatch' | 'countdown';
        this.setMode(mode);
      });
    });

    this.container.querySelectorAll('[data-preset]').forEach(el => {
      el.addEventListener('click', (e) => {
        const seconds = parseInt((e.target as HTMLElement).dataset.preset || '60');
        this.setPreset(seconds);
      });
    });
  }
}

// =============================================================================
// QUIZ
// =============================================================================
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

class Quiz {
  private container: HTMLElement;
  private questions: QuizQuestion[] = [];
  private currentIndex: number = 0;
  private score: number = 0;
  private answered: boolean = false;
  private storageKey: string;

  constructor(selector: string, storageKey: string = 'quiz') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.load();
    this.render();
  }

  private load(): void {
    this.questions = storage.get<QuizQuestion[]>(this.storageKey, []);
  }

  private save(): void {
    storage.set(this.storageKey, this.questions);
  }

  add(question: string, options: string[], correct: number): void {
    this.questions.push({
      id: Date.now().toString(),
      question,
      options,
      correct,
    });
    this.save();
    this.render();
    toast.success('Question added!');
  }

  private selectAnswer(index: number): void {
    if (this.answered) return;
    this.answered = true;

    const q = this.questions[this.currentIndex];
    if (index === q.correct) {
      this.score++;
      toast.success('Correct!');
    } else {
      toast.error(`Wrong! Answer: ${q.options[q.correct]}`);
    }

    this.render();
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.questions.length;
    this.answered = false;
    this.render();
  }

  reset(): void {
    this.currentIndex = 0;
    this.score = 0;
    this.answered = false;
    this.render();
  }

  private render(): void {
    if (this.questions.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-12">
          <p class="text-muted mb-4">No questions yet!</p>
          <button id="add-question" class="px-6 py-3 bg-primary text-white rounded-lg">Add Question</button>
        </div>
      `;

      document.getElementById('add-question')?.addEventListener('click', () => this.showAddModal());
      return;
    }

    const q = this.questions[this.currentIndex];

    this.container.innerHTML = `
      <div class="mb-4 flex justify-between">
        <span>Question ${this.currentIndex + 1} / ${this.questions.length}</span>
        <span>Score: ${this.score}</span>
      </div>

      <div class="mb-6">
        <h3 class="text-xl font-bold mb-4">${this.escapeHtml(q.question)}</h3>
        <div class="space-y-2">
          ${q.options.map((opt, i) => `
            <button data-answer="${i}" class="w-full p-4 text-left rounded-xl border-2 border-border hover:border-primary transition-colors ${this.answered && i === q.correct ? 'border-green-500 bg-green-50' : ''}">
              ${this.escapeHtml(opt)}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="flex justify-between">
        <button id="prev" class="px-4 py-2 bg-muted rounded-lg">← Previous</button>
        ${this.answered ? `
          <button id="next" class="px-4 py-2 bg-primary text-white rounded-lg">Next →</button>
        ` : ''}
      </div>

      <div class="flex justify-center gap-4 mt-6">
        <button id="add-question" class="text-primary">+ Add</button>
        <button id="reset-quiz" class="text-muted">Reset</button>
      </div>
    `;

    this.container.querySelectorAll('[data-answer]').forEach(el => {
      el.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.answer || '0');
        this.selectAnswer(index);
      });
    });

    document.getElementById('prev')?.addEventListener('click', () => {
      this.currentIndex = (this.currentIndex - 1 + this.questions.length) % this.questions.length;
      this.answered = false;
      this.render();
    });

    document.getElementById('next')?.addEventListener('click', () => this.next());
    document.getElementById('reset-quiz')?.addEventListener('click', () => this.reset());
    document.getElementById('add-question')?.addEventListener('click', () => this.showAddModal());
  }

  private async showAddModal(): Promise<void> {
    const question = await modal.prompt('Add Question', 'Question');
    if (!question) return;

    const opt1 = await modal.prompt('Add Question', 'Option 1 (correct)');
    const opt2 = await modal.prompt('Add Question', 'Option 2');
    const opt3 = await modal.prompt('Add Question', 'Option 3');
    const opt4 = await modal.prompt('Add Question', 'Option 4');

    if (opt1) {
      this.add(question, [opt1, opt2 || '', opt3 || '', opt4 || ''].filter(Boolean), 0);
    }
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
export { 
  Storage, storage, 
  ToastManager, toast, 
  Modal, modal, 
  TodoApp, HabitTracker, FlashcardApp, Timer, Quiz,
  HealthTracker,
  PhotoEditor,
  SocialFeed,
  GenericTracker, createExpenseTracker, createHabitTracker, createGoalTracker, createInventoryTracker,
  VisualNovelEngine, VisualNovelBuilder
};
export default { storage, toast, modal };
