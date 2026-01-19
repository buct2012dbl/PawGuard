#!/bin/bash

# PawGuard Deployment Readiness Verification Script
# Checks all components are ready for Base Chain deployment

echo "🔍 PawGuard Base Chain Deployment Readiness Check"
echo "=================================================="
echo ""

READY=true
ISSUES=0

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✅ Node.js: $NODE_VERSION"
else
    echo "   ❌ Node.js not found - Install from https://nodejs.org/"
    READY=false
    ((ISSUES++))
fi

# Check npm
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✅ npm: $NPM_VERSION"
else
    echo "   ❌ npm not found"
    READY=false
    ((ISSUES++))
fi

# Check Hardhat
echo ""
echo "⚙️  Checking Hardhat..."
if command -v npx &> /dev/null; then
    if npx hardhat --version &> /dev/null; then
        HARDHAT_VERSION=$(npx hardhat --version)
        echo "   ✅ Hardhat: $HARDHAT_VERSION"
    else
        echo "   ❌ Hardhat not installed - Run: npm install"
        READY=false
        ((ISSUES++))
    fi
else
    echo "   ❌ npx not found"
    READY=false
    ((ISSUES++))
fi

# Check required files
echo ""
echo "📁 Checking project files..."

FILES_TO_CHECK=(
    "hardhat.config.cjs"
    "scripts/deploy.js"
    ".env.example"
    "contracts/PetNFT.sol"
    "contracts/PawGuardToken.sol"
    "contracts/GuardStableCoin.sol"
    "contracts/PawPool.sol"
    "contracts/PetIdentity.sol"
    "contracts/JuryIdentity.sol"
    "contracts/VeterinarianCredential.sol"
    "frontend/src/config/app.config.ts"
    "frontend/src/utils/baseDID.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - NOT FOUND"
        READY=false
        ((ISSUES++))
    fi
done

# Check .env file
echo ""
echo "🔐 Checking environment setup..."
if [ -f .env ]; then
    if grep -q "PRIVATE_KEY=" .env && ! grep "PRIVATE_KEY=" .env | grep -q "your_private_key_here"; then
        echo "   ✅ .env file exists with PRIVATE_KEY set"
    else
        echo "   ⚠️  .env exists but PRIVATE_KEY not configured"
        echo "      Edit .env and set your PRIVATE_KEY"
    fi
else
    echo "   ℹ️  .env file not found (create from .env.example)"
    echo "      Run: cp .env.example .env"
fi

# Check if contracts compile
echo ""
echo "🔨 Checking contract compilation..."
if npx hardhat compile 2>&1 | grep -q "successfully"; then
    echo "   ✅ Contracts compile successfully"
else
    echo "   ❌ Contract compilation failed"
    echo "      Run: npx hardhat compile"
    READY=false
    ((ISSUES++))
fi

# Check git status
echo ""
echo "📝 Checking git configuration..."
if [ -f .gitignore ]; then
    if grep -q ".env" .gitignore; then
        echo "   ✅ .env is in .gitignore (safe)"
    else
        echo "   ⚠️  .env might be tracked in git!"
        echo "      Add '.env' to .gitignore before committing"
    fi
else
    echo "   ℹ️  .gitignore not found (create one if using git)"
fi

# Summary
echo ""
echo "=================================================="
if [ "$READY" = true ]; then
    echo "✅ All checks passed! Ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Ensure PRIVATE_KEY is set in .env"
    echo "2. Get testnet ETH from https://www.coinbase.com/faucet/"
    echo "3. Run: ./deploy.sh"
    echo "   OR"
    echo "   npx hardhat run scripts/deploy.js --network base-sepolia"
    echo ""
else
    if [ "$ISSUES" -eq 1 ]; then
        echo "❌ 1 issue found - please fix above"
    else
        echo "❌ $ISSUES issues found - please fix above"
    fi
    echo ""
    echo "Common fixes:"
    echo "• npm install                      (Install dependencies)"
    echo "• cp .env.example .env             (Create .env file)"
    echo "• npx hardhat compile              (Compile contracts)"
fi

echo "=================================================="
echo ""

exit $([ "$READY" = true ] && echo 0 || echo 1)
