/**
 * MiniDev ONE Template - Additional App Components
 * 
 * More app types: Notes, Drawing, Weather, Calculator, etc.
 */

import { storage, toast } from './index';
import { FEATURES, getColors } from '@/lib/config';

// =============================================================================
// NOTES APP
// =============================================================================
interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

class NotesApp {
  private container: HTMLElement;
  private notes: Note[] = [];
  private filter: string = '';
  private storageKey: string;
  private colors: string[] = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff', '#fee2e2'];

  constructor(selector: string, storageKey: string = 'notes') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.load();
    this.render();
  }

  private load(): void {
    this.notes = storage.get<Note[]>(this.storageKey, []);
  }

  private save(): void {
    storage.set(this.storageKey, this.notes);
  }

  add(title: string, content: string = ''): Note {
    const note: Note = {
      id: Date.now().toString(),
      title: title || 'Untitled',
      content,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      pinned: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.notes.unshift(note);
    this.save();
    this.render();
    toast.success('Note added!');
    return note;
  }

  update(id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'color' | 'pinned' | 'tags'>>): void {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates, { updatedAt: Date.now() });
      this.save();
      this.render();
    }
  }

  delete(id: string): void {
    this.notes = this.notes.filter(n => n.id !== id);
    this.save();
    this.render();
    toast.info('Note deleted');
  }

  pin(id: string): void {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.pinned = !note.pinned;
      this.save();
      this.render();
    }
  }

  search(query: string): void {
    this.filter = query.toLowerCase();
    this.render();
  }

  export(format: 'json' | 'markdown' | 'plain'): string {
    if (format === 'json') return JSON.stringify(this.notes, null, 2);
    
    if (format === 'markdown') {
      return this.notes.map(n => `# ${n.title}\n\n${n.content}\n\n---\n`).join('\n');
    }
    
    return this.notes.map(n => `${n.title}\n\n${n.content}\n\n`).join('\n---\n\n');
  }

  private getFiltered(): Note[] {
    if (!this.filter) return this.notes;
    return this.notes.filter(n => 
      n.title.toLowerCase().includes(this.filter) ||
      n.content.toLowerCase().includes(this.filter) ||
      n.tags.some(t => t.toLowerCase().includes(this.filter))
    );
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private render(): void {
    const filtered = this.getFiltered();
    const pinned = filtered.filter(n => n.pinned);
    const unpinned = filtered.filter(n => !n.pinned);

    this.container.innerHTML = `
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold">Notes</h2>
          <button id="export-notes" class="text-sm text-muted hover:text-primary">Export</button>
        </div>
        <div class="flex gap-2">
          <input type="text" id="search-notes" placeholder="Search notes..." class="flex-1 px-4 py-2 rounded-lg border bg-background" value="${this.filter}">
          <button id="add-note" class="px-4 py-2 bg-primary text-white rounded-lg">+ Add</button>
        </div>
      </div>

      <!-- Notes Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${pinned.length > 0 ? `
          <div class="col-span-full">
            <h3 class="text-sm font-medium text-muted mb-2">Pinned</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${pinned.map(n => this.renderNote(n)).join('')}
            </div>
          </div>
        ` : ''}
        
        ${unpinned.length === 0 && pinned.length === 0 ? `
          <div class="col-span-full text-center py-12 text-muted">
            <p>No notes yet. Create your first note!</p>
          </div>
        ` : unpinned.map(n => this.renderNote(n)).join('')}
      </div>
    `;

    // Event listeners
    document.getElementById('add-note')?.addEventListener('click', () => this.showEditor());
    document.getElementById('export-notes')?.addEventListener('click', () => this.showExportDialog());
    document.getElementById('search-notes')?.addEventListener('input', (e) => {
      this.search((e.target as HTMLInputElement).value);
    });

    // Note actions
    this.container.querySelectorAll('[data-delete]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.delete!;
        this.delete(id);
      });
    });

    this.container.querySelectorAll('[data-pin]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.pin!;
        this.pin(id);
      });
    });

    this.container.querySelectorAll('[data-edit]').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.edit!;
        const note = this.notes.find(n => n.id === id);
        if (note) this.showEditor(note);
      });
    });
  }

  private renderNote(note: Note): string {
    return `
      <div class="p-4 rounded-xl border border-border" style="background: ${note.color}20">
        <div class="flex items-start justify-between mb-2">
          <h4 class="font-bold text-lg">${this.escapeHtml(note.title)}</h4>
          ${note.pinned ? '<span class="text-yellow-500">📌</span>' : ''}
        </div>
        <p class="text-sm text-muted whitespace-pre-wrap mb-3">${this.escapeHtml(note.content || 'No content')}</p>
        <div class="flex items-center justify-between text-xs text-muted">
          <span>${this.formatDate(note.updatedAt)}</span>
          <div class="flex gap-2">
            <button data-pin="${note.id}" class="hover:text-yellow-500">📌</button>
            <button data-edit="${note.id}" class="hover:text-primary">✏️</button>
            <button data-delete="${note.id}" class="hover:text-red-500">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }

  private showEditor(note?: Note): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/50" onclick="this.parentElement.remove()"></div>
      <div class="relative w-full max-w-lg bg-card rounded-xl shadow-2xl p-6">
        <h3 class="text-xl font-bold mb-4">${note ? 'Edit Note' : 'New Note'}</h3>
        <div class="space-y-4">
          <input type="text" id="note-title" placeholder="Title" class="w-full px-4 py-2 rounded-lg border bg-background" value="${note?.title || ''}">
          <textarea id="note-content" placeholder="Write your note..." rows="6" class="w-full px-4 py-2 rounded-lg border bg-background resize-none">${note?.content || ''}</textarea>
          <div class="flex gap-2">
            ${this.colors.map((c, i) => `
              <button data-color="${c}" class="w-8 h-8 rounded-full border-2 ${note?.color === c ? 'border-foreground' : 'border-transparent'}" style="background: ${c}"></button>
            `).join('')}
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button id="cancel-note" class="px-4 py-2 bg-muted rounded-lg">Cancel</button>
          <button id="save-note" class="px-4 py-2 bg-primary text-white rounded-lg">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let selectedColor = note?.color || this.colors[0];
    modal.querySelectorAll('[data-color]').forEach(el => {
      el.addEventListener('click', (e) => {
        selectedColor = (e.target as HTMLElement).dataset.color!;
        modal.querySelectorAll('[data-color]').forEach(btn => {
          btn.classList.toggle('border-foreground', btn === e.target);
          btn.classList.toggle('border-transparent', btn !== e.target);
        });
      });
    });

    modal.querySelector('#cancel-note')?.addEventListener('click', () => modal.remove());
    modal.querySelector('#save-note')?.addEventListener('click', () => {
      const title = (modal.querySelector('#note-title') as HTMLInputElement).value;
      const content = (modal.querySelector('#note-content') as HTMLTextAreaElement).value;
      
      if (note) {
        this.update(note.id, { title, content, color: selectedColor });
      } else {
        this.add(title, content);
      }
      modal.remove();
    });
  }

  private showExportDialog(): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/50" onclick="this.parentElement.remove()"></div>
      <div class="relative w-full max-w-md bg-card rounded-xl shadow-2xl p-6">
        <h3 class="text-xl font-bold mb-4">Export Notes</h3>
        <div class="space-y-2">
          <button data-format="json" class="w-full p-3 text-left rounded-lg border border-border hover:bg-muted">JSON (for backup)</button>
          <button data-format="markdown" class="w-full p-3 text-left rounded-lg border border-border hover:bg-muted">Markdown</button>
          <button data-format="plain" class="w-full p-3 text-left rounded-lg border border-border hover:bg-muted">Plain Text</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-format]').forEach(el => {
      el.addEventListener('click', (e) => {
        const format = (e.target as HTMLElement).dataset.format as 'json' | 'markdown' | 'plain';
        const data = this.export(format);
        navigator.clipboard.writeText(data).then(() => {
          toast.success('Copied to clipboard!');
          modal.remove();
        });
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
// CALCULATOR APP
// =============================================================================
class Calculator {
  private container: HTMLElement;
  private display: string = '0';
  private previous: string = '';
  private operator: string = '';
  private newNumber: boolean = true;

  constructor(selector: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.render();
  }

  private input(value: string): void {
    if ('0123456789.'.includes(value)) {
      if (this.newNumber) {
        this.display = value === '.' ? '0.' : value;
        this.newNumber = false;
      } else {
        if (value === '.' && this.display.includes('.')) return;
        this.display += value;
      }
    } else if ('+-×÷'.includes(value)) {
      this.previous = this.display;
      this.operator = value;
      this.newNumber = true;
    } else if (value === '=') {
      this.calculate();
    } else if (value === 'C') {
      this.display = '0';
      this.previous = '';
      this.operator = '';
    } else if (value === '⌫') {
      this.display = this.display.slice(0, -1) || '0';
    } else if (value === '±') {
      this.display = (parseFloat(this.display) * -1).toString();
    } else if (value === '%') {
      this.display = (parseFloat(this.display) / 100).toString();
    }
    this.render();
  }

  private calculate(): void {
    const prev = parseFloat(this.previous);
    const curr = parseFloat(this.display);
    let result = 0;

    switch (this.operator) {
      case '+': result = prev + curr; break;
      case '-': result = prev - curr; break;
      case '×': result = prev * curr; break;
      case '÷': result = curr !== 0 ? prev / curr : 0; break;
    }

    this.display = result.toString();
    this.previous = '';
    this.operator = '';
    this.newNumber = true;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="max-w-xs mx-auto">
        <div class="bg-card rounded-t-xl p-4 text-right border border-border">
          <div class="text-4xl font-bold truncate">${this.display}</div>
          ${this.operator ? `<div class="text-sm text-muted">${this.previous} ${this.operator}</div>` : ''}
        </div>
        <div class="grid grid-cols-4 gap-2 p-4 bg-muted rounded-b-xl">
          ${[
            ['C', '±', '%', '÷'],
            ['7', '8', '9', '×'],
            ['4', '5', '6', '-'],
            ['1', '2', '3', '+'],
            ['0', '.', '⌫', '=']
          ].map(row => `
            ${row.map(btn => `
              <button data-btn="${btn}" class="h-14 rounded-lg font-bold text-lg transition-colors
                ${btn === '=' ? 'bg-primary text-white' : 
                  '+-×÷'.includes(btn) ? 'bg-secondary text-white' : 
                  'C±%'.includes(btn) ? 'bg-muted' : 'bg-card border'}"
              >
                ${btn}
              </button>
            `).join('')}
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('[data-btn]').forEach(el => {
      el.addEventListener('click', () => {
        this.input((el as HTMLElement).dataset.btn!);
      });
    });
  }
}

// =============================================================================
// DRAWING APP
// =============================================================================
class DrawingApp {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private drawing: boolean = false;
  private brushSize: number = 5;
  private brushColor: string = '#000000';
  private lastX: number = 0;
  private lastY: number = 0;

  constructor(selector: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Toolbar -->
        <div class="flex flex-wrap gap-2 p-4 border-b border-border items-center">
          <div class="flex gap-1">
            ${['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'].map(c => `
              <button data-color="${c}" class="w-8 h-8 rounded-full border-2 ${this.brushColor === c ? 'border-foreground scale-110' : 'border-transparent'}" style="background: ${c}"></button>
            `).join('')}
          </div>
          <input type="color" id="color-picker" value="${this.brushColor}" class="w-8 h-8 cursor-pointer">
          <div class="flex gap-1">
            ${[2, 5, 10, 20].map(s => `
              <button data-size="${s}" class="w-8 h-8 rounded border ${this.brushSize === s ? 'border-primary bg-primary/10' : 'border-border'} flex items-center justify-center">
                <div class="rounded-full bg-foreground" style="width: ${s}px; height: ${s}px"></div>
              </button>
            `).join('')}
          </div>
          <button id="clear-canvas" class="px-3 py-2 rounded-lg bg-muted text-sm">Clear</button>
          <button id="undo-canvas" class="px-3 py-2 rounded-lg bg-muted text-sm">Undo</button>
        </div>
        
        <!-- Canvas -->
        <div class="flex-1 bg-white p-4 overflow-auto">
          <canvas id="drawing-canvas" class="border border-border rounded-lg w-full h-full cursor-crosshair touch-none"></canvas>
        </div>
      </div>
    `;

    this.setupCanvas();
  }

  private setupCanvas(): void {
    this.canvas = document.getElementById('drawing-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    // Set canvas size
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width - 32;
    this.canvas.height = rect.height - 32;
    
    // Fill white
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Events
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDrawing(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());

    // Toolbar events
    document.querySelectorAll('[data-color]').forEach(el => {
      el.addEventListener('click', () => {
        this.brushColor = (el as HTMLElement).dataset.color!;
        this.render();
      });
    });

    document.getElementById('color-picker')?.addEventListener('input', (e) => {
      this.brushColor = (e.target as HTMLInputElement).value;
      this.render();
    });

    document.querySelectorAll('[data-size]').forEach(el => {
      el.addEventListener('click', () => {
        this.brushSize = parseInt((el as HTMLElement).dataset.size!);
        this.render();
      });
    });

    document.getElementById('clear-canvas')?.addEventListener('click', () => {
      if (this.ctx) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas!.width, this.canvas!.height);
      }
    });
  }

  private getCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private startDrawing(e: MouseEvent | Touch): void {
    this.drawing = true;
    const coords = this.getCoords(e);
    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  private draw(e: MouseEvent | Touch): void {
    if (!this.drawing || !this.ctx) return;
    
    const coords = this.getCoords(e);
    this.ctx.strokeStyle = this.brushColor;
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();
    
    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  private stopDrawing(): void {
    this.drawing = false;
  }

  export(): string {
    return this.canvas?.toDataURL('image/png') || '';
  }
}

// =============================================================================
// WEATHER WIDGET
// =============================================================================
class WeatherWidget {
  private container: HTMLElement;
  private location: string = 'auto:ip';
  private unit: 'C' | 'F' = 'C';
  private apiKey: string = ''; // OpenWeatherMap API key

  constructor(selector: string, apiKey?: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.apiKey = apiKey || '';
    this.render();
  }

  async fetchWeather(): Promise<void> {
    if (!this.apiKey) {
      this.container.innerHTML = `
        <div class="text-center p-6">
          <p class="text-muted mb-2">Weather widget requires an API key</p>
          <a href="https://openweathermap.org/api" target="_blank" class="text-primary text-sm">Get API key →</a>
        </div>
      `;
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${this.location}&units=metric&appid=${this.apiKey}`
      );
      const data = await response.json();
      this.displayWeather(data);
    } catch (error) {
      this.container.innerHTML = `<p class="text-center text-muted">Unable to load weather</p>`;
    }
  }

  private displayWeather(data: any): void {
    const temp = this.unit === 'C' ? data.main.temp : data.main.temp * 9/5 + 32;
    const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    this.container.innerHTML = `
      <div class="text-center p-6">
        <img src="${icon}" alt="${data.weather[0].description}" class="w-20 h-20 mx-auto">
        <div class="text-4xl font-bold mb-2">${Math.round(temp)}°${this.unit}</div>
        <div class="text-lg text-muted">${data.name}</div>
        <div class="text-sm text-muted">${data.weather[0].description}</div>
        <div class="flex justify-center gap-6 mt-4 text-sm">
          <div>💨 ${data.wind.speed} m/s</div>
          <div>💧 ${data.main.humidity}%</div>
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = `<div class="animate-pulse">Loading weather...</div>`;
    this.fetchWeather();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { NotesApp, Calculator, DrawingApp, WeatherWidget };
export default { NotesApp, Calculator, DrawingApp, WeatherWidget };
