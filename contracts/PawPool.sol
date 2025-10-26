// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PetNFT.sol"; // Assuming PetNFT.sol is in the same directory
import "./VeterinarianCredential.sol";
import "./JuryIdentity.sol";

contract PawPool is Ownable {
    // --- Contract References ---
    PetNFT public petNFT;
    IERC20 public pawToken; // $PAW Governance Token
    IERC20 public guardToken; // $GUARD Stable Token
    VeterinarianCredential public vetCredentialContract;
    JuryIdentity public juryIdentityContract;

    // --- Pool Configuration ---
    uint256 public basePremium;
    uint256 public juryDepositAmount; // Amount of $PAW required to stake for jury duty
    uint256 public claimSubmissionFee; // Amount of $GUARD required to submit a claim
    uint256 public juryVotingPeriod; // Time in seconds for jury to vote
    uint256 public constant REQUIRED_JURY_VOTES = 21; // Number of jurors required for a claim
    uint256 public constant MAJORITY_THRESHOLD = 2; // 2/3 majority (e.g., 2 out of 3)

    // --- Fund Pools (simplified for now, actual DeFi integration would be more complex) ---
    uint256 public immediatePayoutPool; // Holds GUARD for immediate payouts
    uint256 public stableYieldPool;     // Funds intended for DeFi protocols
    uint256 public riskReservePool;     // Emergency funds

    // --- Claim Management ---
    enum ClaimStatus { Pending, InReview, Approved, Rejected, Refunded }

    struct Claim {
        uint256 petId;
        address owner;                      // Pet owner who submitted the claim
        address treatingVet;                // Veterinarian who provided the diagnosis for this claim
        string vetDiagnosisIPFSHash;        // IPFS hash of detailed medical record
        uint256 submissionTimestamp;        // Time when the claim was submitted
        uint256 requestedPayoutAmount;      // Amount of GUARD requested for payout
        ClaimStatus status;                 // Current status of the claim
        address[] juryMembers;              // Addresses of the $PAW stakers selected for jury duty
        uint256 approveVotes;               // Count of approve votes
        uint256 rejectVotes;                // Count of reject votes
        address[] payoutAddresses;          // Addresses to receive payout (e.g., vet, owner)
        uint256[] payoutAmounts;            // Corresponding amounts for payout
    }

    // Separate mappings for claim voting data
    mapping(uint256 => mapping(address => bool)) public claimHasVoted;  // claimId => juror => hasVoted
    mapping(uint256 => mapping(address => bool)) public claimVoteApproved; // claimId => juror => approved

    // Mapping from claim ID to Claim struct
    uint256 private _claimIdCounter;
    mapping(uint256 => Claim) public claims;

    // --- Jury Management ---
    // For simplicity, jury member selection will be a placeholder. In a real system,
    // this would involve $PAW staking and a more robust random selection.
    mapping(address => uint256) public pawStakes; // $PAW staked by potential jurors
    address[] private _stakers; // Array to keep track of all stakers


    // Events
    event PremiumPaid(uint256 indexed petId, address indexed payer, uint256 amount);
    event ClaimSubmitted(uint256 indexed claimId, uint256 indexed petId, address indexed owner, uint256 requestedAmount);
    event ClaimStatusUpdated(uint256 indexed claimId, ClaimStatus newStatus);
    event JurySelected(uint256 indexed claimId, uint256[] juryMemberIds);
    event VoteRecorded(uint256 indexed claimId, address indexed juror, bool approved);
    event ClaimPayout(uint256 indexed claimId, address[] recipients, uint256[] amounts);
    event PawStaked(address indexed staker, uint256 amount);
    event PawUnstaked(address indexed staker, uint256 amount);

    uint256 public constant PAW_REWARD_PER_JUROR = 5 * 10 ** 18; // Example: 5 PAW per juror

    constructor(
        address _petNFTAddress,
        address _pawTokenAddress,
        address _guardTokenAddress,
        address _vetCredentialAddress,
        address _juryIdentityAddress
    ) Ownable(msg.sender) {
        petNFT = PetNFT(_petNFTAddress);
        pawToken = IERC20(_pawTokenAddress);
        guardToken = IERC20(_guardTokenAddress);
        vetCredentialContract = VeterinarianCredential(_vetCredentialAddress);
        juryIdentityContract = JuryIdentity(_juryIdentityAddress);

        basePremium = 100 * 10 ** 18; // Example: 100 GUARD as base premium
        juryDepositAmount = 100 * 10 ** 18; // Example: 100 PAW stake for jury duty
        claimSubmissionFee = 10 * 10 ** 18; // Example: 10 GUARD fee for submitting a claim
        juryVotingPeriod = 3 days; // Example: 3 days for jury to vote
    }

    // --- Premium & Enrollment ---

    // Internal function to calculate risk score (simplified placeholder)
    function _calculateRiskScore(uint256 _petId) internal view returns (uint256) {
        // In a real implementation, detailed risk assessment based on basicInfoIPFSHash (breed, age)
        // would be performed off-chain (e.g., by an oracle) which then provides a risk factor to the smart contract.
        // For now, we will use on-chain medical history length as a proxy.
        uint256 medicalHistoryLength = petNFT.getMedicalHistoryLength(_petId);
        uint256 riskScore = 100; // Base score (100%)

        // Increase risk score for each medical record, indicating potential chronic conditions or frequent issues
        riskScore += medicalHistoryLength * 10; // +10% for each medical record

        // Future: Incorporate age, breed-specific risks, etc., via an off-chain oracle that updates a parameter
        return riskScore; // Returns a percentage multiplier (e.g., 100 for no risk, 120 for 20% higher)
    }

    // Calculate the premium for a specific pet
    function getPetPremium(uint256 _petId) public view returns (uint256) {
        (address owner, ) = petNFT.getPetBasicInfo(_petId);
        require(owner != address(0), "PawPool: PetNFT does not exist");
        uint256 riskScore = _calculateRiskScore(_petId);
        return (basePremium * riskScore) / 100; // riskScore is a percentage multiplier
    }

    // Function for pet owner to pay premium and enroll their pet
    function payPremium(uint256 _petId, uint256 _amount) public {
        (address owner, ) = petNFT.getPetBasicInfo(_petId);
        require(owner == msg.sender, "PawPool: Only pet owner can pay premium");
        uint256 requiredPremium = getPetPremium(_petId);
        require(_amount >= requiredPremium, "PawPool: Insufficient premium paid");

        // Transfer GUARD tokens from owner to PawPool contract
        require(guardToken.transferFrom(msg.sender, address(this), _amount), "PawPool: GUARD transfer failed");

        // For simplicity, all premiums go to immediatePayoutPool for now
        // immediatePayoutPool[msg.sender] += _amount; // Keep track of owner's contribution to their pool

        // Distribute premium to the three-tiered fund pools
        uint256 immediate = (_amount * 30) / 100;
        uint256 stable = (_amount * 60) / 100;
        uint256 risk = _amount - immediate - stable; // Remaining 10% or adjusted for rounding

        immediatePayoutPool += immediate;
        stableYieldPool += stable;
        riskReservePool += risk;

        emit PremiumPaid(_petId, msg.sender, _amount);
    }

    // --- Claims Process ---

    // Function for pet owner to submit a claim
    function submitClaim(
        uint256 _petId,
        address _treatingVetAddress,
        string memory _vetDiagnosisIPFSHash,
        uint256 _requestedPayoutAmount
    ) public {
        (address owner, ) = petNFT.getPetBasicInfo(_petId);
        require(owner == msg.sender, "PawPool: Only pet owner can submit claim");
        require(petNFT.isAuthorizedVet(_petId, _treatingVetAddress), "PawPool: Treating vet is not authorized for this pet");

        // Verify vet has valid credentials
        require(
            vetCredentialContract.isValidCredential(_treatingVetAddress),
            "PawPool: Vet does not have valid credentials"
        );

        require(bytes(_vetDiagnosisIPFSHash).length > 0, "PawPool: Vet diagnosis IPFS hash cannot be empty");
        require(_requestedPayoutAmount > 0, "PawPool: Payout amount must be greater than zero");

        // Pay claim submission fee
        require(guardToken.transferFrom(msg.sender, address(this), claimSubmissionFee), "PawPool: Claim submission fee transfer failed");

        _claimIdCounter++;
        uint256 newClaimId = _claimIdCounter;

        Claim storage newClaim = claims[newClaimId];
        newClaim.petId = _petId;
        newClaim.owner = msg.sender;
        newClaim.treatingVet = _treatingVetAddress;
        newClaim.vetDiagnosisIPFSHash = _vetDiagnosisIPFSHash;
        newClaim.submissionTimestamp = block.timestamp;
        newClaim.requestedPayoutAmount = _requestedPayoutAmount;
        newClaim.status = ClaimStatus.Pending;
        newClaim.approveVotes = 0;
        newClaim.rejectVotes = 0;

        emit ClaimSubmitted(newClaimId, _petId, msg.sender, _requestedPayoutAmount);
    }

    // Enhanced jury selection using JuryIdentity contract
    function selectJury(uint256 _claimId) public onlyOwner {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.Pending, "PawPool: Claim not in Pending status");
        require(_stakers.length >= REQUIRED_JURY_VOTES, "PawPool: Not enough stakers for jury selection");

        uint256 eligibleCount = 0;
        address[] memory eligibleJurors = new address[](_stakers.length);

        // Filter eligible jurors using JuryIdentity contract
        for (uint i = 0; i < _stakers.length; i++) {
            if (juryIdentityContract.isEligibleForJury(_stakers[i])) {
                eligibleJurors[eligibleCount] = _stakers[i];
                eligibleCount++;
            }
        }

        require(eligibleCount >= REQUIRED_JURY_VOTES, "PawPool: Not enough eligible jurors");

        // Select first REQUIRED_JURY_VOTES eligible jurors (in production, use VRF for randomness)
        for (uint i = 0; i < REQUIRED_JURY_VOTES; i++) {
            claim.juryMembers.push(eligibleJurors[i]);
        }

        claim.status = ClaimStatus.InReview;

        // Create temporary array for event
        uint256[] memory juryIds = new uint256[](claim.juryMembers.length);
        for (uint i = 0; i < claim.juryMembers.length; i++) {
            juryIds[i] = uint256(uint160(claim.juryMembers[i]));
        }
        emit JurySelected(_claimId, juryIds);
    }

    // Function for a juror to vote on a claim
    function voteOnClaim(uint256 _claimId, bool _approved) public {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.InReview, "PawPool: Claim not in InReview status");
        require(block.timestamp <= claim.submissionTimestamp + juryVotingPeriod, "PawPool: Voting period has ended");

        bool isJuror = false;
        for (uint i = 0; i < claim.juryMembers.length; i++) {
            if (claim.juryMembers[i] == msg.sender) {
                isJuror = true;
                break;
            }
        }
        require(isJuror, "PawPool: Caller is not a jury member for this claim");

        require(!claimHasVoted[_claimId][msg.sender], "PawPool: Already voted");
        claimHasVoted[_claimId][msg.sender] = true;
        claimVoteApproved[_claimId][msg.sender] = _approved;

        if (_approved) {
            claim.approveVotes++;
        } else {
            claim.rejectVotes++;
        }
        emit VoteRecorded(_claimId, msg.sender, _approved);

        // Check if all votes are in or if voting period ended
        if (claim.approveVotes + claim.rejectVotes == REQUIRED_JURY_VOTES) {
            _evaluateClaim(_claimId);
        }
    }

    // Internal function to evaluate claim outcome after voting or period ends
    function _evaluateClaim(uint256 _claimId) internal {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.InReview, "PawPool: Claim not in InReview status");

        if (claim.approveVotes + claim.rejectVotes < REQUIRED_JURY_VOTES && block.timestamp <= claim.submissionTimestamp + juryVotingPeriod) {
            // Not all votes in and voting period not ended, don't evaluate yet
            return;
        }

        // Corrected 2/3 majority: (approveVotes * 3) > (approveVotes + rejectVotes) * 2
        if (claim.approveVotes * 3 > (claim.approveVotes + claim.rejectVotes) * 2) {
            claim.status = ClaimStatus.Approved;
            _processPayout(_claimId);
        } else {
            claim.status = ClaimStatus.Rejected;
            // Optionally refund submission fee here
            // guardToken.transfer(claim.owner, claimSubmissionFee); // If refunding
        }
        emit ClaimStatusUpdated(_claimId, claim.status);
    }

    // Function to finalize voting and evaluate claim after juryVotingPeriod ends
    function finalizeClaimVoting(uint256 _claimId) public {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.InReview, "PawPool: Claim not in InReview status");
        require(block.timestamp > claim.submissionTimestamp + juryVotingPeriod, "PawPool: Voting period not ended yet");
        _evaluateClaim(_claimId);

        // Record votes in JuryIdentity contract for reputation tracking
        bool claimApproved = (claim.status == ClaimStatus.Approved);
        for (uint i = 0; i < claim.juryMembers.length; i++) {
            address juror = claim.juryMembers[i];
            if (claimHasVoted[_claimId][juror]) {
                bool votedApprove = claimVoteApproved[_claimId][juror];
                bool votedWithMajority = (votedApprove == claimApproved);
                juryIdentityContract.recordVote(juror, _claimId, votedWithMajority);
            }
        }
    }

    // Internal function to process the payout for an approved claim
    function _processPayout(uint256 _claimId) internal {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.Approved, "PawPool: Claim not approved for payout");

        uint256 totalPayout = claim.requestedPayoutAmount;
        require(guardToken.balanceOf(address(this)) >= totalPayout, "PawPool: Insufficient GUARD in pool");

        // Example: 80% to vet, 20% to owner (simplified)
        // In a real system, this would be based on the claim details and vet authorization.
        address vetAddress = claim.treatingVet;
        address ownerAddress = claim.owner;

        uint256 payoutToVet = (totalPayout * 80) / 100;
        uint256 payoutToOwner = totalPayout - payoutToVet;

        require(guardToken.transfer(vetAddress, payoutToVet), "PawPool: Payout to vet failed");
        require(guardToken.transfer(ownerAddress, payoutToOwner), "PawPool: Payout to owner failed");

        claim.payoutAddresses.push(vetAddress);
        claim.payoutAddresses.push(ownerAddress);
        claim.payoutAmounts.push(payoutToVet);
        claim.payoutAmounts.push(payoutToOwner);
        emit ClaimPayout(_claimId, claim.payoutAddresses, claim.payoutAmounts);

        // Notify VeterinarianCredential contract about successful claim
        vetCredentialContract.incrementClaimsApproved(vetAddress);

        // Distribute PAW rewards to jurors who voted to approve
        for (uint i = 0; i < claim.juryMembers.length; i++) {
            address jurorAddress = claim.juryMembers[i];
            if (claimVoteApproved[_claimId][jurorAddress]) { // Only reward jurors who voted to approve
                require(pawToken.transfer(jurorAddress, PAW_REWARD_PER_JUROR), "PawPool: PAW reward transfer failed");
            }
        }
    }

    // --- Fund Management (Owner-controlled for simplicity, later governed by $PAW) ---

    // Function for users to stake PAW tokens to become eligible for jury duty
    function stakePaw(uint256 _amount) public {
        require(_amount > 0, "PawPool: Stake amount must be greater than zero");
        require(pawToken.transferFrom(msg.sender, address(this), _amount), "PawPool: PAW stake failed");
        if (pawStakes[msg.sender] == 0) {
            _stakers.push(msg.sender);
        }
        pawStakes[msg.sender] += _amount;

        // Update JuryIdentity contract with new stake amount
        juryIdentityContract.updateStake(msg.sender, pawStakes[msg.sender]);

        emit PawStaked(msg.sender, _amount);
    }

    // Function for users to unstake PAW tokens
    function unstakePaw(uint256 _amount) public {
        require(_amount > 0, "PawPool: Unstake amount must be greater than zero");
        require(pawStakes[msg.sender] >= _amount, "PawPool: Insufficient staked PAW");
        pawStakes[msg.sender] -= _amount;
        if (pawStakes[msg.sender] == 0) {
            // Remove staker from _stakers array
            for (uint i = 0; i < _stakers.length; i++) {
                if (_stakers[i] == msg.sender) {
                    _stakers[i] = _stakers[_stakers.length - 1];
                    _stakers.pop();
                    break;
                }
            }
        }

        // Update JuryIdentity contract with new stake amount
        juryIdentityContract.updateStake(msg.sender, pawStakes[msg.sender]);

        require(pawToken.transfer(msg.sender, _amount), "PawPool: PAW unstake failed");
        emit PawUnstaked(msg.sender, _amount);
    }

    // In a full implementation, `stableYieldPool` and `riskReservePool` would have complex logic
    // for investing in DeFi protocols and managing reserves, likely governed by $PAW holders.
}
