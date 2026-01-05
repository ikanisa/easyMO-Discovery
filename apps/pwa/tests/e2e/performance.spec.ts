
/**
 * Performance E2E Tests
 * 
 * Tests performance metrics and budgets
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('page loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Budget: 3 seconds for initial load
    expect(loadTime).toBeLessThan(3000);
  });

  test('LCP is within budget', async ({ page }) => {
    await page.goto('/');
    
    // Measure LCP using Performance API
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformancePaintTiming;
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(5000), 5000);
      });
    });
    
    // Budget: LCP < 2.5s
    expect(lcp).toBeLessThan(2500);
  });

  test('CLS is within budget', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Measure CLS
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Wait for page to stabilize
        setTimeout(() => resolve(clsValue), 2000);
      });
    });
    
    // Budget: CLS < 0.1
    expect(cls).toBeLessThan(0.1);
  });

  test('bundle size is within budget', async ({ page }) => {
    const response = await page.goto('/');
    const html = await response?.text();
    
    // Check for script tags
    const scriptMatches = html?.match(/<script[^>]*src="([^"]+)"/g) || [];
    
    let totalSize = 0;
    for (const match of scriptMatches) {
      const srcMatch = match.match(/src="([^"]+)"/);
      if (srcMatch) {
        const scriptUrl = srcMatch[1];
        try {
          const scriptResponse = await page.request.get(scriptUrl);
          const size = (await scriptResponse.body()).length;
          totalSize += size;
        } catch {
          // Ignore external scripts
        }
      }
    }
    
    // Budget: Total JS < 500KB
    expect(totalSize).toBeLessThan(500 * 1024);
  });

  test('images are optimized', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check image loading
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        // Check if image has loading="lazy" for below-fold images
        const loading = await img.getAttribute('loading');
        // Not all images need lazy loading, but check if it's set when needed
        expect(typeof loading).toBe('string');
      }
    }
  });

  test('no layout shift on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Measure CLS before navigation
    const clsBefore = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 1000);
      });
    });
    
    // Navigate
    const navButton = page.locator('button').first();
    if (await navButton.isVisible()) {
      await navButton.click();
      await page.waitForTimeout(500);
    }
    
    // Measure CLS after navigation
    const clsAfter = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 1000);
      });
    });
    
    // CLS should not increase significantly
    expect(clsAfter - clsBefore).toBeLessThan(0.1);
  });
});

