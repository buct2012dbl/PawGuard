# PawGuard Frontend - Next.js

A decentralized pet insurance platform built with Next.js 16, Web3.js, and IPFS.

## Features

- Pet NFT registration with on-chain metadata storage
- Insurance pool management with $GUARD stablecoin
- Decentralized claims submission and DAO voting
- MetaMask wallet integration
- IPFS integration for distributed data storage

## Prerequisites

Before running the application, ensure you have:

- Node.js 18 or higher
- MetaMask browser extension installed
- A local Hardhat node running (optional, for testing)
- IPFS daemon (optional, for IPFS features)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Connect MetaMask

- Make sure MetaMask is installed
- Connect to your local Hardhat network (or the appropriate network)
- Import test accounts if using local development

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Home page
│   │   ├── dashboard/    # Pet registration dashboard
│   │   ├── pool/         # Insurance pool
│   │   └── claims/       # Claims management
│   ├── components/       # React components
│   ├── contexts/         # React contexts (Web3)
│   ├── utils/            # Utility functions (Web3, IPFS)
│   └── artifacts/        # Smart contract ABIs
└── public/               # Static assets
```

## Smart Contracts Integration

The frontend integrates with the following smart contracts:

- **PetNFT**: Pet identity and medical records as NFTs
- **PawGuardToken ($PAW)**: Governance token for voting
- **GuardStableCoin ($GUARD)**: Stablecoin for pool contributions
- **PawPool**: Insurance pool and claims management

Contract addresses are loaded from `src/artifacts/contracts/contract-addresses.json`.

## Configuration

### Next.js Config

The project uses webpack mode (instead of Turbopack) for compatibility with ipfs-http-client. See `next.config.ts` for details.

### Environment Variables

Create a `.env.local` file for custom configuration:

```env
NEXT_PUBLIC_IPFS_HOST=localhost
NEXT_PUBLIC_IPFS_PORT=5001
NEXT_PUBLIC_CHAIN_ID=31337
```

## Troubleshooting

### MetaMask Connection Issues

1. Ensure MetaMask is unlocked
2. Check you're connected to the correct network
3. Refresh the page and try again

### IPFS Errors

1. Make sure IPFS daemon is running: `ipfs daemon`
2. Check IPFS API is accessible at http://localhost:5001
3. IPFS features are client-side only (will fail during SSR)

### Build Errors

If you encounter build errors related to electron or ipfs-http-client:
- Ensure you're using `npm run build` (which includes the --webpack flag)
- Check that `next.config.ts` includes the proper webpack configuration

## Migration Notes

This project was migrated from React to Next.js 16. See `MIGRATION_TO_NEXTJS.md` for full migration details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Hardhat Documentation](https://hardhat.org/docs)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Blockchain**: Web3.js
- **Storage**: IPFS (ipfs-http-client)
- **Smart Contracts**: Ethereum/Hardhat
