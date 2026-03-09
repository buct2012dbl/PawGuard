# PawGuard (爪爪护卫)

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-363636?style=flat&logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.26.3-FFF100?style=flat&logo=hardhat)](https://hardhat.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.0-000000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Base Chain](https://img.shields.io/badge/Base_Chain-Deployed-0052FF?style=flat&logo=coinbase)](https://base.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.4.0-4E5EE4?style=flat&logo=openzeppelin&logoColor=white)](https://openzeppelin.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

> A blockchain-based decentralized pet insurance ecosystem with immutable health records, community governance, and transparent mutual aid pools.

## Project Vision
PawGuard aims to build a blockchain-based digital pet ecosystem. It leverages immutable digital identities to create a decentralized, community-governed, transparent, and trustworthy pet health assurance network.

## Key Features

### 🏥 Pet NFT Registry (ERC-1155)
- **Unique Digital Identity**: Each pet gets a blockchain-based identity with immutable records
- **Dynamic Health Timeline**: Vaccination, medical records, and breeding history stored on-chain
- **IPFS Integration**: Decentralized storage for detailed medical documents and pet photos
- **Permission Management**: Owners control which veterinarians can write to their pet's records
- **Ownership Transfer**: Clear pedigree tracking with complete transfer history

### 💰 Decentralized Insurance Pool (PawPool)
- **Risk-Based Premiums**: Dynamic pricing based on pet age, breed, and health history
- **Three-Tier Fund Management**:
  - Immediate Payout Pool (30%): Fast claim settlements
  - Stable Yield Pool (60%): DeFi integration for passive income
  - Risk Reserve (10%): Emergency fund for extreme cases
- **Community Jury System**: 21 randomly selected $PAW stakers vote on claims
- **Automated Payouts**: Smart contracts execute approved claims instantly
- **Transparent Operations**: All transactions and votes recorded on-chain

### 🪙 Dual Token Economy
- **$PAW (Governance Token)**:
  - Stake to become eligible for jury duty
  - Vote on protocol upgrades and parameter changes
  - Earn rewards for participating in claim reviews
  - Buyback and burn mechanism for value accrual

- **$GUARD (Stablecoin)**:
  - Pegged 1:1 to USDC for price stability
  - Used for premium payments and claim payouts
  - Over-collateralized for security
  - Algorithmic stability mechanisms

### 👨‍⚕️ Veterinarian Credential System
- **On-Chain Verification**: Licensed vets get blockchain credentials
- **Digital Signatures**: All medical records cryptographically signed
- **Reputation System**: Track vet performance and community trust
- **Authorization Management**: Pets can authorize specific vets to update records

### ⚖️ Decentralized Governance
- **Random Jury Selection**: Fair and unbiased claim review process
- **Anonymous Voting**: Privacy-preserving jury decisions
- **Reward Distribution**: Jurors earn $PAW for participation
- **Dispute Resolution**: Multi-signature appeals process
- **Fraud Prevention**: On-chain records reduce false claims

### 🔗 Blockchain Integration
- **Base Chain Deployment**: Low-cost, fast transactions on Ethereum L2
- **Supabase Backend**: Off-chain data indexing for fast queries
- **IPFS Storage**: Decentralized file storage for medical documents
- **MetaMask Support**: Easy wallet connection and transaction signing
- **Smart Contract Security**: OpenZeppelin audited contracts

### 📊 Frontend Dashboard
- **Pet Management**: Register, view, and update pet profiles
- **Pool Statistics**: Real-time fund balances and yield tracking
- **Claim Submission**: Upload vet diagnosis and request payouts
- **Jury Portal**: Review claims and cast votes
- **Transaction History**: Complete audit trail with pagination
- **Responsive Design**: Mobile-friendly interface with dark mode

## Core Architecture: Dual Token Model + Two Core Functions

### 1. Cornerstone Layer: PetNFT - Digital Identity and Health Records
Each pet corresponds to a unique ERC-1155 NFT, serving as both its digital identity and a lifelong health record.

**Core Features:**
*   **Unique Identity:** Contains basic pet information (breed, birthdate, chip number, etc.).
*   **Dynamic Health Timeline:** Vaccination, check-up, and medical records are uploaded to the chain after being signed by authorized institutions (veterinarians).
*   **Ownership and Pedigree Proof:** Breeding records and transfer history are clearly traceable.
*   **Permission Management:** Owners can authorize specific institutions (vets, insurance companies) to write data.

**Technical Implementation Snippets:**
```solidity
struct PetRecord {
    address owner;
    string basicInfoIPFSHash; // Basic information
    address[] authorizedVets; // Authorized veterinarian list
    MedicalRecord[] medicalHistory; // Array of medical records
}

struct MedicalRecord {
    address vetAddress; // Veterinarian's signature
    string recordIPFSHash; // IPFS hash of detailed record
    uint256 timestamp;
    bool isValid;
}
```

### 2. Financial Layer: PawPool - Decentralized Mutual Insurance Pool
Based on PetNFT's health data, a smart contract-managed mutual aid community is built.

**Operational Mechanism:**

**A. Risk Assessment and Tiered Premiums**
When a pet joins the mutual aid pool, the system assesses risk based on its PetNFT health records:
*   **Young, Healthy Pets** (regular vaccinations, no medical history): Lower basic premium.
*   **Pets with Chronic Disease Records:** Higher premiums, but still eligible for coverage.
*   **Elderly Pets:** Special elderly pet pool, with community sharing risks.

**Technical Implementation Snippets:**
```solidity
function calculatePremium(uint256 petNFTId) public view returns (uint256) {
    // Calculate risk score based on average breed lifespan, current age, past medical history, etc.
    uint256 riskScore = _calculateRiskScore(petNFTId);
    return basePremium * riskScore / 100;
}
```

**B. Community-based Claims Process**
*   **Claim Application:** Owner submits a claim via the DApp, including a veterinarian's diagnosis certificate (hash on-chain).
*   **Random Jury:** 21 members are randomly drawn from the pool to form a jury (anonymized).
*   **Evidence Verification:** Jury reviews vet certificates, historical records, etc.
*   **Community Vote:** Jury votes on whether to approve compensation (2/3 majority required).
*   **Automated Payout:** Upon approval, the smart contract automatically pays the vet or owner.

**C. Fund Management and Yield**
*   **Three-tiered Fund Pool Structure:**
    *   **Immediate Payout Pool** (30%): For rapid claims.
    *   **Stable Yield Pool** (60%): Invested in low-risk DeFi protocols (e.g., Aave, Compound) to earn yield.
    *   **Risk Reserve** (10%): To handle extreme situations.

## Dual Token Economic Model

### 1. $PAW - Governance Token (ERC-20)
*   **Functions:** Community governance, staking rewards, jury qualification.
*   **Acquisition:** Provide liquidity, serve as a juror, invite new members.
*   **Value Support:** Protocol fees used for buyback and burn.

### 2. $GUARD - Stable Token (Pegged to USDC)
*   **Functions:** Pay premiums, receive payouts, in-pool valuation.
*   **Stability:** Maintained by over-collateralization and algorithmic stability mechanisms to ensure 1:1 peg.

## Core Workflow Example: Mimi's Gastroenteritis Treatment

**Scenario:** Cat "Mimi" suffers from severe vomiting due to gastroenteritis.

1.  **Identity Verification:**
    *   Owner opens PawGuard DApp, scans Mimi's PetNFT QR code.
    *   System displays complete health profile: 3 years old, spayed, fully vaccinated.

2.  **Veterinary Visit & Claim:**
    *   Mimi is taken to a partner pet hospital.
    *   Veterinarian diagnoses, signs diagnosis certificate via authorized wallet, and uploads to the chain.
    *   Owner submits claim application in the DApp, pays $GUARD as a deposit.

3.  **Community Governance:**
    *   System randomly selects 21 $PAW stakers to form a jury.
    *   Jurors anonymously review: Is the diagnosis reasonable? Is the cost fair?
    *   18 votes in favor, 3 against → Claim approved.

4.  **Automated Execution:**
    *   Smart contract directly pays 80% of treatment costs (total 500 $GUARD) to the hospital.
    *   Jurors receive $PAW rewards.
    *   All records are permanently written to Mimi's PetNFT timeline.

## Competitive Advantages & Innovation Points

1.  **Data-Driven Precise Risk Control**
    *   **Traditional Insurance:** Relies on statistical data and manual underwriting.
    *   **PawGuard:** Uses real, immutable on-chain health records for fairer pricing.

2.  **Community Co-governance Trust Mechanism**
    *   **Traditional Insurance:** Insurance companies unilaterally decide claims.
    *   **PawGuard:** Community jury system eliminates centralized black-box operations.

3.  **Cost Reduction and Virtuous Cycle**
    *   **No Intermediaries:** Removes 30-40% operational costs of insurance companies.
    *   **DeFi Yield:** Fund pool earns yield, reinvesting into the community to lower overall premiums.
    *   **Fraud Prevention:** On-chain records are difficult to falsify, reducing fraudulent claims.

4.  **Positive Health Incentives**
    *   Pets receive premium discounts for regular check-ups and vaccinations, creating a "healthier, cheaper" virtuous cycle.

## Tech Stack

### Smart Contracts
- **Solidity ^0.8.0**: Smart contract development language
- **Hardhat 2.26.3**: Development environment and testing framework
- **OpenZeppelin 5.4.0**: Secure, audited contract libraries
- **Ethers.js 5.7.2**: Ethereum interaction library

### Frontend
- **Next.js 16.0.0**: React framework with SSR and routing
- **React 19.2.0**: UI component library
- **TypeScript 5.0**: Type-safe JavaScript
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **Web3.js 4.16.0**: Blockchain interaction
- **Ethers.js 6.0.0**: Modern Ethereum library

### Infrastructure
- **Base Chain**: Ethereum L2 for low-cost transactions
- **IPFS**: Decentralized file storage
- **Supabase**: PostgreSQL database for indexing
- **Vercel**: Frontend hosting and deployment

## Smart Contracts

| Contract | Description | Address |
|----------|-------------|---------|
| **PetNFT** | ERC-1155 pet identity and health records | [View on BaseScan](https://basescan.org) |
| **PawGuardToken** | ERC-20 governance token ($PAW) | [View on BaseScan](https://basescan.org) |
| **GuardStableCoin** | ERC-20 stablecoin ($GUARD) | [View on BaseScan](https://basescan.org) |
| **PawPool** | Insurance pool and claim management | [View on BaseScan](https://basescan.org) |
| **VeterinarianCredential** | Vet verification and authorization | [View on BaseScan](https://basescan.org) |
| **JuryIdentity** | Jury selection and voting system | [View on BaseScan](https://basescan.org) |
| **PetIdentity** | Pet registration and ownership | [View on BaseScan](https://basescan.org) |

## Getting Started

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
MetaMask browser extension
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/PawGuard.git
cd PawGuard
```

2. Install dependencies
```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

3. Configure environment variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# - PRIVATE_KEY: Your wallet private key
# - BASE_RPC_URL: Base chain RPC endpoint
# - BASESCAN_API_KEY: For contract verification
# - SUPABASE_URL: Supabase project URL
# - SUPABASE_ANON_KEY: Supabase anonymous key
```

4. Compile contracts
```bash
npm run compile
```

5. Run tests
```bash
npm run test
```

6. Deploy to Base Chain
```bash
npm run deploy:base
```

7. Start frontend development server
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Development Workflow

### Local Testing
```bash
# Start local Hardhat node
npm run node

# Deploy to localhost
npm run deploy:localhost

# Run contract tests
npm run test
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Project Structure

```
PawGuard/
├── contracts/              # Solidity smart contracts
│   ├── PetNFT.sol
│   ├── PawGuardToken.sol
│   ├── GuardStableCoin.sol
│   ├── PawPool.sol
│   ├── VeterinarianCredential.sol
│   ├── JuryIdentity.sol
│   └── PetIdentity.sol
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts (Web3, etc.)
│   │   ├── utils/        # Utility functions
│   │   └── artifacts/    # Compiled contract ABIs
│   └── public/           # Static assets
├── scripts/              # Deployment scripts
├── test/                 # Contract tests
├── config/               # Configuration files
└── docs/                 # Documentation

```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- All smart contracts use OpenZeppelin's audited libraries
- Multi-signature controls for critical operations
- Time-locked governance changes
- Regular security audits recommended before mainnet deployment

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact & Support

- **Documentation**: [Full Documentation](./DOCUMENTATION_INDEX.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/PawGuard/issues)
- **Deployment Guide**: [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

## Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Base Chain for scalable L2 infrastructure
- IPFS for decentralized storage
- The Ethereum community for continuous innovation

---

**Built with ❤️ for pets and their humans**
