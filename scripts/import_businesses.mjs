import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

// Configuration
const BATCH_SIZE = 100;
const CSV_FILE = process.argv[2] || '/Users/jeanbosco/Downloads/businesses_rows.csv';

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY) must be set in environment.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: Custom CSV Line Parser to handle quotes
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Main Import Function
async function importBusinesses() {
    console.log(`Starting import from ${CSV_FILE}...`);

    if (!fs.existsSync(CSV_FILE)) {
        console.error(`File not found: ${CSV_FILE}`);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(CSV_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers = [];
    let batch = [];
    let totalProcessed = 0;
    let successCount = 0;
    let errorCount = 0;

    for await (const line of rl) {
        if (!headers.length) {
            // Parse headers (assuming first line is header)
            headers = parseCSVLine(line).map(h => h.trim());
            console.log('Headers detected:', headers);
            continue;
        }

        const values = parseCSVLine(line);
        if (values.length !== headers.length) {
            console.warn(`Skipping malformed line (columns: ${values.length}, headers: ${headers.length})`);
            continue;
        }

        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });

        // Map to Supabase Schema
        try {
            const business = {
                id: row.id,
                user_id: row.profile_id || null,
                name: row.name,
                description: row.description || null,
                category: row.category,
                city: row.city || null,
                address: row.address || null,
                country: row.country || null,
                phone: row.phone,
                website: row.website || null,
                email: row.email || null,
                rating: row.rating ? parseFloat(row.rating) : null,
                review_count: row.review_count ? parseInt(row.review_count) : 0,
                operating_hours: row.operating_hours || null,
                owner_whatsapp: row.owner_whatsapp || null,
                external_id: row.external_id || null,
                buy_sell_category: row.buy_sell_category || null,
                tags: row.tags ? JSON.parse(row.tags) : [], // Expecting JSON array string
                location: (row.lat && row.lng) ? `POINT(${parseFloat(row.lng)} ${parseFloat(row.lat)})` : null,
                is_active: (row.status === 'active' || row.status === 'NEW'), // Map 'NEW' to active? Or keep status column?
                // Using existing updated_at/created_at from CSV if accurate, otherwise let DB default
                created_at: row.created_at || undefined,
                updated_at: row.updated_at || undefined
            };

            batch.push(business);

            if (batch.length >= BATCH_SIZE) {
                await processBatch(batch);
                totalProcessed += batch.length;
                console.log(`Processed ${totalProcessed} records...`);
                batch = [];
            }
        } catch (e) {
            console.error('Error parsing row:', e.message, row);
            errorCount++;
        }
    }

    // Process remaining
    if (batch.length > 0) {
        await processBatch(batch);
        totalProcessed += batch.length;
    }

    console.log(`Import Complete!`);
    console.log(`Total Processed: ${totalProcessed}`);
    console.log(`Errors (Parsing): ${errorCount}`);
}

async function processBatch(batch) {
    const { error } = await supabase
        .from('businesses')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
        console.error('Supabase Upsert Error:', error);
        // Try one by one to isolate error? Or just log
        // For now throwing to fail fast or logging
        throw error;
    }
}

importBusinesses().catch(e => {
    console.error("Fatal Error:", e);
    process.exit(1);
});
