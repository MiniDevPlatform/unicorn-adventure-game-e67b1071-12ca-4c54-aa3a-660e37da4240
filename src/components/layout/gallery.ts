/**
 * MiniDev ONE Template - Gallery System
 * 
 * Masonry gallery with lightbox, filtering, and albums.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface GalleryImage {
  id: string;
  src: string;
  thumbnail?: string;
  alt: string;
  title?: string;
  description?: string;
  tags: string[];
  category: string;
  width: number;
  height: number;
  size: number;
  uploadedAt: number;
  likes: number;
  views: number;
  albumId?: string;
}

interface GalleryAlbum {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  imageIds: string[];
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
}

interface GalleryCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  imageCount: number;
}

interface GallerySettings {
  layout: 'masonry' | 'grid' | 'justified' | 'metro';
  columns: number;
  gap: number;
  lazyLoad: boolean;
  showFilters: boolean;
  showLightbox: boolean;
  enableDownload: boolean;
}

// =============================================================================
// LIGHTBOX
// =============================================================================
class Lightbox {
  private overlay: HTMLElement;
  private image: HTMLImageElement;
  private title: HTMLElement;
  private description: HTMLElement;
  private counter: HTMLElement;
  private images: GalleryImage[] = [];
  private currentIndex: number = 0;
  private onClose?: () => void;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'lightbox-overlay';
    this.overlay.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close">✕</button>
        <button class="lightbox-prev">◀</button>
        <button class="lightbox-next">▶</button>
        <div class="lightbox-image-container">
          <img class="lightbox-image" src="" alt="">
        </div>
        <div class="lightbox-info">
          <h3 class="lightbox-title"></h3>
          <p class="lightbox-description"></p>
          <div class="lightbox-counter"></div>
        </div>
        <div class="lightbox-toolbar">
          <button class="lightbox-download" title="Download">⬇️ Download</button>
          <button class="lightbox-zoom-in" title="Zoom In">🔍+</button>
          <button class="lightbox-zoom-out" title="Zoom Out">🔍-</button>
        </div>
      </div>
    `;

    this.image = this.overlay.querySelector('.lightbox-image')!;
    this.title = this.overlay.querySelector('.lightbox-title')!;
    this.description = this.overlay.querySelector('.lightbox-description')!;
    this.counter = this.overlay.querySelector('.lightbox-counter')!;

    this.setupEvents();
  }

  private setupEvents(): void {
    this.overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('lightbox-close') || target.classList.contains('lightbox-overlay')) {
        this.close();
      } else if (target.classList.contains('lightbox-prev')) {
        this.prev();
      } else if (target.classList.contains('lightbox-next')) {
        this.next();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (this.overlay.classList.contains('active')) {
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.prev();
        if (e.key === 'ArrowRight') this.next();
      }
    });
  }

  show(images: GalleryImage[], startIndex: number = 0, onClose?: () => void): void {
    this.images = images;
    this.currentIndex = startIndex;
    this.onClose = onClose;

    document.body.appendChild(this.overlay);
    this.overlay.classList.add('active');
    this.loadImage();
  }

  private loadImage(): void {
    const img = this.images[this.currentIndex];
    if (!img) return;

    this.image.src = img.src;
    this.image.alt = img.alt;
    this.title.textContent = img.title || img.alt;
    this.description.textContent = img.description || '';
    this.counter.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
  }

  prev(): void {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.loadImage();
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.loadImage();
  }

  close(): void {
    this.overlay.classList.remove('active');
    this.onClose?.();
    setTimeout(() => this.overlay.remove(), 300);
  }
}

// =============================================================================
// UPLOAD MANAGER
// =============================================================================
class UploadManager {
  private container: HTMLElement;
  private images: GalleryImage[] = [];
  private onUpload?: (images: GalleryImage[]) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setOnUpload(callback: (images: GalleryImage[]) => void): void {
    this.onUpload = callback;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
           id="dropzone">
        <input type="file" id="file-input" accept="image/*" multiple class="hidden">
        <div class="upload-icon text-6xl mb-4">📁</div>
        <h3 class="text-xl font-bold mb-2">Drop images here or click to upload</h3>
        <p class="text-muted">Supports: JPG, PNG, GIF, WebP, SVG</p>
        <p class="text-sm text-muted mt-2">Max file size: 10MB</p>
      </div>
      <div id="preview-grid" class="grid grid-cols-4 gap-4 mt-4"></div>
    `;

    const dropzone = document.getElementById('dropzone')!;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-primary', 'bg-primary/5');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-primary', 'bg-primary/5');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-primary', 'bg-primary/5');
      this.handleFiles(e.dataTransfer?.files || new FileList());
    });

    fileInput.addEventListener('change', () => {
      this.handleFiles(fileInput.files || new FileList());
    });
  }

  private async handleFiles(files: FileList): Promise<void> {
    const previewGrid = document.getElementById('preview-grid')!;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const image: GalleryImage = {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            src: e.target?.result as string,
            alt: file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            tags: [],
            category: 'uncategorized',
            width: img.width,
            height: img.height,
            size: file.size,
            uploadedAt: Date.now(),
            likes: 0,
            views: 0,
          };

          this.images.push(image);
          this.renderPreview(image);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  private renderPreview(image: GalleryImage): void {
    const previewGrid = document.getElementById('preview-grid')!;
    const preview = document.createElement('div');
    preview.className = 'relative group';
    preview.innerHTML = `
      <img src="${image.src}" alt="${image.alt}" class="w-full h-24 object-cover rounded-lg">
      <button class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              data-remove="${image.id}">✕</button>
    `;
    previewGrid.appendChild(preview);

    preview.querySelector('[data-remove]')?.addEventListener('click', () => {
      this.images = this.images.filter(i => i.id !== image.id);
      preview.remove();
    });
  }

  getImages(): GalleryImage[] {
    return this.images;
  }
}

// =============================================================================
// GALLERY ENGINE
// =============================================================================
class GalleryEngine {
  private container: HTMLElement;
  private lightbox: Lightbox;
  private images: Map<string, GalleryImage> = new Map();
  private albums: Map<string, GalleryAlbum> = new Map();
  private categories: Map<string, GalleryCategory> = new Map();
  private storageKey: string;
  private settings: GallerySettings;
  private uploadManager: UploadManager | null = null;

  private view: 'gallery' | 'album' | 'upload' = 'gallery';
  private currentAlbum: string = '';
  private selectedCategory: string = 'all';
  private searchQuery: string = '';
  private sortBy: 'date' | 'name' | 'likes' | 'views' = 'date';

  constructor(selector: string, storageKey: string = 'gallery') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.lightbox = new Lightbox();

    this.settings = {
      layout: 'masonry',
      columns: 3,
      gap: 16,
      lazyLoad: true,
      showFilters: true,
      showLightbox: true,
      enableDownload: true,
    };

    this.load();
    this.render();
  }

  private load(): void {
    const saved = storage.get<{
      images: GalleryImage[];
      albums: GalleryAlbum[];
      categories: GalleryCategory[];
      settings: GallerySettings;
    }>(this.storageKey);

    if (saved) {
      saved.images.forEach(i => this.images.set(i.id, i));
      saved.albums.forEach(a => this.albums.set(a.id, a));
      saved.categories.forEach(c => this.categories.set(c.id, c));
      if (saved.settings) this.settings = { ...this.settings, ...saved.settings };
    } else {
      this.initSampleData();
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      images: Array.from(this.images.values()),
      albums: Array.from(this.albums.values()),
      categories: Array.from(this.categories.values()),
      settings: this.settings,
    });
  }

  private initSampleData(): void {
    // Categories
    const categories: GalleryCategory[] = [
      { id: 'cat_nature', name: 'Nature', slug: 'nature', icon: '🌿', color: '#22c55e', imageCount: 0 },
      { id: 'cat_tech', name: 'Technology', slug: 'tech', icon: '💻', color: '#3b82f6', imageCount: 0 },
      { id: 'cat_art', name: 'Art', slug: 'art', icon: '🎨', color: '#8b5cf6', imageCount: 0 },
      { id: 'cat_people', name: 'People', slug: 'people', icon: '👥', color: '#f59e0b', imageCount: 0 },
      { id: 'cat_cities', name: 'Cities', slug: 'cities', icon: '🏙️', color: '#ef4444', imageCount: 0 },
    ];
    categories.forEach(c => this.categories.set(c.id, c));

    // Sample images (using placeholder URLs)
    const sampleImages: GalleryImage[] = [
      { id: 'img_1', src: 'https://picsum.photos/800/600?random=1', alt: 'Mountain landscape', title: 'Mountain Morning', tags: ['nature', 'landscape'], category: 'cat_nature', width: 800, height: 600, size: 120000, uploadedAt: Date.now() - 86400000, likes: 24, views: 156 },
      { id: 'img_2', src: 'https://picsum.photos/600/800?random=2', alt: 'City at night', title: 'Neon City', tags: ['city', 'night'], category: 'cat_cities', width: 600, height: 800, size: 95000, uploadedAt: Date.now() - 172800000, likes: 45, views: 234 },
      { id: 'img_3', src: 'https://picsum.photos/700/700?random=3', alt: 'Abstract art', title: 'Color Explosion', tags: ['abstract', 'art'], category: 'cat_art', width: 700, height: 700, size: 145000, uploadedAt: Date.now() - 259200000, likes: 67, views: 312 },
      { id: 'img_4', src: 'https://picsum.photos/900/600?random=4', alt: 'Forest', title: 'Green Paradise', tags: ['forest', 'nature'], category: 'cat_nature', width: 900, height: 600, size: 180000, uploadedAt: Date.now() - 345600000, likes: 89, views: 456 },
      { id: 'img_5', src: 'https://picsum.photos/800/500?random=5', alt: 'Technology', title: 'Circuit Board', tags: ['tech', 'abstract'], category: 'cat_tech', width: 800, height: 500, size: 110000, uploadedAt: Date.now() - 432000000, likes: 34, views: 189 },
      { id: 'img_6', src: 'https://picsum.photos/600/900?random=6', alt: 'Portrait', title: 'Studio Portrait', tags: ['portrait', 'people'], category: 'cat_people', width: 600, height: 900, size: 130000, uploadedAt: Date.now() - 518400000, likes: 56, views: 278 },
      { id: 'img_7', src: 'https://picsum.photos/750/500?random=7', alt: 'Ocean', title: 'Blue Horizon', tags: ['ocean', 'nature'], category: 'cat_nature', width: 750, height: 500, size: 95000, uploadedAt: Date.now() - 604800000, likes: 78, views: 345 },
      { id: 'img_8', src: 'https://picsum.photos/500/750?random=8', alt: 'Architecture', title: 'Modern Building', tags: ['architecture', 'city'], category: 'cat_cities', width: 500, height: 750, size: 120000, uploadedAt: Date.now() - 691200000, likes: 43, views: 234 },
    ];
    sampleImages.forEach(i => this.images.set(i.id, i));

    // Update category counts
    categories.forEach(cat => {
      cat.imageCount = sampleImages.filter(i => i.category === cat.id).length;
    });

    // Sample album
    const album: GalleryAlbum = {
      id: 'album_1',
      name: 'Featured',
      description: 'Our favorite collection',
      coverImage: sampleImages[0].src,
      imageIds: sampleImages.map(i => i.id),
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      isPublic: true,
    };
    this.albums.set(album.id, album);

    this.save();
  }

  // =============================================================================
  // IMAGE MANAGEMENT
  // =============================================================================
  addImage(image: GalleryImage): void {
    this.images.set(image.id, image);
    this.updateCategoryCount(image.category);
    this.save();
  }

  addImages(images: GalleryImage[]): void {
    images.forEach(i => this.addImage(i));
  }

  removeImage(imageId: string): void {
    const image = this.images.get(imageId);
    if (image) {
      this.updateCategoryCount(image.category, true);
      this.images.delete(imageId);
      
      // Remove from albums
      this.albums.forEach(album => {
        album.imageIds = album.imageIds.filter(id => id !== imageId);
      });
      
      this.save();
      this.render();
    }
  }

  updateImage(imageId: string, updates: Partial<GalleryImage>): void {
    const image = this.images.get(imageId);
    if (image) {
      Object.assign(image, updates);
      this.save();
      this.render();
    }
  }

  likeImage(imageId: string): void {
    const image = this.images.get(imageId);
    if (image) {
      image.likes++;
      this.save();
      this.render();
    }
  }

  // =============================================================================
  // ALBUM MANAGEMENT
  // =============================================================================
  createAlbum(name: string, description?: string): GalleryAlbum {
    const album: GalleryAlbum = {
      id: `album_${Date.now()}`,
      name,
      description,
      imageIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: true,
    };
    this.albums.set(album.id, album);
    this.save();
    return album;
  }

  addToAlbum(albumId: string, imageIds: string[]): void {
    const album = this.albums.get(albumId);
    if (album) {
      album.imageIds.push(...imageIds.filter(id => !album.imageIds.includes(id)));
      album.updatedAt = Date.now();
      this.save();
    }
  }

  removeFromAlbum(albumId: string, imageId: string): void {
    const album = this.albums.get(albumId);
    if (album) {
      album.imageIds = album.imageIds.filter(id => id !== imageId);
      album.updatedAt = Date.now();
      this.save();
    }
  }

  deleteAlbum(albumId: string): void {
    this.albums.delete(albumId);
    if (this.currentAlbum === albumId) {
      this.navigateGallery();
    }
    this.save();
  }

  // =============================================================================
  // CATEGORY MANAGEMENT
  // =============================================================================
  private updateCategoryCount(categoryId: string, decrease: boolean = false): void {
    const category = this.categories.get(categoryId);
    if (category) {
      if (decrease) {
        category.imageCount = Math.max(0, category.imageCount - 1);
      } else {
        category.imageCount++;
      }
    }
  }

  // =============================================================================
  // NAVIGATION
  // =============================================================================
  navigateGallery(): void {
    this.view = 'gallery';
    this.currentAlbum = '';
    this.render();
  }

  viewAlbum(albumId: string): void {
    this.view = 'album';
    this.currentAlbum = albumId;
    this.render();
  }

  navigateUpload(): void {
    this.view = 'upload';
    this.render();
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    switch (this.view) {
      case 'gallery':
        this.renderGallery();
        break;
      case 'album':
        this.renderAlbum();
        break;
      case 'upload':
        this.renderUpload();
        break;
    }
  }

  private renderGallery(): void {
    const c = getColors();
    const images = this.getFilteredImages();

    this.container.innerHTML = `
      <div class="gallery-container h-full flex flex-col" style="background: ${c.background}">
        <!-- Header -->
        <div class="p-4 border-b flex items-center justify-between" style="border-color: ${c.border}">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold">🖼️ Gallery</h1>
            ${this.settings.showFilters ? this.renderFilters() : ''}
          </div>
          <div class="flex items-center gap-2">
            <button class="layout-btn p-2 rounded-lg ${this.settings.layout === 'masonry' ? 'bg-primary text-white' : 'bg-muted'}" data-layout="masonry" title="Masonry">⊞</button>
            <button class="layout-btn p-2 rounded-lg ${this.settings.layout === 'grid' ? 'bg-primary text-white' : 'bg-muted'}" data-layout="grid" title="Grid">⊟</button>
            <button id="upload-btn" class="px-4 py-2 bg-primary text-white rounded-lg font-medium">+ Upload</button>
            <button id="create-album-btn" class="px-4 py-2 bg-secondary text-white rounded-lg font-medium">📁 Album</button>
          </div>
        </div>
        
        <!-- Albums Row -->
        ${this.albums.size > 0 ? `
          <div class="p-4 border-b overflow-x-auto" style="border-color: ${c.border}">
            <div class="flex gap-4">
              ${Array.from(this.albums.values()).map(album => `
                <div class="flex-shrink-0 w-48 cursor-pointer rounded-lg overflow-hidden border hover:shadow-lg transition-all"
                     data-album="${album.id}">
                  <div class="h-24 bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    ${album.coverImage ? `<img src="${album.coverImage}" class="w-full h-full object-cover" alt="">` : '📁'}
                  </div>
                  <div class="p-2" style="background: ${c.card}">
                    <div class="font-medium text-sm">${this.escapeHtml(album.name)}</div>
                    <div class="text-xs text-muted">${album.imageIds.length} images</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Image Grid -->
        <div class="flex-1 overflow-y-auto p-4">
          ${images.length === 0 ? `
            <div class="flex items-center justify-center h-full">
              <div class="text-center text-muted">
                <p class="text-6xl mb-4">🖼️</p>
                <p class="text-xl mb-4">No images found</p>
                <button class="px-4 py-2 bg-primary text-white rounded-lg" id="empty-upload-btn">Upload Images</button>
              </div>
            </div>
          ` : `
            <div class="gallery-grid ${this.settings.layout === 'grid' ? 'grid-cols-' + this.settings.columns : ''}"
                 style="column-count: ${this.settings.columns}; column-gap: ${this.settings.gap}px;">
              ${images.map((img, index) => this.renderImage(img, index)).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderFilters(): string {
    const categories = Array.from(this.categories.values());
    
    return `
      <div class="flex items-center gap-2">
        <select id="filter-category" class="p-2 rounded-lg border">
          <option value="all">All Categories</option>
          ${categories.map(cat => `
            <option value="${cat.id}" ${this.selectedCategory === cat.id ? 'selected' : ''}>
              ${cat.icon} ${cat.name} (${cat.imageCount})
            </option>
          `).join('')}
        </select>
        <select id="filter-sort" class="p-2 rounded-lg border">
          <option value="date" ${this.sortBy === 'date' ? 'selected' : ''}>Newest</option>
          <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name</option>
          <option value="likes" ${this.sortBy === 'likes' ? 'selected' : ''}>Most Liked</option>
          <option value="views" ${this.sortBy === 'views' ? 'selected' : ''}>Most Viewed</option>
        </select>
        <input type="text" id="filter-search" placeholder="Search..." 
               class="p-2 rounded-lg border" value="${this.escapeHtml(this.searchQuery)}">
      </div>
    `;
  }

  private renderImage(image: GalleryImage, index: number): string {
    return `
      <div class="gallery-item mb-${this.settings.gap} break-inside-avoid rounded-xl overflow-hidden cursor-pointer group"
           data-image-id="${image.id}">
        <div class="relative">
          ${this.settings.lazyLoad ? `
            <img data-src="${image.src}" class="lazy w-full h-auto" loading="lazy" alt="${image.alt}">
          ` : `
            <img src="${image.src}" alt="${image.alt}" class="w-full h-auto">
          `}
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div class="text-white text-center">
              <p class="font-bold">${image.title || image.alt}</p>
              <p class="text-sm">❤️ ${image.likes} • 👁 ${image.views}</p>
            </div>
          </div>
          ${image.tags.length > 0 ? `
            <div class="absolute top-2 left-2 flex gap-1">
              ${image.tags.slice(0, 2).map(tag => `
                <span class="px-2 py-1 bg-black/50 text-white text-xs rounded">${tag}</span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderAlbum(): void {
    const album = this.albums.get(this.currentAlbum);
    if (!album) return this.navigateGallery();

    const images = album.imageIds.map(id => this.images.get(id)).filter(Boolean) as GalleryImage[];
    const c = getColors();

    this.container.innerHTML = `
      <div class="gallery-album h-full flex flex-col" style="background: ${c.background}">
        <!-- Header -->
        <div class="p-4 border-b flex items-center justify-between" style="border-color: ${c.border}">
          <div class="flex items-center gap-4">
            <button class="p-2 rounded-lg bg-muted" data-back>←</button>
            <div>
              <h1 class="text-2xl font-bold">📁 ${this.escapeHtml(album.name)}</h1>
              <p class="text-muted">${album.description || ''} • ${images.length} images</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="px-4 py-2 bg-muted rounded-lg" data-edit-album>✏️ Edit</button>
            <button class="px-4 py-2 bg-red-500 text-white rounded-lg" data-delete-album>🗑️ Delete</button>
          </div>
        </div>
        
        <!-- Grid -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-4 gap-4">
            ${images.map((img, index) => this.renderAlbumImage(img, index)).join('')}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderAlbumImage(image: GalleryImage, index: number): string {
    return `
      <div class="relative rounded-xl overflow-hidden aspect-square cursor-pointer group"
           data-image-index="${index}">
        <img src="${image.src}" alt="${image.alt}" class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <button class="remove-from-album text-white opacity-0 group-hover:opacity-100 bg-red-500 p-2 rounded-full" data-id="${image.id}">✕</button>
        </div>
      </div>
    `;
  }

  private renderUpload(): void {
    const c = getColors();

    this.container.innerHTML = `
      <div class="gallery-upload h-full flex flex-col" style="background: ${c.background}">
        <!-- Header -->
        <div class="p-4 border-b flex items-center gap-4" style="border-color: ${c.border}">
          <button class="p-2 rounded-lg bg-muted" data-back>←</button>
          <h1 class="text-2xl font-bold">📤 Upload Images</h1>
        </div>
        
        <!-- Upload Zone -->
        <div class="flex-1 p-4 overflow-y-auto">
          <div id="upload-container"></div>
          
          <!-- Category & Tags -->
          <div class="mt-6 space-y-4 max-w-2xl mx-auto">
            <div>
              <label class="block font-medium mb-2">Category</label>
              <select id="upload-category" class="w-full p-3 rounded-lg border">
                ${Array.from(this.categories.values()).map(cat => `
                  <option value="${cat.id}">${cat.icon} ${cat.name}</option>
                `).join('')}
              </select>
            </div>
            
            <div>
              <label class="block font-medium mb-2">Tags (comma separated)</label>
              <input type="text" id="upload-tags" class="w-full p-3 rounded-lg border" placeholder="nature, landscape, sunset">
            </div>
            
            <button id="save-uploaded" class="px-6 py-3 bg-primary text-white rounded-lg font-medium">
              Save All Images
            </button>
          </div>
        </div>
      </div>
    `;

    this.uploadManager = new UploadManager(document.getElementById('upload-container')!);
    this.attachEvents();
  }

  private getFilteredImages(): GalleryImage[] {
    let images = Array.from(this.images.values());

    // Filter by category
    if (this.selectedCategory !== 'all') {
      images = images.filter(img => img.category === this.selectedCategory);
    }

    // Filter by search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      images = images.filter(img =>
        img.alt.toLowerCase().includes(query) ||
        img.title?.toLowerCase().includes(query) ||
        img.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (this.sortBy) {
      case 'name':
        images.sort((a, b) => (a.title || a.alt).localeCompare(b.title || b.alt));
        break;
      case 'likes':
        images.sort((a, b) => b.likes - a.likes);
        break;
      case 'views':
        images.sort((a, b) => b.views - a.views);
        break;
      default:
        images.sort((a, b) => b.uploadedAt - a.uploadedAt);
    }

    return images;
  }

  private attachEvents(): void {
    // Back button
    this.container.querySelectorAll('[data-back]').forEach(el => {
      el.addEventListener('click', () => this.navigateGallery());
    });

    // Album navigation
    this.container.querySelectorAll('[data-album]').forEach(el => {
      el.addEventListener('click', () => {
        const albumId = (el as HTMLElement).dataset.album!;
        this.viewAlbum(albumId);
      });
    });

    // Image click (lightbox)
    this.container.querySelectorAll('.gallery-item').forEach(el => {
      el.addEventListener('click', () => {
        if (!this.settings.showLightbox) return;
        const imageId = (el as HTMLElement).dataset.imageId!;
        const images = this.getFilteredImages();
        const index = images.findIndex(i => i.id === imageId);
        this.lightbox.show(images, index);
      });
    });

    // Album image click
    this.container.querySelectorAll('[data-image-index]').forEach(el => {
      el.addEventListener('click', () => {
        if (!this.settings.showLightbox) return;
        const album = this.albums.get(this.currentAlbum);
        if (!album) return;
        const images = album.imageIds.map(id => this.images.get(id)).filter(Boolean) as GalleryImage[];
        const index = parseInt((el as HTMLElement).dataset.imageIndex!);
        this.lightbox.show(images, index);
      });
    });

    // Layout buttons
    this.container.querySelectorAll('.layout-btn').forEach(el => {
      el.addEventListener('click', () => {
        const layout = (el as HTMLElement).dataset.layout as GallerySettings['layout'];
        this.settings.layout = layout;
        this.save();
        this.render();
      });
    });

    // Filters
    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.selectedCategory = (e.target as HTMLSelectElement).value;
      this.render();
    });

    document.getElementById('filter-sort')?.addEventListener('change', (e) => {
      this.sortBy = (e.target as HTMLSelectElement).value as any;
      this.render();
    });

    document.getElementById('filter-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.render();
    });

    // Upload button
    this.container.querySelectorAll('#upload-btn, #empty-upload-btn').forEach(el => {
      el.addEventListener('click', () => this.navigateUpload());
    });

    // Create album
    document.getElementById('create-album-btn')?.addEventListener('click', () => {
      const name = prompt('Album name:');
      if (name) {
        this.createAlbum(name);
        this.render();
      }
    });

    // Delete album
    document.querySelector('[data-delete-album]')?.addEventListener('click', () => {
      if (confirm('Delete this album?')) {
        this.deleteAlbum(this.currentAlbum);
      }
    });

    // Remove from album
    this.container.querySelectorAll('.remove-from-album').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const imageId = (el as HTMLElement).dataset.id!;
        this.removeFromAlbum(this.currentAlbum, imageId);
        this.render();
      });
    });

    // Save uploaded images
    document.getElementById('save-uploaded')?.addEventListener('click', () => {
      if (!this.uploadManager) return;
      const images = this.uploadManager.getImages();
      const category = (document.getElementById('upload-category') as HTMLSelectElement).value;
      const tagsStr = (document.getElementById('upload-tags') as HTMLInputElement).value;
      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

      images.forEach(img => {
        img.category = category;
        img.tags = [...img.tags, ...tags];
      });

      this.addImages(images);
      alert(`Added ${images.length} images!`);
      this.navigateGallery();
    });
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
export { GalleryEngine, Lightbox, UploadManager, GalleryImage, GalleryAlbum, GalleryCategory };
export default GalleryEngine;