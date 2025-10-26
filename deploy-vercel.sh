#!/bin/bash

# PawGuard Vercel 部署脚本
# 使用方法: ./deploy-vercel.sh

set -e

echo "🚀 PawGuard Vercel 部署准备..."
echo ""

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 未找到 Vercel CLI"
    echo "📦 正在安装 Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI 已就绪"
echo ""

# 检查环境变量配置
if [ ! -f "frontend/.env.production" ]; then
    echo "⚠️  未找到 frontend/.env.production"
    echo "📝 请先创建生产环境配置文件:"
    echo ""
    echo "  cp frontend/.env.production.example frontend/.env.production"
    echo "  # 然后编辑 .env.production 填入真实的凭证"
    echo ""
    exit 1
fi

echo "✅ 找到生产环境配置"
echo ""

# 检查合约地址
if ! grep -q "0x" "frontend/src/artifacts/contracts/contract-addresses.json"; then
    echo "⚠️  请确保已更新合约地址为 Sepolia 测试网地址"
    echo "   文件位置: frontend/src/artifacts/contracts/contract-addresses.json"
    echo ""
    read -p "已更新合约地址? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ 合约地址已确认"
echo ""

# 进入前端目录
cd frontend

# 测试本地构建
echo "🔨 测试本地构建..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 本地构建成功"
else
    echo "❌ 本地构建失败，请检查错误信息"
    exit 1
fi

echo ""
echo "🌐 准备部署到 Vercel..."
echo ""

# 部署到 Vercel
vercel --prod

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步:"
echo "  1. 访问 Vercel Dashboard 检查部署状态"
echo "  2. 确认环境变量已正确配置"
echo "  3. 测试应用功能"
echo "  4. 检查浏览器控制台应显示: 🚀 PawGuard running in PRODUCTION mode"
echo ""
