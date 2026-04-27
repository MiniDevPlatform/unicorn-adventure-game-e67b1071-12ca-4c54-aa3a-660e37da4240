/**
 * MiniDev ONE Template - Game Components
 * 
 * Game-specific components: SpriteRenderer, ParticleSystem, Effects, UI overlays.
 */

import { FEATURES } from '@/lib/config';

// =============================================================================
// SPRITE RENDERER
// =============================================================================
class SpriteRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprites: Map<string, HTMLImageElement> = new Map();
  private spriteSheets: Map<string, ImageSpriteSheet> = new Map();
  private animations: Map<string, SpriteAnimation> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  loadSprite(id: string, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites.set(id, img);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  loadSpriteSheet(id: string, src: string, frameWidth: number, frameHeight: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.spriteSheets.set(id, { image: img, frameWidth, frameHeight });
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  addAnimation(id: string, options: {
    sheet: string;
    startFrame: number;
    endFrame: number;
    speed: number;
    loop?: boolean;
  }): void {
    this.animations.set(id, {
      id,
      sheet: options.sheet,
      startFrame: options.startFrame,
      endFrame: options.endFrame,
      speed: options.speed,
      loop: options.loop ?? true,
      currentFrame: options.startFrame,
      frameTime: 0,
      playing: false,
    });
  }

  playAnimation(id: string): void {
    const anim = this.animations.get(id);
    if (anim) anim.playing = true;
  }

  stopAnimation(id: string): void {
    const anim = this.animations.get(id);
    if (anim) anim.playing = false;
  }

  drawSprite(id: string, x: number, y: number, width?: number, height?: number, options?: {
    flipX?: boolean;
    flipY?: boolean;
    rotation?: number;
    opacity?: number;
  }): void {
    const sprite = this.sprites.get(id);
    if (!sprite) return;

    const w = width || sprite.width;
    const h = height || sprite.height;

    this.ctx.save();
    
    if (options?.flipX || options?.flipY || options?.rotation) {
      this.ctx.translate(x + w / 2, y + h / 2);
      if (options.flipX) this.ctx.scale(-1, 1);
      if (options.flipY) this.ctx.scale(1, -1);
      if (options?.rotation) this.ctx.rotate(options.rotation);
      this.ctx.translate(-w / 2, -h / 2);
      x = 0;
      y = 0;
    }

    if (options?.opacity !== undefined) {
      this.ctx.globalAlpha = options.opacity;
    }

    this.ctx.drawImage(sprite, x, y, w, h);
    this.ctx.restore();
  }

  drawAnimationFrame(id: string, x: number, y: number, width?: number, height?: number): void {
    const anim = this.animations.get(id);
    const sheet = anim ? this.spriteSheets.get(anim.sheet) : null;
    
    if (!anim || !sheet) return;

    const frameX = (anim.currentFrame % (sheet.image.width / sheet.frameWidth)) * sheet.frameWidth;
    const frameY = Math.floor(anim.currentFrame / (sheet.image.width / sheet.frameWidth)) * sheet.frameHeight;

    const w = width || sheet.frameWidth;
    const h = height || sheet.frameHeight;

    this.ctx.drawImage(
      sheet.image,
      frameX, frameY,
      sheet.frameWidth, sheet.frameHeight,
      x, y,
      w, h
    );

    // Update frame
    if (anim.playing) {
      anim.frameTime += 16; // ~60fps
      if (anim.frameTime >= anim.speed * 100) {
        anim.frameTime = 0;
        anim.currentFrame++;
        
        if (anim.currentFrame > anim.endFrame) {
          if (anim.loop) {
            anim.currentFrame = anim.startFrame;
          } else {
            anim.currentFrame = anim.endFrame;
            anim.playing = false;
          }
        }
      }
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

interface ImageSpriteSheet {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
}

interface SpriteAnimation {
  id: string;
  sheet: string;
  startFrame: number;
  endFrame: number;
  speed: number;
  loop: boolean;
  currentFrame: number;
  frameTime: number;
  playing: boolean;
}

// =============================================================================
// EFFECTS SYSTEM
// =============================================================================
class EffectsSystem {
  private ctx: CanvasRenderingContext2D;
  private effects: GameEffect[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // Screen shake
  shake(intensity: number, duration: number): void {
    const effect: ScreenShakeEffect = {
      type: 'screenShake',
      intensity,
      duration,
      elapsed: 0,
      active: true,
    };
    this.effects.push(effect);
  }

  // Flash effect
  flash(color: string, duration: number): void {
    const effect: FlashEffect = {
      type: 'flash',
      color,
      duration,
      elapsed: 0,
      active: true,
    };
    this.effects.push(effect);
  }

  // Slow motion
  slowMotion(factor: number, duration: number): void {
    const effect: SlowMotionEffect = {
      type: 'slowMotion',
      factor,
      duration,
      elapsed: 0,
      active: true,
    };
    this.effects.push(effect);
  }

  // Vignette
  vignette(intensity: number = 0.5): void {
    const gradient = this.ctx.createRadialGradient(
      this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, 0,
      this.ctx.canvas.width / 2, this.ctx.canvas.height / 2, this.ctx.canvas.width / 2
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  // Chromatic aberration
  chromaticAberration(intensity: number = 3): void {
    // Simplified - real implementation would need pixel manipulation
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.globalAlpha = 0.1;
    this.ctx.drawImage(this.ctx.canvas, -intensity, 0);
    this.ctx.drawImage(this.ctx.canvas, intensity, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
  }

  // CRT scanlines
  scanlines(intensity: number = 0.1): void {
    this.ctx.fillStyle = `rgba(0,0,0,${intensity})`;
    for (let y = 0; y < this.ctx.canvas.height; y += 4) {
      this.ctx.fillRect(0, y, this.ctx.canvas.width, 2);
    }
  }

  // Update effects
  update(dt: number): void {
    this.effects = this.effects.filter(effect => {
      if (!effect.active) return false;
      
      effect.elapsed += dt * 1000;
      
      if (effect.type === 'screenShake' && effect.elapsed < effect.duration) {
        const progress = effect.elapsed / effect.duration;
        const intensity = (effect as ScreenShakeEffect).intensity * (1 - progress);
        const offsetX = (Math.random() - 0.5) * intensity * 2;
        const offsetY = (Math.random() - 0.5) * intensity * 2;
        this.ctx.translate(offsetX, offsetY);
      }
      
      if (effect.elapsed >= effect.duration) {
        effect.active = false;
        return false;
      }
      
      return true;
    });
  }

  // Render effects
  render(): void {
    for (const effect of this.effects) {
      if (effect.type === 'flash') {
        const flash = effect as FlashEffect;
        const progress = flash.elapsed / flash.duration;
        const alpha = 1 - progress;
        this.ctx.fillStyle = flash.color;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.globalAlpha = 1;
      }
    }
  }

  clear(): void {
    this.effects = [];
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

interface GameEffect {
  type: string;
  duration: number;
  elapsed: number;
  active: boolean;
}

interface ScreenShakeEffect extends GameEffect {
  type: 'screenShake';
  intensity: number;
}

interface FlashEffect extends GameEffect {
  type: 'flash';
  color: string;
}

interface SlowMotionEffect extends GameEffect {
  type: 'slowMotion';
  factor: number;
}

// =============================================================================
// PARTICLE SYSTEM (Enhanced)
// =============================================================================
interface ParticleConfig {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  size?: number;
  color?: string;
  life?: number;
  gravity?: number;
  friction?: number;
  fadeOut?: boolean;
  shrink?: boolean;
  rotation?: number;
  rotationSpeed?: number;
  shape?: 'circle' | 'square' | 'star' | 'triangle';
  blendMode?: GlobalCompositeOperation;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startSize: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  friction: number;
  fadeOut: boolean;
  shrink: boolean;
  rotation: number;
  rotationSpeed: number;
  shape: ParticleConfig['shape'];
  blendMode: GlobalCompositeOperation;
  active: boolean;
}

class ParticleSystem2D {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private maxParticles: number = 1000;
  private poolEnabled: boolean = true;
  private particlePool: Particle[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // Pre-allocate particle pool
  initPool(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particlePool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      size: 0, startSize: 0, color: '#fff',
      life: 0, maxLife: 0, gravity: 0, friction: 1,
      fadeOut: false, shrink: false, rotation: 0, rotationSpeed: 0,
      shape: 'circle', blendMode: 'source-over', active: false
    };
  }

  emit(config: ParticleConfig | ParticleConfig[]): void {
    const configs = Array.isArray(config) ? config : [config];
    
    for (const c of configs) {
      if (this.particles.length >= this.maxParticles) {
        // Recycle oldest particle
        this.particles.shift();
      }

      const particle = this.particlePool.pop() || this.createEmptyParticle();
      
      particle.x = c.x;
      particle.y = c.y;
      particle.vx = c.vx || (Math.random() - 0.5) * 10;
      particle.vy = c.vy || (Math.random() - 0.5) * 10;
      particle.size = c.size || 5;
      particle.startSize = c.size || 5;
      particle.color = c.color || '#ffffff';
      particle.life = c.life || 1;
      particle.maxLife = c.life || 1;
      particle.gravity = c.gravity || 0;
      particle.friction = c.friction || 1;
      particle.fadeOut = c.fadeOut ?? true;
      particle.shrink = c.shrink ?? true;
      particle.rotation = c.rotation || 0;
      particle.rotationSpeed = c.rotationSpeed || 0;
      particle.shape = c.shape || 'circle';
      particle.blendMode = c.blendMode || 'source-over';
      particle.active = true;

      this.particles.push(particle);
    }
  }

  // Preset effects
  emitExplosion(x: number, y: number, count: number = 30, colors?: string[]): void {
    const palette = colors || ['#ff6b6b', '#feca57', '#ff9f43', '#ee5a24'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: palette[Math.floor(Math.random() * palette.length)],
        life: 0.5 + Math.random() * 0.5,
        gravity: 0.1,
        friction: 0.98,
      });
    }
  }

  emitTrail(x: number, y: number, count: number = 5, color: string = '#ffffff'): void {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 2 + Math.random() * 3,
        color,
        life: 0.2 + Math.random() * 0.3,
        gravity: 0,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  emitSparks(x: number, y: number, count: number = 20, upward: boolean = true): void {
    for (let i = 0; i < count; i++) {
      const angle = upward 
        ? -Math.PI / 2 + (Math.random() - 0.5) * 0.5
        : Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color: '#ffff88',
        life: 0.3 + Math.random() * 0.3,
        gravity: 0.15,
        fadeOut: true,
        shrink: true,
      });
    }
  }

  emitConfetti(x: number, y: number, count: number = 50): void {
    const colors = ['#ff6b6b', '#48dbfb', '#feca57', '#1dd1a1', '#ff9ff3', '#54a0ff'];
    
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1;
      const speed = 5 + Math.random() * 10;
      
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 2 + Math.random() * 2,
        gravity: 0.08,
        friction: 0.99,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
  }

  emitSmoke(x: number, y: number, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 1,
        vy: -1 - Math.random() * 2,
        size: 10 + Math.random() * 20,
        color: '#888888',
        life: 1 + Math.random() * 1,
        gravity: -0.02,
        friction: 0.99,
        fadeOut: true,
        shrink: false,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      if (!p.active || p.life <= 0) {
        this.particlePool.push(this.particles.splice(i, 1)[0]);
        continue;
      }

      // Physics
      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      
      // Life
      p.life -= dt;
      
      // Rotation
      p.rotation += p.rotationSpeed;
    }
  }

  render(): void {
    for (const p of this.particles) {
      if (!p.active) continue;

      const alpha = p.fadeOut ? p.life / p.maxLife : 1;
      const size = p.shrink ? p.startSize * (p.life / p.maxLife) : p.startSize;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.globalCompositeOperation = p.blendMode;
      this.ctx.fillStyle = p.color;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      switch (p.shape) {
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
          
        case 'square':
          this.ctx.fillRect(-size / 2, -size / 2, size, size);
          break;
          
        case 'star':
          this.drawStar(0, 0, 5, size, size / 2);
          break;
          
        case 'triangle':
          this.ctx.beginPath();
          this.ctx.moveTo(0, -size);
          this.ctx.lineTo(-size, size);
          this.ctx.lineTo(size, size);
          this.ctx.closePath();
          this.ctx.fill();
          break;
      }

      this.ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }

    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  clear(): void {
    this.particlePool.push(...this.particles);
    this.particles = [];
  }

  get count(): number {
    return this.particles.length;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { SpriteRenderer, EffectsSystem, ParticleSystem2D };
export type { ParticleConfig };
export default { SpriteRenderer, EffectsSystem, ParticleSystem2D };
