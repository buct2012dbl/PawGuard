#!/bin/bash

# PawGuard Base Chain Deployment Script
# Quick deployment helper for Base Sepolia and Base Mainnet

set -e

echo "🚀 PawGuard Base Chain Deployment Helper"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file by copying .env.example:"
    echo "  cp .env.example .env"
    echo ""
    echo "Then edit .env and add your PRIVATE_KEY"
    exit 1
fi

echo -e "${GREEN}✅ Environment file found${NC}"

echo -e "${GREEN}✅ Environment file found and configured${NC}"
echo ""

# Select network
echo "Select deployment network:"
echo "1) Base Sepolia Testnet (recommended for testing)"
echo "2) Base Mainnet (production - requires real ETH)"
echo "3) Local Hardhat (development)"
echo ""
read -p "Enter choice (1-3): " network_choice

case $network_choice in
    1)
        NETWORK="base-sepolia"
        echo -e "${BLUE}📝 Selected: Base Sepolia Testnet${NC}"
        echo "⚠️  Make sure you have testnet ETH from the faucet:"
        echo "   https://www.coinbase.com/faucet/"
        ;;
    2)
        NETWORK="base-mainnet"
        echo -e "${BLUE}📝 Selected: Base Mainnet${NC}"
        echo "⚠️  PRODUCTION MODE - Ensure you have sufficient ETH"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Cancelled."
            exit 0
        fi
        ;;
    3)
        NETWORK="localhost"
        echo -e "${BLUE}📝 Selected: Local Hardhat${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "Deployment Configuration"
echo "========================================"
echo "Network: $NETWORK"
echo ""

# Compile contracts
echo -e "${YELLOW}🔨 Compiling contracts...${NC}"
npx hardhat compile

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contracts compiled successfully${NC}"
echo ""

# Run tests (optional)
if [ "$NETWORK" = "localhost" ]; then
    read -p "Run tests before deployment? (yes/no): " run_tests
    if [ "$run_tests" = "yes" ]; then
        echo -e "${YELLOW}🧪 Running tests...${NC}"
        npx hardhat test
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}⚠️  Tests failed - continue anyway? (yes/no)${NC}"
            read -p "" continue_anyway
            if [ "$continue_anyway" != "yes" ]; then
                exit 1
            fi
        fi
        echo -e "${GREEN}✅ Tests completed${NC}"
        echo ""
    fi
fi

# Deploy
echo -e "${YELLOW}🚀 Deploying contracts to $NETWORK...${NC}"
echo ""

npx hardhat run scripts/deploy.js --network "$NETWORK"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""

# Post-deployment instructions
if [ "$NETWORK" = "base-sepolia" ] || [ "$NETWORK" = "base-mainnet" ]; then
    echo "========================================"
    echo "📋 Next Steps:"
    echo "========================================"
    echo ""
    echo "1. Copy contract addresses to frontend environment:"
    echo "   cp .env.$NETWORK frontend/.env.local"
    echo ""
    echo "2. Verify contracts on BaseScan:"
    echo ""
    if [ "$NETWORK" = "base-sepolia" ]; then
        echo "   https://sepolia.basescan.org/"
    else
        echo "   https://basescan.org/"
    fi
    echo ""
    echo "3. Start the frontend development server:"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "4. Test the dApp at http://localhost:3000"
    echo ""
    echo "📝 Deployment Info:"
    echo "   Network: $NETWORK"
    echo "   Env File: .env.$NETWORK"
    echo "   Status: Check above output for contract addresses"
    echo ""
elif [ "$NETWORK" = "localhost" ]; then
    echo "========================================"
    echo "📋 Next Steps:"
    echo "========================================"
    echo ""
    echo "1. Contract addresses are displayed above"
    echo ""
    echo "2. Update frontend/.env.local with these addresses"
    echo ""
    echo "3. Start frontend development server:"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "4. Test the dApp at http://localhost:3000"
    echo ""
fi

echo -e "${GREEN}🎉 PawGuard deployment ready!${NC}"
