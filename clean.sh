#!/bin/bash
# 项目清理脚本 - 删除不需要的文件

echo "开始清理项目..."

# 删除依赖目录
if [ -d "server/node_modules" ]; then
    echo "删除 server/node_modules..."
    rm -rf server/node_modules
fi

# 删除 lock 文件
if [ -f "server/package-lock.json" ]; then
    echo "删除 server/package-lock.json..."
    rm -f server/package-lock.json
fi

# 删除日志文件
if [ -f "app.log" ]; then
    echo "删除 app.log..."
    rm -f app.log
fi

# 删除临时文件
find . -name "*.tmp" -delete 2>/dev/null
find . -name ".DS_Store" -delete 2>/dev/null
find . -name "Thumbs.db" -delete 2>/dev/null

echo "清理完成！"
echo ""
echo "注意：以下文件不包含在仓库中，不会被清理"
echo "- server/data/database.json (数据文件)"
echo ""
