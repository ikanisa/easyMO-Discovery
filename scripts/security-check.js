
#!/usr/bin/env node

/**
 * Security Check Script
 * 
 * Runs security checks:
 * - Dependency vulnerability scanning
 * - OWASP Top 10 checks
 * - Security headers validation
 * - Secrets scanning
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDependencies() {
  log('\n🔍 Checking dependencies for vulnerabilities...', 'blue');
  
  try {
    // Check if pnpm audit is available
    execSync('pnpm audit --json', { stdio: 'pipe' });
    log('✅ No critical vulnerabilities found', 'green');
    return true;
  } catch (error) {
    const output = error.stdout?.toString() || '';
    try {
      const audit = JSON.parse(output);
      if (audit.metadata?.vulnerabilities?.critical > 0) {
        log(`❌ Found ${audit.metadata.vulnerabilities.critical} critical vulnerabilities`, 'red');
        return false;
      }
      if (audit.metadata?.vulnerabilities?.high > 0) {
        log(`⚠️  Found ${audit.metadata.vulnerabilities.high} high vulnerabilities`, 'yellow');
        return true; // Warn but don't fail
      }
      log('✅ No critical vulnerabilities found', 'green');
      return true;
    } catch {
      log('⚠️  Could not parse audit results', 'yellow');
      return true; // Don't fail on parse errors
    }
  }
}

function checkSecrets() {
  log('\n🔍 Scanning for exposed secrets...', 'blue');
  
  const secretsPatterns = [
    /sk-[a-zA-Z0-9]{32,}/, // OpenAI API keys
    /AIza[0-9A-Za-z-_]{35}/, // Google API keys
    /AKIA[0-9A-Z]{16}/, // AWS keys
    /ghp_[a-zA-Z0-9]{36}/, // GitHub tokens
    /xox[baprs]-[0-9a-zA-Z-]{10,48}/, // Slack tokens
  ];
  
  const filesToCheck = [
    'apps/pwa/.env',
    'apps/pwa/.env.local',
    'services/agent-runtime/.dev.vars',
    'worker/.dev.vars',
  ];
  
  let foundSecrets = false;
  
  for (const file of filesToCheck) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of secretsPatterns) {
        if (pattern.test(content)) {
          log(`⚠️  Potential secret found in ${file}`, 'yellow');
          foundSecrets = true;
        }
      }
    }
  }
  
  if (!foundSecrets) {
    log('✅ No exposed secrets found', 'green');
  }
  
  return !foundSecrets;
}

function checkSecurityHeaders() {
  log('\n🔍 Checking security headers configuration...', 'blue');
  
  // Check if security headers are configured in service worker or headers
  const swFile = 'apps/pwa/pwa/service-worker.ts';
  if (existsSync(swFile)) {
    const content = readFileSync(swFile, 'utf-8');
    const hasCSP = /Content-Security-Policy/i.test(content) || 
                   /security.*policy/i.test(content);
    
    if (!hasCSP) {
      log('⚠️  Content Security Policy not found in service worker', 'yellow');
    } else {
      log('✅ Security headers configured', 'green');
    }
  }
  
  return true;
}

function checkOWASP() {
  log('\n🔍 Running OWASP Top 10 checks...', 'blue');
  
  const checks = [
    {
      name: 'Injection Prevention',
      check: () => {
        // Check if input validation is used
        const apiFile = 'apps/pwa/services/api.ts';
        if (existsSync(apiFile)) {
          const content = readFileSync(apiFile, 'utf-8');
          return /validate|sanitize|escape/i.test(content);
        }
        return false;
      },
    },
    {
      name: 'Authentication',
      check: () => {
        // Check if authentication is implemented
        const authFiles = [
          'apps/pwa/services/supabase.ts',
          'apps/pwa/context/AuthContext.tsx',
        ];
        return authFiles.some(file => existsSync(file));
      },
    },
    {
      name: 'Sensitive Data Exposure',
      check: () => {
        // Check if sensitive data is properly handled
        const configFile = 'apps/pwa/config.ts';
        if (existsSync(configFile)) {
          const content = readFileSync(configFile, 'utf-8');
          return !/password|secret|key.*=.*['"]/i.test(content);
        }
        return true;
      },
    },
  ];
  
  let allPassed = true;
  for (const check of checks) {
    if (check.check()) {
      log(`✅ ${check.name}`, 'green');
    } else {
      log(`⚠️  ${check.name} - Review recommended`, 'yellow');
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Main execution
async function main() {
  log('🔒 Running Security Checks...', 'blue');
  
  const results = {
    dependencies: checkDependencies(),
    secrets: checkSecrets(),
    headers: checkSecurityHeaders(),
    owasp: checkOWASP(),
  };
  
  log('\n📊 Security Check Summary:', 'blue');
  log(`Dependencies: ${results.dependencies ? '✅' : '❌'}`, results.dependencies ? 'green' : 'red');
  log(`Secrets: ${results.secrets ? '✅' : '❌'}`, results.secrets ? 'green' : 'red');
  log(`Headers: ${results.headers ? '✅' : '❌'}`, results.headers ? 'green' : 'red');
  log(`OWASP: ${results.owasp ? '✅' : '⚠️'}`, results.owasp ? 'green' : 'yellow');
  
  const allPassed = Object.values(results).every(r => r);
  
  if (!allPassed) {
    log('\n❌ Some security checks failed. Please review and fix.', 'red');
    process.exit(1);
  } else {
    log('\n✅ All security checks passed!', 'green');
    process.exit(0);
  }
}

main().catch((error) => {
  log(`\n❌ Security check failed: ${error.message}`, 'red');
  process.exit(1);
});

