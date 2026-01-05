#!/usr/bin/env node

/**
 * Check Lighthouse budgets against performance targets
 * 
 * Reads Lighthouse CI results and compares against budgets.json
 * Fails if any budget is exceeded
 */

const fs = require('fs');
const path = require('path');

const budgetsPath = path.join(__dirname, '../perf/budgets.json');
const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));

// Lighthouse CI results are typically in .lighthouseci/ directory
const resultsPath = path.join(__dirname, '../.lighthouseci');

let hasErrors = false;
const errors = [];

// Check if results directory exists
if (!fs.existsSync(resultsPath)) {
  console.warn('⚠️  Lighthouse CI results not found. Run Lighthouse CI first.');
  process.exit(0);
}

// Read Lighthouse results
const resultFiles = fs.readdirSync(resultsPath)
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(fs.readFileSync(path.join(resultsPath, file), 'utf8')));

if (resultFiles.length === 0) {
  console.warn('⚠️  No Lighthouse results found.');
  process.exit(0);
}

// Aggregate results (average across runs)
const aggregated = {
  performance: 0,
  accessibility: 0,
  'best-practices': 0,
  seo: 0,
  pwa: 0,
  metrics: {},
};

resultFiles.forEach(result => {
  if (result.categories) {
    Object.keys(result.categories).forEach(category => {
      aggregated[category] = (aggregated[category] || 0) + result.categories[category].score * 100;
    });
  }
  
  if (result.audits) {
    Object.keys(result.audits).forEach(audit => {
      const auditData = result.audits[audit];
      if (auditData.numericValue !== undefined) {
        aggregated.metrics[audit] = (aggregated.metrics[audit] || 0) + auditData.numericValue;
      }
    });
  }
});

// Average the results
const count = resultFiles.length;
Object.keys(aggregated).forEach(key => {
  if (key === 'metrics') {
    Object.keys(aggregated.metrics).forEach(metric => {
      aggregated.metrics[metric] = aggregated.metrics[metric] / count;
    });
  } else {
    aggregated[key] = aggregated[key] / count;
  }
});

// Check budgets
console.log('\n📊 Lighthouse Budget Check\n');

// Check Core Web Vitals
const cwv = budgets.budgets.coreWebVitals;
if (cwv) {
  if (cwv.LCP && aggregated.metrics['largest-contentful-paint']) {
    const lcp = aggregated.metrics['largest-contentful-paint'];
    const target = parseFloat(cwv.LCP.target.replace('<= ', '').replace('s', '')) * 1000;
    if (lcp > target) {
      errors.push(`❌ LCP: ${lcp.toFixed(0)}ms exceeds target ${target}ms`);
      hasErrors = true;
    } else {
      console.log(`✅ LCP: ${lcp.toFixed(0)}ms (target: ${target}ms)`);
    }
  }
  
  if (cwv.INP && aggregated.metrics['interaction-to-next-paint']) {
    const inp = aggregated.metrics['interaction-to-next-paint'];
    const target = parseFloat(cwv.INP.target.replace('<= ', '').replace('ms', ''));
    if (inp > target) {
      errors.push(`❌ INP: ${inp.toFixed(0)}ms exceeds target ${target}ms`);
      hasErrors = true;
    } else {
      console.log(`✅ INP: ${inp.toFixed(0)}ms (target: ${target}ms)`);
    }
  }
  
  if (cwv.CLS && aggregated.metrics['cumulative-layout-shift']) {
    const cls = aggregated.metrics['cumulative-layout-shift'];
    const target = parseFloat(cwv.CLS.target.replace('<= ', ''));
    if (cls > target) {
      errors.push(`❌ CLS: ${cls.toFixed(3)} exceeds target ${target}`);
      hasErrors = true;
    } else {
      console.log(`✅ CLS: ${cls.toFixed(3)} (target: ${target})`);
    }
  }
}

// Check bundle sizes
if (aggregated.metrics['total-byte-weight']) {
  const totalBytes = aggregated.metrics['total-byte-weight'];
  console.log(`📦 Total bundle size: ${(totalBytes / 1024).toFixed(2)}KB`);
}

// Check category scores
['performance', 'accessibility', 'best-practices', 'seo', 'pwa'].forEach(category => {
  const score = aggregated[category];
  const minScore = category === 'performance' ? 90 : 95;
  if (score < minScore) {
    errors.push(`❌ ${category}: ${score.toFixed(1)}% below minimum ${minScore}%`);
    hasErrors = true;
  } else {
    console.log(`✅ ${category}: ${score.toFixed(1)}%`);
  }
});

// Print errors
if (hasErrors) {
  console.log('\n❌ Budget violations detected:\n');
  errors.forEach(error => console.log(error));
  console.log('\n');
  process.exit(1);
} else {
  console.log('\n✅ All budgets met!\n');
  process.exit(0);
}

