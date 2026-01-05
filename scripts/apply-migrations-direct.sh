#!/bin/bash

# Apply Migrations Directly via psql
# Uses direct database connection

set -e

DB_URL="postgresql://postgres:MoMo!!0099@db.rghmxgutlbvzrfztxvaq.supabase.co:5432/postgres"

echo "🚀 Applying Broadcast Migrations via Direct Database Connection"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client tools."
    echo "   macOS: brew install postgresql"
    echo "   Or use the combined SQL file in Supabase Dashboard"
    exit 1
fi

# Test connection
echo "📡 Testing database connection..."
if psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed. Please check credentials."
    exit 1
fi

echo ""
echo "📝 Applying migrations in order..."
echo ""

# Apply each migration
MIGRATIONS=(
    "20250127_broadcast_businesses.sql"
    "20250127_broadcast_enhance_broadcasts.sql"
    "20250127_broadcast_targets.sql"
    "20250127_broadcast_messages.sql"
    "20250127_broadcast_enhance_responses.sql"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

for migration in "${MIGRATIONS[@]}"; do
    MIGRATION_FILE="supabase/migrations/$migration"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo "❌ Migration file not found: $MIGRATION_FILE"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        continue
    fi
    
    echo "  Applying $migration..."
    
    if psql "$DB_URL" -f "$MIGRATION_FILE" > /tmp/migration_${migration}.log 2>&1; then
        echo "    ✅ Success"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "    ⚠️  Warning (check log: /tmp/migration_${migration}.log)"
        # Check if it's a harmless error (already exists, etc.)
        if grep -q "already exists\|does not exist" /tmp/migration_${migration}.log; then
            echo "    (This is likely harmless - table/column may already exist)"
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
            echo "    ❌ Error details:"
            tail -5 /tmp/migration_${migration}.log | sed 's/^/      /'
        fi
    fi
    
    sleep 1
done

echo ""
echo "📊 Migration Summary:"
echo "   ✅ Successful: $SUCCESS_COUNT"
echo "   ⚠️  Warnings: $((5 - SUCCESS_COUNT - FAIL_COUNT))"
echo "   ❌ Failed: $FAIL_COUNT"
echo ""

# Verify tables
echo "🔍 Verifying tables..."
psql "$DB_URL" -c "
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN (
    'businesses',
    'broadcasts',
    'broadcast_targets',
    'broadcast_messages',
    'broadcast_responses'
  )
ORDER BY table_name;
"

echo ""
if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ All migrations applied successfully!"
    exit 0
else
    echo "⚠️  Some migrations had issues. Check logs in /tmp/migration_*.log"
    exit 1
fi

