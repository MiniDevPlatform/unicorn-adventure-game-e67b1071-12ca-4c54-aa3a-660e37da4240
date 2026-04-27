/**
 * MiniDev ONE Template - Music Player Component
 * 
 * Audio player with playlist, visualization, and controls.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================
interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  src: string;
  cover?: string;
  genre?: string;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  cover?: string;
  createdAt: number;
}

interface AudioVisualizer {
  type: 'bars' | 'waves' | 'circular';
  color: string;
  intensity: number;
}

// =============================================================================
// MUSIC PLAYER
// =============================================================================
class MusicPlayer {
  private container: HTMLElement;
  private audio: HTMLAudioElement;
  private playlist: Track[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private repeat: 'none' | 'one' | 'all' = 'none';
  private shuffle: boolean = false;
  private volume: number = 0.7;
  private muted: boolean = false;
  private progress: number = 0;
  private storageKey: string;
  private visualizer: AudioVisualizer = { type: 'bars', color: '#667eea', intensity: 0.5 };
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private shuffleOrder: number[] = [];

  constructor(selector: string, storageKey: string = 'music') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.storageKey = storageKey;
    this.audio = new Audio();
    this.audio.volume = this.volume;
    
    this.load();
    this.setupAudioEvents();
    this.render();
  }

  private load(): void {
    const saved = storage.get<{
      playlist: Track[];
      currentIndex: number;
      volume: number;
      repeat: string;
      shuffle: boolean;
    }>(this.storageKey);

    if (saved) {
      this.playlist = saved.playlist || [];
      this.currentIndex = saved.currentIndex || 0;
      this.volume = saved.volume ?? 0.7;
      this.repeat = (saved.repeat as any) || 'none';
      this.shuffle = saved.shuffle ?? false;
    }

    if (this.shuffle) {
      this.generateShuffleOrder();
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      volume: this.volume,
      repeat: this.repeat,
      shuffle: this.shuffle,
    });
  }

  private setupAudioEvents(): void {
    this.audio.addEventListener('timeupdate', () => {
      this.progress = (this.audio.currentTime / this.audio.duration) * 100 || 0;
      this.updateProgress();
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnd();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.render();
    });

    this.audio.addEventListener('error', (e) => {
      logger.error('music', 'Audio error', e);
    });
  }

  private setupAnalyser(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
  }

  // =============================================================================
  // PLAYLIST MANAGEMENT
  // =============================================================================
  addTrack(track: Omit<Track, 'id'>): void {
    const newTrack: Track = {
      ...track,
      id: `track_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    this.playlist.push(newTrack);
    this.generateShuffleOrder();
    this.save();
    this.render();
  }

  addTracks(tracks: Omit<Track, 'id'>[]): void {
    tracks.forEach(t => this.addTrack(t));
  }

  removeTrack(trackId: string): void {
    const index = this.playlist.findIndex(t => t.id === trackId);
    if (index > -1) {
      this.playlist.splice(index, 1);
      if (index < this.currentIndex) {
        this.currentIndex--;
      } else if (index === this.currentIndex) {
        this.currentIndex = Math.min(this.currentIndex, this.playlist.length - 1);
      }
      this.generateShuffleOrder();
      this.save();
      this.render();
    }
  }

  createPlaylist(name: string, tracks: Omit<Track, 'id'>[] = []): Playlist {
    const playlist: Playlist = {
      id: `playlist_${Date.now()}`,
      name,
      tracks: tracks.map(t => ({ ...t, id: `track_${Date.now()}_${Math.random().toString(36).slice(2)}` })),
      createdAt: Date.now(),
    };
    return playlist;
  }

  // =============================================================================
  // PLAYBACK CONTROL
  // =============================================================================
  play(): void {
    if (this.playlist.length === 0) return;
    
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    const track = this.getCurrentTrack();
    if (track) {
      this.audio.src = track.src;
      this.audio.play().catch(e => logger.error('music', 'Play failed', e));
      this.isPlaying = true;
      this.setupAnalyser();
      this.render();
      this.startVisualization();
    }
  }

  pause(): void {
    this.audio.pause();
    this.isPlaying = false;
    this.render();
  }

  toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.progress = 0;
    this.render();
  }

  next(): void {
    if (this.playlist.length === 0) return;
    
    if (this.shuffle) {
      const currentShuffleIndex = this.shuffleOrder.indexOf(this.currentIndex);
      const nextShuffleIndex = (currentShuffleIndex + 1) % this.shuffleOrder.length;
      this.currentIndex = this.shuffleOrder[nextShuffleIndex];
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    }
    
    this.save();
    if (this.isPlaying) {
      this.play();
    } else {
      this.render();
    }
  }

  previous(): void {
    if (this.playlist.length === 0) return;
    
    // If more than 3 seconds in, restart current track
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    if (this.shuffle) {
      const currentShuffleIndex = this.shuffleOrder.indexOf(this.currentIndex);
      const prevShuffleIndex = (currentShuffleIndex - 1 + this.shuffleOrder.length) % this.shuffleOrder.length;
      this.currentIndex = this.shuffleOrder[prevShuffleIndex];
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    }
    
    this.save();
    if (this.isPlaying) {
      this.play();
    } else {
      this.render();
    }
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  seekPercent(percent: number): void {
    this.audio.currentTime = (percent / 100) * this.audio.duration;
  }

  playTrack(trackId: string): void {
    const index = this.playlist.findIndex(t => t.id === trackId);
    if (index > -1) {
      this.currentIndex = index;
      this.save();
      this.play();
    }
  }

  private handleTrackEnd(): void {
    switch (this.repeat) {
      case 'one':
        this.audio.currentTime = 0;
        this.play();
        break;
      case 'all':
        this.next();
        break;
      default:
        if (this.currentIndex < this.playlist.length - 1) {
          this.next();
        } else {
          this.isPlaying = false;
          this.render();
        }
    }
  }

  private getCurrentTrack(): Track | null {
    return this.playlist[this.currentIndex] || null;
  }

  // =============================================================================
  // SETTINGS
  // =============================================================================
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.volume;
    this.muted = this.volume === 0;
    this.save();
    this.renderVolume();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    this.audio.volume = this.muted ? 0 : this.volume;
    this.renderVolume();
  }

  toggleRepeat(): void {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(this.repeat);
    this.repeat = modes[(currentIndex + 1) % modes.length];
    this.save();
    this.renderControls();
  }

  toggleShuffle(): void {
    this.shuffle = !this.shuffle;
    if (this.shuffle) {
      this.generateShuffleOrder();
    }
    this.save();
    this.renderControls();
  }

  private generateShuffleOrder(): void {
    this.shuffleOrder = this.playlist.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]];
    }
  }

  // =============================================================================
  // VISUALIZATION
  // =============================================================================
  private startVisualization(): void {
    if (!this.analyser || !this.canvas) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!this.isPlaying || !this.canvas || !this.canvasCtx || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      const ctx = this.canvasCtx;
      const width = this.canvas.width;
      const height = this.canvas.height;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);

      const barCount = 32;
      const barWidth = width / barCount;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step];
        const barHeight = (value / 255) * height * this.visualizer.intensity;
        
        ctx.fillStyle = this.visualizer.color;
        ctx.fillRect(
          i * barWidth + 1,
          height - barHeight,
          barWidth - 2,
          barHeight
        );
      }

      requestAnimationFrame(draw);
    };

    draw();
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    const { colors } = FEATURES.theme;
    const isDark = getColors() === FEATURES.theme.colors.dark;
    const c = isDark ? colors.dark : colors.light;
    const track = this.getCurrentTrack();

    this.container.innerHTML = `
      <div class="flex flex-col h-full" style="background: ${c.background}">
        <!-- Visualizer -->
        <div class="h-32 flex items-end justify-center p-4" style="background: linear-gradient(180deg, ${c.primary}20, transparent)">
          <canvas id="visualizer" class="w-full h-full" width="300" height="100"></canvas>
        </div>
        
        <!-- Track Info -->
        <div class="p-4 text-center">
          ${track ? `
            <div class="w-20 h-20 mx-auto mb-3 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl">
              🎵
            </div>
            <h3 class="font-bold text-lg">${this.escapeHtml(track.title)}</h3>
            <p class="text-muted">${this.escapeHtml(track.artist)}</p>
          ` : `
            <p class="text-muted">No track selected</p>
          `}
        </div>
        
        <!-- Progress -->
        <div class="px-4 mb-2">
          <input type="range" id="progress" min="0" max="100" value="${this.progress}" 
                 class="w-full h-2 rounded-lg appearance-none cursor-pointer"
                 style="background: ${c.muted}">
          <div class="flex justify-between text-xs text-muted mt-1">
            <span>${this.formatTime(this.audio.currentTime)}</span>
            <span>${this.formatTime(this.audio.duration || 0)}</span>
          </div>
        </div>
        
        <!-- Controls -->
        <div class="flex items-center justify-center gap-4 p-4">
          <button id="shuffle" class="p-2 ${this.shuffle ? 'text-primary' : 'text-muted'}">
            🔀
          </button>
          <button id="previous" class="p-2 text-2xl">⏮</button>
          <button id="play-pause" class="w-16 h-16 rounded-full bg-primary text-white text-2xl flex items-center justify-center">
            ${this.isPlaying ? '⏸' : '▶'}
          </button>
          <button id="next" class="p-2 text-2xl">⏭</button>
          <button id="repeat" class="p-2 ${this.repeat !== 'none' ? 'text-primary' : 'text-muted'}">
            ${this.repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>
        
        <!-- Volume & Settings -->
        <div class="flex items-center justify-center gap-4 p-4 border-t" style="border-color: ${c.border}">
          <button id="mute" class="p-2">${this.muted || this.volume === 0 ? '🔇' : '🔊'}</button>
          <input type="range" id="volume" min="0" max="100" value="${this.volume * 100}" 
                 class="w-24 h-2 rounded-lg appearance-none cursor-pointer"
                 style="background: ${c.muted}">
        </div>
        
        <!-- Playlist -->
        <div class="flex-1 overflow-y-auto border-t" style="border-color: ${c.border}">
          <div class="p-4">
            <h4 class="font-bold mb-3">Playlist (${this.playlist.length})</h4>
            ${this.renderPlaylist()}
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.canvasCtx = this.canvas?.getContext('2d');
    this.attachEvents();
  }

  private renderPlaylist(): string {
    if (this.playlist.length === 0) {
      return '<p class="text-muted text-center py-4">No tracks. Add some!</p>';
    }

    return this.playlist.map((track, index) => {
      const isCurrent = index === this.currentIndex;
      return `
        <div class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted ${isCurrent ? 'bg-primary/10' : ''}"
             data-track="${track.id}">
          <span class="w-6 text-center text-muted">${index + 1}</span>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">${this.escapeHtml(track.title)}</div>
            <div class="text-sm text-muted truncate">${this.escapeHtml(track.artist)}</div>
          </div>
          <span class="text-sm text-muted">${this.formatTime(track.duration)}</span>
          <button data-remove="${track.id}" class="p-2 text-muted hover:text-red-500">✕</button>
        </div>
      `;
    }).join('');
  }

  private renderControls(): void {
    const playBtn = document.getElementById('play-pause');
    const shuffleBtn = document.getElementById('shuffle');
    const repeatBtn = document.getElementById('repeat');
    
    if (playBtn) playBtn.innerHTML = this.isPlaying ? '⏸' : '▶';
    if (shuffleBtn) shuffleBtn.classList.toggle('text-primary', this.shuffle);
    if (repeatBtn) {
      repeatBtn.classList.toggle('text-primary', this.repeat !== 'none');
      repeatBtn.innerHTML = this.repeat === 'one' ? '🔂' : '🔁';
    }
  }

  private renderVolume(): void {
    const volumeSlider = document.getElementById('volume') as HTMLInputElement;
    const muteBtn = document.getElementById('mute');
    
    if (volumeSlider) volumeSlider.value = String(this.volume * 100);
    if (muteBtn) muteBtn.innerHTML = this.muted || this.volume === 0 ? '🔇' : '🔊';
  }

  private updateProgress(): void {
    const progressBar = document.getElementById('progress') as HTMLInputElement;
    if (progressBar) progressBar.value = String(this.progress);
    
    const timeDisplay = this.container.querySelector('.text-xs.text-muted');
    if (timeDisplay) {
      const times = timeDisplay.parentElement?.querySelectorAll('span');
      if (times && times.length >= 2) {
        (times[0] as HTMLElement).textContent = this.formatTime(this.audio.currentTime);
        (times[1] as HTMLElement).textContent = this.formatTime(this.audio.duration || 0);
      }
    }
  }

  private attachEvents(): void {
    document.getElementById('play-pause')?.addEventListener('click', () => this.toggle());
    document.getElementById('previous')?.addEventListener('click', () => this.previous());
    document.getElementById('next')?.addEventListener('click', () => this.next());
    document.getElementById('shuffle')?.addEventListener('click', () => this.toggleShuffle());
    document.getElementById('repeat')?.addEventListener('click', () => this.toggleRepeat());
    document.getElementById('mute')?.addEventListener('click', () => this.toggleMute());

    document.getElementById('volume')?.addEventListener('input', (e) => {
      this.setVolume(parseInt((e.target as HTMLInputElement).value) / 100);
    });

    document.getElementById('progress')?.addEventListener('input', (e) => {
      this.seekPercent(parseInt((e.target as HTMLInputElement).value));
    });

    this.container.querySelectorAll('[data-track]').forEach(el => {
      el.addEventListener('click', (e) => {
        const trackId = (e.currentTarget as HTMLElement).dataset.track!;
        this.playTrack(trackId);
      });
    });

    this.container.querySelectorAll('[data-remove]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = (e.target as HTMLElement).dataset.remove!;
        this.removeTrack(trackId);
      });
    });
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================
  destroy(): void {
    this.stop();
    this.audioContext?.close();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { MusicPlayer, Track, Playlist };
export default MusicPlayer;
