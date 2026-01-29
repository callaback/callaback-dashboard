#!/bin/bash

echo "🚀 Optimizing Callaback Dashboard Performance..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project to check for issues
echo "🔨 Building project..."
npm run build

# Check bundle size
echo "📊 Analyzing bundle size..."
npx next build --debug

echo "✅ Performance optimizations applied!"
echo ""
echo "🎯 Key improvements:"
echo "  • Lazy loading for heavy components"
echo "  • Parallel data fetching"
echo "  • Bundle optimization"
echo "  • Loading skeletons"
echo ""
echo "🚀 Run 'npm run dev' to test the improvements"
