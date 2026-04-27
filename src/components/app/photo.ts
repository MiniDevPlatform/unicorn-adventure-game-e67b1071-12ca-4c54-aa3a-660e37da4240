/**
 * MiniDev ONE Template - Photo Editor
 * 
 * Image editing with filters, adjustments, and effects.
 */

import { FEATURES, getColors } from '@/lib/config';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface PhotoEdit {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
}

interface Filter {
  id: string;
  name: string;
  preview: string;
  values: Partial<PhotoEdit>;
}

interface Layer {
  id: string;
  type: 'image' | 'text' | 'shape';
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
}

// =============================================================================
// PRESET FILTERS
// =============================================================================
const PRESET_FILTERS: Filter[] = [
  { id: 'normal', name: 'Normal', preview: '🖼️', values: {} },
  { id: 'vintage', name: 'Vintage', preview: '📷', values: { sepia: 30, contrast: 10, brightness: -5 } },
  { id: 'warm', name: 'Warm', preview: '☀️', values: { saturation: 20, hue: 10, brightness: 5 } },
  { id: 'cool', name: 'Cool', preview: '❄️', values: { saturation: 10, hue: -10, brightness: -5 } },
  { id: 'dramatic', name: 'Dramatic', preview: '🎭', values: { contrast: 40, saturation: -20, brightness: -10 } },
  { id: 'fade', name: 'Fade', preview: '🌫️', values: { brightness: 10, contrast: -20, saturation: -30 } },
  { id: 'vivid', name: 'Vivid', preview: '🌈', values: { saturation: 50, contrast: 20, brightness: 5 } },
  { id: 'noir', name: 'Noir', preview: '🎬', values: { grayscale: 100, contrast: 30 } },
  { id: 'polaroid', name: 'Polaroid', preview: '📸', values: { sepia: 20, contrast: 10, brightness: 5, saturation: -10 } },
  { id: 'crossprocess', name: 'Cross Process', preview: '💫', values: { hue: 20, saturation: 30, contrast: 15 } },
  { id: 'aqua', name: 'Aqua', preview: '🌊', values: { hue: -20, saturation: 30, brightness: 5 } },
  { id: 'autumn', name: 'Autumn', preview: '🍂', values: { hue: 15, saturation: 25, brightness: -5 } },
];

// =============================================================================
// PHOTO EDITOR
// =============================================================================
class PhotoEditor {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImage: HTMLImageElement | null = null;
  private editedImage: ImageData | null = null;
  private currentEdits: PhotoEdit = this.getDefaultEdits();
  private currentFilter: string = 'normal';
  private layers: Layer[] = [];
  private history: PhotoEdit[] = [];
  private historyIndex: number = -1;
  private zoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private isDragging: boolean = false;
  private tool: 'select' | 'crop' | 'brush' = 'select';

  constructor(selector: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'photo-canvas w-full h-full';
    this.ctx = this.canvas.getContext('2d')!;

    this.render();
  }

  private getDefaultEdits(): PhotoEdit {
    return {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      invert: 0,
    };
  }

  // =============================================================================
  // IMAGE LOADING
  // =============================================================================
  loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.originalImage = img;
        
        // Set canvas size
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        
        // Reset edits
        this.currentEdits = this.getDefaultEdits();
        this.currentFilter = 'normal';
        this.history = [];
        this.historyIndex = -1;
        
        // Draw initial image
        this.drawImage();
        
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  loadFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.loadImage(reader.result as string).then(resolve).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // =============================================================================
  // DRAWING
  // =============================================================================
  private drawImage(): void {
    if (!this.originalImage) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw image
    this.ctx.drawImage(this.originalImage, 0, 0);

    // Get image data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Apply filters
    const filtered = this.applyFilters(imageData);

    // Put back
    this.ctx.putImageData(filtered, 0, 0);
  }

  private applyFilters(imageData: ImageData): ImageData {
    const data = imageData.data;
    const { brightness, contrast, saturation, hue, blur, grayscale, sepia, invert } = this.currentEdits;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      r += brightness;
      g += brightness;
      b += brightness;

      // Contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;

      // Saturation
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + saturation * (r - gray) / 100 + 100;
      g = gray + saturation * (g - gray) / 100 + 100;
      b = gray + saturation * (b - gray) / 100 + 100;

      // Hue rotation (simplified)
      if (hue !== 0) {
        const rot = hue * 0.0174533;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const matrix = [
          0.299 + 0.701 * cos + 0.168 * sin, 0.587 - 0.587 * cos + 0.330 * sin, 0.114 - 0.114 * cos - 0.497 * sin, 0,
          0.299 - 0.299 * cos - 0.328 * sin, 0.587 + 0.413 * cos + 0.035 * sin, 0.114 - 0.114 * cos + 0.292 * sin, 0,
          0.299 - 0.300 * cos + 1.250 * sin, 0.587 - 0.588 * cos - 1.050 * sin, 0.114 + 0.886 * cos - 0.203 * sin, 0,
          0, 0, 0, 1,
        ];
        const newR = matrix[0] * r + matrix[1] * g + matrix[2] * b;
        const newG = matrix[4] * r + matrix[5] * g + matrix[6] * b;
        const newB = matrix[8] * r + matrix[9] * g + matrix[10] * b;
        r = newR;
        g = newG;
        b = newB;
      }

      // Grayscale
      if (grayscale > 0) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + grayscale * (r - gray) / 100;
        g = gray + grayscale * (g - gray) / 100;
        b = gray + grayscale * (b - gray) / 100;
      }

      // Sepia
      if (sepia > 0) {
        const newR = r + (255 - r) * sepia / 100 * 0.5;
        const newG = g + (255 - g) * sepia / 100 * 0.5;
        const newB = b + (255 - b) * sepia / 100 * 0.5;
        r = newR;
        g = newG;
        b = newB;
      }

      // Invert
      if (invert > 0) {
        r = 255 - r * (100 - invert) / 100 - 255 * invert / 100;
        g = 255 - g * (100 - invert) / 100 - 255 * invert / 100;
        b = 255 - b * (100 - invert) / 100 - 255 * invert / 100;
      }

      // Clamp
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    return imageData;
  }

  // =============================================================================
  // EDITING
  // =============================================================================
  setEdit(property: keyof PhotoEdit, value: number): void {
    this.currentEdits[property] = value;
    this.drawImage();
  }

  applyFilter(filterId: string): void {
    const filter = PRESET_FILTERS.find(f => f.id === filterId);
    if (!filter) return;

    this.currentFilter = filterId;
    this.currentEdits = { ...this.getDefaultEdits(), ...filter.values };
    this.drawImage();
    this.saveToHistory();
  }

  adjustValue(property: keyof PhotoEdit, delta: number): void {
    this.setEdit(property, this.currentEdits[property] + delta);
  }

  private saveToHistory(): void {
    // Remove any future history
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ ...this.currentEdits });
    this.historyIndex = this.history.length - 1;
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentEdits = { ...this.history[this.historyIndex] };
      this.drawImage();
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentEdits = { ...this.history[this.historyIndex] };
      this.drawImage();
    }
  }

  reset(): void {
    this.currentEdits = this.getDefaultEdits();
    this.currentFilter = 'normal';
    this.drawImage();
    this.saveToHistory();
  }

  // =============================================================================
  // ZOOM & PAN
  // =============================================================================
  setZoom(level: number): void {
    this.zoom = Math.max(0.1, Math.min(5, level));
    this.updateCanvasTransform();
  }

  zoomIn(): void {
    this.setZoom(this.zoom * 1.2);
  }

  zoomOut(): void {
    this.setZoom(this.zoom / 1.2);
  }

  fitToScreen(): void {
    const containerRect = this.container.getBoundingClientRect();
    const scaleX = containerRect.width / this.canvas.width;
    const scaleY = containerRect.height / this.canvas.height;
    this.zoom = Math.min(scaleX, scaleY) * 0.9;
    this.panX = 0;
    this.panY = 0;
    this.updateCanvasTransform();
  }

  private updateCanvasTransform(): void {
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  // =============================================================================
  // EXPORT
  // =============================================================================
  export(type: 'png' | 'jpeg' = 'png', quality: number = 0.9): string {
    if (type === 'jpeg') {
      return this.canvas.toDataURL('image/jpeg', quality);
    }
    return this.canvas.toDataURL('image/png');
  }

  download(filename: string = 'edited', type: 'png' | 'jpeg' = 'png'): void {
    const link = document.createElement('a');
    link.download = `${filename}.${type}`;
    link.href = this.export(type);
    link.click();
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="photo-editor flex flex-col h-full" style="background: ${c.background}">
        <!-- Toolbar -->
        <div class="flex items-center justify-between p-3 border-b border-border bg-card">
          <div class="flex items-center gap-2">
            <button id="tool-select" class="tool-btn px-3 py-2 rounded-lg bg-primary text-white" data-tool="select">🖱️ Select</button>
            <button id="tool-crop" class="tool-btn px-3 py-2 rounded-lg hover:bg-muted" data-tool="crop">✂️ Crop</button>
            <button id="tool-brush" class="tool-btn px-3 py-2 rounded-lg hover:bg-muted" data-tool="brush">🖌️ Brush</button>
          </div>
          <div class="flex items-center gap-2">
            <button id="undo-btn" class="px-3 py-2 rounded-lg hover:bg-muted" title="Undo">↩️ Undo</button>
            <button id="redo-btn" class="px-3 py-2 rounded-lg hover:bg-muted" title="Redo">↪️ Redo</button>
            <button id="reset-btn" class="px-3 py-2 rounded-lg hover:bg-muted" title="Reset">🔄 Reset</button>
          </div>
        </div>

        <!-- Main Area -->
        <div class="flex flex-1 overflow-hidden">
          <!-- Left Panel - Tools -->
          <div class="w-64 border-r border-border p-4 overflow-y-auto">
            <!-- Filters -->
            <div class="mb-6">
              <h3 class="font-bold mb-3">Filters</h3>
              <div class="grid grid-cols-3 gap-2">
                ${PRESET_FILTERS.map(filter => `
                  <button class="filter-btn p-2 rounded-lg border border-border hover:border-primary transition-colors ${this.currentFilter === filter.id ? 'border-primary bg-primary/10' : ''}"
                          data-filter="${filter.id}">
                    <div class="text-2xl mb-1">${filter.preview}</div>
                    <div class="text-xs">${filter.name}</div>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Adjustments -->
            <div class="mb-6">
              <h3 class="font-bold mb-3">Adjustments</h3>
              <div class="space-y-4">
                ${this.renderSlider('brightness', '☀️ Brightness', -100, 100)}
                ${this.renderSlider('contrast', '◐ Contrast', -100, 100)}
                ${this.renderSlider('saturation', '🎨 Saturation', -100, 100)}
                ${this.renderSlider('hue', '🌈 Hue', -180, 180)}
                ${this.renderSlider('blur', '💨 Blur', 0, 20)}
              </div>
            </div>

            <!-- Effects -->
            <div class="mb-6">
              <h3 class="font-bold mb-3">Effects</h3>
              <div class="space-y-4">
                ${this.renderSlider('grayscale', '⬛ Grayscale', 0, 100)}
                ${this.renderSlider('sepia', '🟤 Sepia', 0, 100)}
                ${this.renderSlider('invert', '🔄 Invert', 0, 100)}
              </div>
            </div>
          </div>

          <!-- Center - Canvas -->
          <div class="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
            <div id="canvas-container" class="absolute inset-0 flex items-center justify-center overflow-auto">
              <div id="canvas-wrapper" class="relative shadow-lg">
                <!-- Canvas will be inserted here -->
              </div>
            </div>
          </div>

          <!-- Right Panel - Info -->
          <div class="w-64 border-l border-border p-4">
            <h3 class="font-bold mb-3">Info</h3>
            <div class="text-sm text-muted mb-4">
              <p>Zoom: ${Math.round(this.zoom * 100)}%</p>
              <p>Canvas: ${this.canvas.width} × ${this.canvas.height}</p>
            </div>

            <h3 class="font-bold mb-3">Zoom Controls</h3>
            <div class="flex gap-2 mb-4">
              <button id="zoom-in" class="flex-1 px-3 py-2 bg-muted rounded-lg">+ Zoom</button>
              <button id="zoom-out" class="flex-1 px-3 py-2 bg-muted rounded-lg">- Zoom</button>
            </div>
            <button id="fit-btn" class="w-full px-3 py-2 bg-muted rounded-lg mb-4">Fit to Screen</button>

            <h3 class="font-bold mb-3">Export</h3>
            <div class="space-y-2">
              <button id="export-png" class="w-full px-4 py-2 bg-primary text-white rounded-lg">📥 Save PNG</button>
              <button id="export-jpg" class="w-full px-4 py-2 bg-secondary text-white rounded-lg">📥 Save JPEG</button>
            </div>
          </div>
        </div>

        <!-- Upload Area (if no image) -->
        <div id="upload-area" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 ${this.originalImage ? 'hidden' : ''}">
          <div class="text-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors" id="drop-zone">
            <input type="file" id="file-input" accept="image/*" class="hidden">
            <div class="text-6xl mb-4">📷</div>
            <h3 class="text-xl font-bold mb-2">Drop an image here</h3>
            <p class="text-muted mb-4">or click to browse</p>
            <button class="px-6 py-3 bg-primary text-white rounded-lg">Choose Image</button>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderSlider(property: keyof PhotoEdit, label: string, min: number, max: number): string {
    const value = this.currentEdits[property];
    const percentage = ((value - min) / (max - min)) * 100;

    return `
      <div class="slider-group">
        <div class="flex justify-between mb-1">
          <span class="text-sm">${label}</span>
          <span class="text-sm text-muted">${Math.round(value)}</span>
        </div>
        <input type="range" min="${min}" max="${max}" value="${value}" 
               class="w-full accent-primary slider" data-property="${property}">
      </div>
    `;
  }

  private attachEvents(): void {
    // Add canvas to wrapper
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper && this.originalImage) {
      wrapper.appendChild(this.canvas);
      this.fitToScreen();
    }

    // File upload
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    dropZone?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await this.loadFromFile(file);
        this.render();
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) wrapper.appendChild(this.canvas);
      }
    });

    // Drag and drop
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-primary');
    });
    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-primary');
    });
    dropZone?.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-primary');
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        await this.loadFromFile(file);
        this.render();
      }
    });

    // Filter buttons
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterId = (btn as HTMLElement).dataset.filter!;
        this.applyFilter(filterId);
        this.render();
      });
    });

    // Sliders
    this.container.querySelectorAll('.slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const property = (e.target as HTMLInputElement).dataset.property as keyof PhotoEdit;
        const value = parseInt((e.target as HTMLInputElement).value);
        this.setEdit(property, value);
      });
    });

    // Tool buttons
    this.container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tool = (btn as HTMLElement).dataset.tool as typeof this.tool;
        this.render();
      });
    });

    // Zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
    document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
    document.getElementById('fit-btn')?.addEventListener('click', () => this.fitToScreen());

    // Export
    document.getElementById('export-png')?.addEventListener('click', () => this.download('edited', 'png'));
    document.getElementById('export-jpg')?.addEventListener('click', () => this.download('edited', 'jpeg'));

    // Undo/Redo/Reset
    document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
    document.getElementById('redo-btn')?.addEventListener('click', () => this.redo());
    document.getElementById('reset-btn')?.addEventListener('click', () => this.reset());
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { PhotoEditor, PhotoEdit, Filter, Layer, PRESET_FILTERS };
export default PhotoEditor;