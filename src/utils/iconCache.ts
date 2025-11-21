// Icon Cache System for Unit Icons
// Stores and manages unit icons in localStorage with fallback to IndexedDB

interface CachedIcon {
  id: string;
  name: string;
  data: string; // Base64 encoded image data
  timestamp: number;
  tags?: string[];
}

const CACHE_KEY = 'mml_icon_cache';
const MAX_CACHE_SIZE = 100; // Maximum number of icons to cache
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export class IconCache {
  private cache: Map<string, CachedIcon>;
  
  constructor() {
    this.cache = new Map();
    this.loadFromStorage();
  }
  
  /**
   * Load icon cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CachedIcon[];
        const now = Date.now();
        
        // Filter out expired icons
        const valid = parsed.filter(icon => 
          now - icon.timestamp < CACHE_EXPIRY
        );
        
        // Rebuild cache
        valid.forEach(icon => {
          this.cache.set(icon.id, icon);
        });
      }
    } catch (error) {
      console.error('Failed to load icon cache:', error);
      this.cache.clear();
    }
  }
  
  /**
   * Save icon cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const icons = Array.from(this.cache.values());
      localStorage.setItem(CACHE_KEY, JSON.stringify(icons));
    } catch (error) {
      console.error('Failed to save icon cache:', error);
      // If localStorage is full, try to clean up old entries
      this.cleanupOldest();
    }
  }
  
  /**
   * Add an icon to the cache
   */
  addIcon(name: string, data: string, tags?: string[]): string {
    const id = this.generateId(name);
    const icon: CachedIcon = {
      id,
      name,
      data,
      timestamp: Date.now(),
      tags,
    };
    
    // Check cache size limit
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.cleanupOldest();
    }
    
    this.cache.set(id, icon);
    this.saveToStorage();
    
    return id;
  }
  
  /**
   * Get an icon from the cache
   */
  getIcon(id: string): CachedIcon | null {
    return this.cache.get(id) || null;
  }
  
  /**
   * Get icon by name
   */
  getIconByName(name: string): CachedIcon | null {
    const icons = Array.from(this.cache.values());
    for (const icon of icons) {
      if (icon.name === name) {
        return icon;
      }
    }
    return null;
  }
  
  /**
   * Search icons by tags
   */
  searchByTags(tags: string[]): CachedIcon[] {
    const results: CachedIcon[] = [];
    const icons = Array.from(this.cache.values());
    
    for (const icon of icons) {
      if (icon.tags && tags.some(tag => icon.tags!.includes(tag))) {
        results.push(icon);
      }
    }
    
    return results;
  }
  
  /**
   * Get all cached icons
   */
  getAllIcons(): CachedIcon[] {
    return Array.from(this.cache.values());
  }
  
  /**
   * Remove an icon from the cache
   */
  removeIcon(id: string): boolean {
    const result = this.cache.delete(id);
    if (result) {
      this.saveToStorage();
    }
    return result;
  }
  
  /**
   * Clear all cached icons
   */
  clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
  }
  
  /**
   * Clean up oldest icons when cache is full
   */
  private cleanupOldest(): void {
    if (this.cache.size === 0) return;
    
    // Sort by timestamp and remove oldest 10%
    const sorted = Array.from(this.cache.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const toRemove = Math.max(1, Math.floor(sorted.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(sorted[i].id);
    }
    
    this.saveToStorage();
  }
  
  /**
   * Generate unique ID for icon
   */
  private generateId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${sanitized}_${timestamp}_${random}`;
  }
  
  /**
   * Import icons from MegaMekLab format
   */
  importFromMML(data: any[]): number {
    let imported = 0;
    
    data.forEach(item => {
      if (item.icon && item.name) {
        this.addIcon(item.name, item.icon, item.tags);
        imported++;
      }
    });
    
    return imported;
  }
  
  /**
   * Export icons to MegaMekLab format
   */
  exportToMML(): any[] {
    return this.getAllIcons().map(icon => ({
      name: icon.name,
      icon: icon.data,
      tags: icon.tags,
    }));
  }
}

// Singleton instance
let cacheInstance: IconCache | null = null;

/**
 * Get or create icon cache instance
 */
export function getIconCache(): IconCache {
  if (!cacheInstance) {
    cacheInstance = new IconCache();
  }
  return cacheInstance;
}

// Utility functions for common operations

/**
 * Convert File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resize image to standard icon size (64x64)
 */
export async function resizeImage(
  base64: string, 
  maxWidth: number = 64, 
  maxHeight: number = 64
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert back to base64
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Validate image data
 */
export function validateImageData(base64: string): boolean {
  try {
    // Check if it's a valid data URL
    const matches = base64.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
    if (!matches) return false;
    
    // Check if base64 data is present
    const data = base64.split(',')[1];
    if (!data || data.length === 0) return false;
    
    // Try to decode base64
    atob(data);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get suggested tags for a unit
 */
export function getSuggestedTags(unitData: any): string[] {
  const tags: string[] = [];
  
  if (unitData.tech_base) tags.push(unitData.tech_base.toLowerCase());
  if (unitData.type) tags.push(unitData.type.toLowerCase());
  if (unitData.mass) {
    if (unitData.mass <= 35) tags.push('light');
    else if (unitData.mass <= 55) tags.push('medium');
    else if (unitData.mass <= 75) tags.push('heavy');
    else tags.push('assault');
  }
  if (unitData.role) tags.push(unitData.role.toLowerCase());
  
  return tags;
}
