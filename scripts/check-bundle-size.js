#!/usr/bin/env node
/**
 * Bundle Size Analysis Script
 * Checks build output against performance budgets
 * 
 * Usage: node scripts/check-bundle-size.js [dist-dir]
 */

const { readFileSync, statSync, readdirSync } = require('fs');
const { join, dirname } = require('path');
const { gzipSync } = require('zlib');

const scriptDir = __dirname;

const DIST_DIR = process.argv[2] || join(scriptDir, '../apps/pwa/dist');
const BUDGETS_FILE = join(scriptDir, '../perf/budgets.json');

const budgets = JSON.parse(readFileSync(BUDGETS_FILE, 'utf-8')).budgets;

function getFileSize(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

function getGzipSize(filePath) {
  try {
    const content = readFileSync(filePath);
    return gzipSync(content).length;
  } catch (e) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function findAssets(dir, extension) {
  const assets = [];
  
  function walk(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(extension)) {
        assets.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return assets;
}

function parseSize(sizeStr) {
  if (typeof sizeStr === 'string') {
    // Handle ranges like "150-200kb"
    const rangeMatch = sizeStr.match(/(\d+)-(\d+)(kb|mb|b)/i);
    if (rangeMatch) {
      const [, min, max, unit] = rangeMatch;
      const multiplier = unit.toLowerCase() === 'kb' ? 1024 : unit.toLowerCase() === 'mb' ? 1024 * 1024 : 1;
      return { min: parseInt(min) * multiplier, max: parseInt(max) * multiplier };
    }
    
    // Handle single values like "300kb"
    const match = sizeStr.match(/(\d+)(kb|mb|b)/i);
    if (match) {
      const [, value, unit] = match;
      const multiplier = unit.toLowerCase() === 'kb' ? 1024 : unit.toLowerCase() === 'mb' ? 1024 * 1024 : 1;
      return parseInt(value) * multiplier;
    }
  }
  return sizeStr;
}

function checkBudget(name, actual, budget, useGzip = true) {
  const budgetValue = typeof budget === 'object' ? budget.hardCeiling || budget.target || budget : budget;
  const parsedBudget = parseSize(budgetValue);
  const maxSize = typeof parsedBudget === 'object' ? parsedBudget.max : parsedBudget;
  
  const size = useGzip ? getGzipSize(actual) : getFileSize(actual);
  const passed = size <= maxSize;
  
  return {
    name,
    file: actual.replace(DIST_DIR, ''),
    size: size,
    sizeFormatted: formatBytes(size),
    budget: maxSize,
    budgetFormatted: formatBytes(maxSize),
    passed,
    percentage: ((size / maxSize) * 100).toFixed(1)
  };
}

console.log('📦 Bundle Size Analysis\n');
console.log(`Directory: ${DIST_DIR}\n`);

// Find initial JS bundles (typically index-*.js)
const jsFiles = findAssets(DIST_DIR, '.js')
  .filter(f => f.includes('/assets/'))
  .map(f => ({ path: f, size: getGzipSize(f) }))
  .sort((a, b) => b.size - a.size);

// Find initial CSS bundles
const cssFiles = findAssets(DIST_DIR, '.css')
  .filter(f => f.includes('/assets/'))
  .map(f => ({ path: f, size: getGzipSize(f) }))
  .sort((a, b) => b.size - a.size);

// Find font files
const fontFiles = findAssets(DIST_DIR, '.woff2')
  .concat(findAssets(DIST_DIR, '.woff'))
  .concat(findAssets(DIST_DIR, '.ttf'))
  .map(f => ({ path: f, size: getGzipSize(f) }));

// Find images
const imageFiles = findAssets(DIST_DIR, '.png')
  .concat(findAssets(DIST_DIR, '.jpg'))
  .concat(findAssets(DIST_DIR, '.webp'))
  .concat(findAssets(DIST_DIR, '.avif'))
  .map(f => ({ path: f, size: getFileSize(f) }))
  .filter(f => f.size > 0);

// Check budgets
const results = [];

// JS Initial budget
if (jsFiles.length > 0 && budgets.jsInitial) {
  const initialJS = jsFiles[0]; // Largest JS bundle
  results.push(checkBudget('Initial JS Bundle', initialJS.path, budgets.jsInitial, true));
}

// CSS Initial budget
if (cssFiles.length > 0 && budgets.cssInitial) {
  const initialCSS = cssFiles[0]; // Largest CSS bundle
  results.push(checkBudget('Initial CSS Bundle', initialCSS.path, budgets.cssInitial, true));
}

// Font budget
if (fontFiles.length > 0 && budgets.fontMax) {
  const totalFontSize = fontFiles.reduce((sum, f) => sum + f.size, 0);
  const fontBudget = parseSize(budgets.fontMax.maxSize || budgets.fontMax.target || budgets.fontMax);
  const maxFontSize = typeof fontBudget === 'object' ? fontBudget.max : fontBudget;
  results.push({
    name: 'Total Fonts',
    file: `${fontFiles.length} font files`,
    size: totalFontSize,
    sizeFormatted: formatBytes(totalFontSize),
    budget: maxFontSize,
    budgetFormatted: formatBytes(maxFontSize),
    passed: totalFontSize <= maxFontSize,
    percentage: ((totalFontSize / maxFontSize) * 100).toFixed(1)
  });
}

// Image budget
if (imageFiles.length > 0 && budgets.imageMax) {
  const largeImages = imageFiles.filter(f => f.size > parseSize(budgets.imageMax.maxSize || '500kb'));
  if (largeImages.length > 0) {
    results.push({
      name: 'Large Images',
      file: `${largeImages.length} images exceed limit`,
      size: largeImages.reduce((sum, f) => sum + f.size, 0),
      sizeFormatted: formatBytes(largeImages.reduce((sum, f) => sum + f.size, 0)),
      budget: parseSize(budgets.imageMax.maxSize || '500kb'),
      budgetFormatted: formatBytes(parseSize(budgets.imageMax.maxSize || '500kb')),
      passed: false,
      percentage: 'N/A'
    });
  }
}

// Total requests
const htmlFiles = findAssets(DIST_DIR, '.html');
const totalRequests = jsFiles.length + cssFiles.length + fontFiles.length + imageFiles.length + htmlFiles.length;
const requestBudget = budgets.totalRequests?.hardCeiling || budgets.totalRequests?.target || budgets.totalRequests;
if (requestBudget) {
  const maxRequests = typeof requestBudget === 'object' ? requestBudget.max : requestBudget;
  results.push({
    name: 'Total Requests',
    file: 'All assets',
    size: totalRequests,
    sizeFormatted: `${totalRequests} requests`,
    budget: maxRequests,
    budgetFormatted: `${maxRequests} requests`,
    passed: totalRequests <= maxRequests,
    percentage: ((totalRequests / maxRequests) * 100).toFixed(1)
  });
}

// Display results
console.log('📊 Budget Results:\n');
let allPassed = true;

results.forEach(result => {
  const status = result.passed ? '✅' : '❌';
  const color = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  
  console.log(`${status} ${result.name}`);
  console.log(`   File: ${result.file}`);
  console.log(`   Size: ${color}${result.sizeFormatted}${reset} / ${result.budgetFormatted} (${result.percentage}%)`);
  console.log('');
  
  if (!result.passed) allPassed = false;
});

// Summary
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ All performance budgets met!');
  process.exit(0);
} else {
  console.log('❌ Some performance budgets exceeded!');
  console.log('\nRecommended actions:');
  console.log('- Optimize JavaScript bundles (code splitting, tree shaking)');
  console.log('- Optimize images (AVIF/WebP, responsive srcset)');
  console.log('- Reduce font usage (single family, subset)');
  console.log('- Minimize total requests (combine assets where possible)');
  process.exit(1);
}

