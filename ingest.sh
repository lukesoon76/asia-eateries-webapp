#!/bin/bash
# Quick ingest script - run from project root
# Usage: ./ingest.sh

set -e

echo "🍜 Asia Eateries - Master List Ingest"
echo "======================================"
echo ""

cd backend

echo "📊 Running ingest..."
python -m app.ingest

echo ""
echo "✅ Ingest complete!"
echo ""
echo "Next: Push changes if you updated the master file"
echo "  git add backend/data/Asia_Eateries_Master_List.xlsx"
echo "  git commit -m 'Update master list'"
echo "  git push origin main"
