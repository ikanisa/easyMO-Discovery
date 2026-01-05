#!/usr/bin/env node
/**
 * verify-public-env.mjs
 * 
 * Build-time validation script for required public environment variables.
 * Fails the build (exit code 1) if required vars are missing, ensuring
 * we never deploy a broken app to production.
 * 
 * Usage: node scripts/verify-public-env.mjs
 */

const REQUIRED_VARS = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
];

// Simple .env parser since we might not have dotenv available in this context
import fs from 'fs';
import path from 'path';

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        console.log(`📄 Loading environment from ${envPath}`);
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}


function main() {
    loadEnv();
    console.log('\n🔍 Verifying required public environment variables...\n');

    const results = REQUIRED_VARS.map((varName) => {
        const value = process.env[varName];
        const isSet = Boolean(value && value.trim().length > 0);
        return { varName, isSet };
    });

    // Print status for each variable
    results.forEach(({ varName, isSet }) => {
        const status = isSet ? '✓ SET' : '✗ MISSING';
        const icon = isSet ? '🟢' : '🔴';
        console.log(`  ${icon} ${varName}=${status}`);
    });

    const missing = results.filter((r) => !r.isSet);

    if (missing.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.error('\n❌ BUILD FAILED: Missing required environment variables\n');
        console.log('The following variables must be set before building:\n');
        missing.forEach(({ varName }) => {
            console.log(`  • ${varName}`);
        });
        console.log('\n📋 How to fix:\n');
        console.log('  1. For local development:');
        console.log('     Create a .env file in apps/pwa/ with:');
        missing.forEach(({ varName }) => {
            console.log(`       ${varName}=your_value_here`);
        });
        console.log('\n  2. For Cloudflare Pages:');
        console.log('     Go to your project → Settings → Environment Variables');
        console.log('     Add each missing variable for Production environment');
        console.log('\n  3. For CI/CD:');
        console.log('     Set these as secrets/environment variables in your pipeline');
        console.log('\n' + '='.repeat(60) + '\n');
        process.exit(1);
    }

    console.log('\n✅ All required environment variables are set!\n');
    process.exit(0);
}

main();
