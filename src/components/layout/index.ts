/**
 * MiniDev ONE Template - Website Layouts
 * 
 * Pre-built layouts for websites.
 * Configure via FEATURES.website in config.ts
 */

import { FEATURES } from '@/lib/config';

// Import additional layouts
import { ForumEngine } from './forum';
import { GalleryEngine } from './gallery';

// =============================================================================
// WEBSITE RENDERER
// =============================================================================
class WebsiteRenderer {
  private container: HTMLElement;
  
  constructor(selector: string) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.render();
  }
  
  private render(): void {
    const websiteType = FEATURES.website.type;
    
    switch (websiteType) {
      case 'portfolio':
        this.renderPortfolio();
        break;
      case 'blog':
        this.renderBlog();
        break;
      case 'business':
        this.renderBusiness();
        break;
      case 'landing':
        this.renderLanding();
        break;
      case 'store':
        this.renderStore();
        break;
      case 'wiki':
        this.renderWiki();
        break;
      case 'forum':
        this.renderForum();
        break;
      default:
        this.renderLanding();
    }
  }
  
  // =============================================================================
  // PORTFOLIO LAYOUT
  // =============================================================================
  private renderPortfolio(): void {
    const { colors } = FEATURES.theme;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches();
    const c = isDark ? colors.dark : colors.light;
    
    this.container.innerHTML = `
      <!-- Hero Section -->
      <section class="min-h-[80vh] flex items-center justify-center text-center px-6" style="background: linear-gradient(135deg, ${c.primary}15, ${c.secondary}15)">
        <div class="max-w-2xl">
          <div class="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-6xl">
            👤
          </div>
          <h1 class="text-5xl font-bold mb-4">${FEATURES.type.mode === 'website' ? FEATURES.pwa.name : 'Your Name'}</h1>
          <p class="text-xl text-muted mb-8">Creative Developer & Designer</p>
          <div class="flex gap-4 justify-center">
            <a href="#projects" class="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90">View Projects</a>
            <a href="#contact" class="px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted">Contact</a>
          </div>
        </div>
      </section>
      
      <!-- Projects Section -->
      <section id="projects" class="py-20 px-6">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Featured Projects</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="project-grid">
            <!-- Projects loaded dynamically -->
          </div>
        </div>
      </section>
      
      <!-- Skills Section -->
      <section class="py-20 px-6 bg-muted">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Skills</h2>
          <div class="flex flex-wrap gap-3 justify-center">
            ${['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'CSS', 'HTML', 'Git', 'Figma'].map(skill => `
              <span class="px-4 py-2 bg-card rounded-full border border-border">${skill}</span>
            `).join('')}
          </div>
        </div>
      </section>
      
      <!-- Contact Section -->
      <section id="contact" class="py-20 px-6">
        <div class="max-w-xl mx-auto text-center">
          <h2 class="text-3xl font-bold mb-4">Get In Touch</h2>
          <p class="text-muted mb-8">Have a project in mind? Let's talk!</p>
          <form class="space-y-4 text-left" onsubmit="event.preventDefault(); alert('Message sent!');">
            <input type="text" placeholder="Your Name" class="w-full px-4 py-3 rounded-lg border border-border bg-background">
            <input type="email" placeholder="Your Email" class="w-full px-4 py-3 rounded-lg border border-border bg-background">
            <textarea placeholder="Message" rows="4" class="w-full px-4 py-3 rounded-lg border border-border bg-background"></textarea>
            <button type="submit" class="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium">Send Message</button>
          </form>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="py-20 px-6">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Testimonials</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${[
              { name: "Alex R.", role: "Developer", text: "Amazing platform!" },
              { name: "Maria S.", role: "Designer", text: "Exactly what I needed." }
            ].map(t => `<div class="p-6 bg-card rounded-xl border"><p class="text-muted">"${t.text}"</p><div class="font-medium">${t.name}</div></div>`).join("")}
          </div>
        </div>
      </section>

    `;
  }
  
  // =============================================================================
  // BLOG LAYOUT
  // =============================================================================
  private renderBlog(): void {
    const { colors } = FEATURES.theme;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches();
    const c = isDark ? colors.dark : colors.light;
    
    this.container.innerHTML = `
      <!-- Header -->
      <header class="border-b border-border">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" class="text-xl font-bold" style="color: ${c.primary}">${FEATURES.pwa.name}</a>
          <nav class="flex gap-6">
            <a href="/" class="hover:text-primary">Home</a>
            <a href="/blog" class="hover:text-primary">Blog</a>
            <a href="/about" class="hover:text-primary">About</a>
          </nav>
        </div>
      </header>
      
      <!-- Hero -->
      <section class="py-16 px-6 text-center" style="background: linear-gradient(135deg, ${c.primary}10, ${c.secondary}10)">
        <h1 class="text-4xl font-bold mb-4">${FEATURES.pwa.name}</h1>
        <p class="text-xl text-muted max-w-xl mx-auto">Thoughts on development, design, and technology.</p>
      </section>
      
      <!-- Posts -->
      <section class="py-12 px-6">
        <div class="max-w-4xl mx-auto">
          <div id="blog-posts" class="space-y-8">
            <!-- Blog posts loaded dynamically -->
            ${this.renderBlogPost({ title: 'Getting Started with MiniDev', excerpt: 'Learn how to create your first project...', date: '2024-01-15', category: 'Tutorial' })}
            ${this.renderBlogPost({ title: 'Building Games with AI', excerpt: 'How AI can help you build better games...', date: '2024-01-10', category: 'AI' })}
            ${this.renderBlogPost({ title: 'Best Practices for Game Design', excerpt: 'Tips and tricks for creating engaging games...', date: '2024-01-05', category: 'Design' })}
          </div>
        </div>
      </section>
      
      <!-- Footer -->
      <footer class="border-t border-border py-8 px-6 text-center text-muted">
        <p>&copy; 2024 ${FEATURES.pwa.name}. Built with MiniDev Platform.</p>
      </footer>
    `;
  }
  
  private renderBlogPost(post: { title: string; excerpt: string; date: string; category: string }): string {
    return `
      <article class="p-6 bg-card rounded-xl border border-border hover:border-primary transition-colors">
        <div class="flex items-center gap-2 text-sm text-muted mb-2">
          <span>${post.category}</span>
          <span>•</span>
          <span>${post.date}</span>
        </div>
        <h2 class="text-xl font-bold mb-2">${post.title}</h2>
        <p class="text-muted mb-4">${post.excerpt}</p>
        <a href="#" class="text-primary font-medium hover:underline">Read more →</a>
      </article>
    `;
  }
  
  // =============================================================================
  // BUSINESS LAYOUT
  // =============================================================================
  private renderBusiness(): void {
    const { colors } = FEATURES.theme;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches();
    const c = isDark ? colors.dark : colors.light;
    
    this.container.innerHTML = `
      <!-- Header -->
      <header class="border-b border-border sticky top-0 bg-background/80 backdrop-blur">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              ${FEATURES.pwa.name.charAt(0)}
            </div>
            <span class="text-xl font-bold">${FEATURES.pwa.name}</span>
          </div>
          <nav class="hidden md:flex gap-6">
            <a href="#services" class="hover:text-primary">Services</a>
            <a href="#about" class="hover:text-primary">About</a>
            <a href="#pricing" class="hover:text-primary">Pricing</a>
            <a href="#contact" class="hover:text-primary">Contact</a>
          </nav>
          <button class="px-4 py-2 bg-primary text-white rounded-lg">Get Started</button>
        </div>
      </header>
      
      <!-- Hero -->
      <section class="py-24 px-6 text-center" style="background: linear-gradient(180deg, ${c.primary}10, transparent)">
        <h1 class="text-5xl font-bold mb-6">${FEATURES.pwa.name}</h1>
        <p class="text-xl text-muted max-w-2xl mx-auto mb-8">
          Professional solutions for your business needs. We deliver excellence.
        </p>
        <div class="flex gap-4 justify-center">
          <a href="#contact" class="px-8 py-4 bg-primary text-white rounded-lg font-medium text-lg">Get Started</a>
          <a href="#services" class="px-8 py-4 border border-border rounded-lg font-medium text-lg">Learn More</a>
        </div>
      </section>
      
      <!-- Services -->
      <section id="services" class="py-20 px-6">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Our Services</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            ${['Web Development', 'App Design', 'Consulting'].map((service, i) => `
              <div class="p-8 bg-card rounded-xl border border-border text-center">
                <div class="text-4xl mb-4">${['🌐', '📱', '💡'][i]}</div>
                <h3 class="text-xl font-bold mb-2">${service}</h3>
                <p class="text-muted">Professional ${service.toLowerCase()} services tailored to your needs.</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
      
      <!-- Contact -->
      <section id="contact" class="py-20 px-6 bg-muted">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p class="text-muted mb-8">Contact us today and let's discuss your project.</p>
          <div class="bg-card rounded-xl p-8 border border-border">
            <form class="grid grid-cols-1 md:grid-cols-2 gap-4" onsubmit="event.preventDefault(); alert('Thanks! We will contact you soon.');">
              <input type="text" placeholder="Name" class="px-4 py-3 rounded-lg border border-border bg-background" required>
              <input type="email" placeholder="Email" class="px-4 py-3 rounded-lg border border-border bg-background" required>
              <input type="text" placeholder="Company" class="px-4 py-3 rounded-lg border border-border bg-background">
              <input type="text" placeholder="Phone" class="px-4 py-3 rounded-lg border border-border bg-background">
              <textarea placeholder="Tell us about your project" rows="4" class="md:col-span-2 px-4 py-3 rounded-lg border border-border bg-background" required></textarea>
              <button type="submit" class="md:col-span-2 px-8 py-4 bg-primary text-white rounded-lg font-medium text-lg">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="py-20 px-6">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Testimonials</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${[
              { name: "Alex R.", role: "Developer", text: "Amazing platform!" },
              { name: "Maria S.", role: "Designer", text: "Exactly what I needed." }
            ].map(t => `<div class="p-6 bg-card rounded-xl border"><p class="text-muted">"${t.text}"</p><div class="font-medium">${t.name}</div></div>`).join("")}
          </div>
        </div>
      </section>

      
      <!-- Footer -->
      <footer class="border-t border-border py-8 px-6">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
              ${FEATURES.pwa.name.charAt(0)}
            </div>
            <span class="font-bold">${FEATURES.pwa.name}</span>
          </div>
          <p class="text-muted text-sm">&copy; 2024 ${FEATURES.pwa.name}. All rights reserved.</p>
          <div class="flex gap-4">
            <a href="#" class="text-muted hover:text-primary">Privacy</a>
            <a href="#" class="text-muted hover:text-primary">Terms</a>
          </div>
        </div>
      </footer>
    `;
  }
  
  // =============================================================================
  // LANDING PAGE LAYOUT
  // =============================================================================
  private renderLanding(): void {
    const { colors } = FEATURES.theme;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches();
    const c = isDark ? colors.dark : colors.light;
    
    this.container.innerHTML = `
      <!-- Hero -->
      <section class="min-h-screen flex items-center justify-center text-center px-6" style="background: linear-gradient(135deg, ${c.primary}, ${c.secondary})">
        <div class="max-w-3xl text-white">
          <h1 class="text-5xl md:text-7xl font-bold mb-6">${FEATURES.pwa.name}</h1>
          <p class="text-xl md:text-2xl opacity-90 mb-10">${FEATURES.pwa.shortName || 'The best solution for your needs'}</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#" class="px-8 py-4 bg-white text-gray-900 rounded-lg font-bold text-lg hover:bg-gray-100">Get Started Free</a>
            <a href="#" class="px-8 py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10">Learn More</a>
          </div>
        </div>
      </section>
      
      <!-- Features -->
      <section class="py-20 px-6">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            ${['Fast & Easy', 'AI Powered', 'Always Free'].map((feature, i) => `
              <div class="text-center p-6">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl text-white">
                  ${['⚡', '🤖', '💚'][i]}
                </div>
                <h3 class="text-xl font-bold mb-2">${feature}</h3>
                <p class="text-muted">Experience the best with our ${feature.toLowerCase()} solution.</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
      
      <!-- CTA -->
      <section class="py-20 px-6 text-center" style="background: linear-gradient(135deg, ${c.primary}15, ${c.secondary}15)">
        <h2 class="text-3xl font-bold mb-4">Ready to Start?</h2>
        <p class="text-muted mb-8">Join thousands of users who trust us.</p>
        <a href="#" class="inline-block px-8 py-4 bg-primary text-white rounded-lg font-bold text-lg">Get Started Now</a>
      </section>
    `;
  }
  
  // =============================================================================
  // STORE LAYOUT
  // =============================================================================
  private renderStore(): void {
    this.renderBusiness(); // Start with business layout as base
  }
  
  // =============================================================================
  // WIKI LAYOUT
  // =============================================================================
  private renderWiki(): void {
    const { colors } = FEATURES.theme;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches();
    const c = isDark ? colors.dark : colors.light;
    
    this.container.innerHTML = `
      <!-- Wiki Header -->
      <header class="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">📖</span>
            <span class="text-xl font-bold">${FEATURES.pwa.name} Wiki</span>
          </div>
          <div class="flex items-center gap-4">
            <input type="search" placeholder="Search..." class="px-4 py-2 rounded-lg border border-border bg-muted w-64">
            <button class="px-4 py-2 bg-primary text-white rounded-lg">+ New Article</button>
          </div>
        </div>
      </header>
      
      <!-- Wiki Content -->
      <div id="wiki-content" class="max-w-6xl mx-auto p-6">
        <!-- Wiki loaded via WikiRenderer -->
        <div class="text-center py-20">
          <p class="text-6xl mb-4">📖</p>
          <h2 class="text-2xl font-bold mb-2">Knowledge Base</h2>
          <p class="text-muted">Browse categories or search for articles</p>
        </div>
      </div>
    `;
  }
  
  // =============================================================================
  // FORUM LAYOUT
  // =============================================================================
  private renderForum(): void {
    const { colors } = FEATURES.theme;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches();
    const c = isDark ? colors.dark : colors.light;
    
    this.container.innerHTML = `
      <!-- Forum Header -->
      <header class="border-b border-border bg-background">
        <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">💬</span>
            <span class="text-xl font-bold">${FEATURES.pwa.name} Forum</span>
          </div>
          <div class="flex items-center gap-4">
            <button class="px-4 py-2 bg-primary text-white rounded-lg">New Thread</button>
            <button class="px-4 py-2 border border-border rounded-lg">Sign In</button>
          </div>
        </div>
      </header>
      
      <!-- Forum Content -->
      <div id="forum-content" class="max-w-6xl mx-auto p-6">
        <!-- Forum loaded via ForumEngine -->
        <div class="text-center py-20">
          <p class="text-6xl mb-4">💬</p>
          <h2 class="text-2xl font-bold mb-2">Community Forum</h2>
          <p class="text-muted">Join the discussion</p>
        </div>
      </div>
    `;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { WebsiteRenderer };
export default { WebsiteRenderer };
