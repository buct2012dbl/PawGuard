# PawGuard Configuration Guide

## Overview

PawGuard supports two operational modes:
- **Development Mode**: For local testing with mock services (Hedera DID, optional mock IPFS)
- **Production Mode**: For deployment with real Hedera DID and production IPFS

## Quick Start

### Development Mode (Default)

```bash
# 1. Set environment variable
echo "NEXT_PUBLIC_APP_MODE=development" > frontend/.env.local

# 2. Start local services
npx hardhat node                    # Terminal 1: Blockchain
ipfs daemon                         # Terminal 2: IPFS (optional)
cd frontend && npm run dev          # Terminal 3: Frontend

# 3. Access at http://localhost:3000
```

### Production Mode

```bash
# 1. Configure environment
cp frontend/.env.example frontend/.env.local

# 2. Edit frontend/.env.local with your credentials:
NEXT_PUBLIC_APP_MODE=production

# Hedera Configuration
NEXT_PUBLIC_HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=your_private_key_here

# IPFS Configuration
NEXT_PUBLIC_IPFS_API_URL=https://ipfs.infura.io:5001
NEXT_PUBLIC_IPFS_GATEWAY_URL=https://ipfs.io

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_NETWORK_NAME=Sepolia Testnet

# 3. Build and deploy
cd frontend
npm run build
npm run start
```

## Mode Differences

| Feature | Development Mode | Production Mode |
|---------|-----------------|-----------------|
| **Hedera DID** | Mock (instant, no cost) | Real Hedera HCS (requires HBAR) |
| **IPFS** | Local node (127.0.0.1:5001) | Production gateway (Infura/Pinata) |
| **Blockchain** | Hardhat Local (31337) | Sepolia/Mainnet |
| **Cost** | Free | Gas fees + HBAR required |
| **Speed** | Instant | Network latency |
| **Data Persistence** | Lost on restart | Permanent |

## Configuration Files

### `/frontend/.env.local`

Main environment configuration file (gitignored for security).

**Development Example:**
```env
NEXT_PUBLIC_APP_MODE=development
```

**Production Example:**
```env
NEXT_PUBLIC_APP_MODE=production

# Hedera
NEXT_PUBLIC_HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.48539845
HEDERA_OPERATOR_KEY=302e020...your_key

# IPFS
NEXT_PUBLIC_IPFS_API_URL=https://ipfs.infura.io:5001
NEXT_PUBLIC_IPFS_GATEWAY_URL=https://gateway.pinata.cloud

# Blockchain
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_NETWORK_NAME=Sepolia Testnet
```

### `/frontend/src/config/app.config.ts`

Application configuration logic that reads environment variables and provides mode-specific settings.

## Environment Variables

### Public Variables (Client-Side)

These variables are exposed to the browser (prefix: `NEXT_PUBLIC_`):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_MODE` | Yes | `development` or `production` |
| `NEXT_PUBLIC_HEDERA_NETWORK` | Production | `testnet` or `mainnet` |
| `NEXT_PUBLIC_IPFS_API_URL` | Production | IPFS API endpoint |
| `NEXT_PUBLIC_IPFS_GATEWAY_URL` | Production | IPFS gateway for retrieval |
| `NEXT_PUBLIC_CHAIN_ID` | Production | Ethereum chain ID |
| `NEXT_PUBLIC_RPC_URL` | Production | Ethereum RPC endpoint |
| `NEXT_PUBLIC_NETWORK_NAME` | Production | Display name for network |

### Private Variables (Server-Side Only)

These variables are **only** available on the server (API routes):

| Variable | Required | Description |
|----------|----------|-------------|
| `HEDERA_OPERATOR_ID` | Production | Hedera account ID (e.g., 0.0.xxxxx) |
| `HEDERA_OPERATOR_KEY` | Production | Hedera private key |

**Security Note**: Never prefix these with `NEXT_PUBLIC_` as it would expose them to the browser!

## How It Works

### Development Mode

```typescript
// Config automatically detects mode from NEXT_PUBLIC_APP_MODE
import { config, isDevelopment } from '@/config/app.config';

if (isDevelopment()) {
  // Uses mock Hedera DID
  const mockDID = `did:hedera:testnet:mock_${Date.now()}`;

  // Uses local IPFS
  const ipfs = create({ host: '127.0.0.1', port: 5001 });

  // Uses Hardhat Local
  const web3 = new Web3('http://127.0.0.1:8545');
}
```

### Production Mode

```typescript
import { config, isProduction } from '@/config/app.config';

if (isProduction()) {
  // Creates real Hedera DID via API
  const response = await fetch('/api/hedera/create-pet-did', {
    method: 'POST',
    body: JSON.stringify({ petId, owner, petData })
  });

  // Uses production IPFS
  const ipfs = create({ url: config.ipfs.apiUrl });

  // Uses configured RPC
  const web3 = new Web3(config.blockchain.rpcUrl);
}
```

## API Routes

### POST `/api/hedera/create-pet-did`

Creates a Hedera DID for a pet.

**Development Mode**: Returns mock DID instantly
**Production Mode**: Creates real DID on Hedera HCS

**Request:**
```json
{
  "petId": 1,
  "owner": "0x...",
  "petData": {
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age": 3
  }
}
```

**Response (Development):**
```json
{
  "success": true,
  "did": "did:hedera:testnet:zmock123_0.0.12345",
  "topicId": "0.0.12345",
  "mode": "development",
  "message": "🔧 Mock DID created for local testing"
}
```

**Response (Production):**
```json
{
  "success": true,
  "did": "did:hedera:testnet:z87f3...",
  "topicId": "0.0.4859234",
  "mode": "production",
  "message": "✅ Real Hedera DID created successfully"
}
```

### GET `/api/hedera/create-pet-did?did=...`

Resolves a Hedera DID.

**Development Mode**: Returns mock document
**Production Mode**: Resolves from Hedera HCS

## Switching Modes

### During Development

Edit `frontend/.env.local`:
```env
# Switch to development
NEXT_PUBLIC_APP_MODE=development

# Or production
NEXT_PUBLIC_APP_MODE=production
```

Then restart the dev server:
```bash
# Stop with Ctrl+C, then:
npm run dev
```

### With npm Scripts

Add to `frontend/package.json`:
```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "dev:prod": "NEXT_PUBLIC_APP_MODE=production next dev --webpack",
    "build:dev": "NEXT_PUBLIC_APP_MODE=development next build",
    "build:prod": "NEXT_PUBLIC_APP_MODE=production next build"
  }
}
```

Then run:
```bash
npm run dev          # Development mode
npm run dev:prod     # Production mode (local dev server)
npm run build:prod   # Production build
```

## Console Output

The mode is displayed in the browser console:

**Development:**
```
🚀 PawGuard running in DEVELOPMENT mode
📝 Using mock Hedera DID and local IPFS
```

**Production:**
```
🚀 PawGuard running in PRODUCTION mode
🌐 Connected to IPFS at https://ipfs.infura.io:5001
```

## Troubleshooting

### "Hedera credentials not configured"

**Problem**: Production mode enabled but credentials missing

**Solution**: Add to `.env.local`:
```env
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=your_key
```

### "IPFS connection refused"

**Problem**: Development mode but local IPFS not running

**Solutions**:
1. Start IPFS: `ipfs daemon`
2. Or enable mock IPFS in `app.config.ts`:
   ```typescript
   ipfs: {
     useMock: true,  // Enable this
     apiUrl: 'http://127.0.0.1:5001',
   }
   ```

### "Wrong network"

**Problem**: MetaMask on wrong network

**Solution**: The app auto-switches to configured network. If it fails:
1. Check `NEXT_PUBLIC_CHAIN_ID` matches your RPC
2. Manually add network in MetaMask

## Best Practices

### Development
- ✅ Use `.env.local` (gitignored)
- ✅ Keep Hardhat node running
- ✅ Start IPFS daemon before testing
- ✅ Reset MetaMask nonce after Hardhat restart

### Production
- ✅ Never commit `.env.local`
- ✅ Use separate Hedera testnet account
- ✅ Set up IPFS pinning service
- ✅ Monitor gas costs
- ✅ Keep private keys secure

### Security
- ⚠️ Never use `NEXT_PUBLIC_` for secrets
- ⚠️ Don't commit Hedera private keys
- ⚠️ Use environment-specific keys
- ⚠️ Rotate keys regularly

## Additional Resources

- [Hedera Testnet Portal](https://portal.hedera.com/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
