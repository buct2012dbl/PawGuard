# PawGuard (爪爪护卫)

## Project Vision
PawGuard aims to build a blockchain-based digital pet ecosystem. It leverages immutable digital identities to create a decentralized, community-governed, transparent, and trustworthy pet health assurance network.

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
