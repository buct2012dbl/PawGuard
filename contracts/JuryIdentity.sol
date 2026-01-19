// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title JuryIdentity
 * @dev Manages decentralized identities for jury members with Sybil resistance
 * @notice This contract prevents Sybil attacks in the jury selection process
 */
contract JuryIdentity is Ownable {
    using ECDSA for bytes32;

    // Jury member verification status
    enum JuryStatus { Unverified, Verified, Suspended, Banned }

    // Jury member identity
    struct JuryMember {
        string did;                         // Decentralized Identifier
        address memberAddress;              // Ethereum address
        string identityProofIPFSHash;       // IPFS hash of identity proof (KYC data)
        JuryStatus status;                  // Current status
        uint256 registrationDate;           // Registration timestamp
        uint256 reputationScore;            // Reputation (0-1000)
        uint256 totalVotes;                 // Total votes cast
        uint256 consistentVotes;            // Votes aligned with majority
        uint256 lastVoteTimestamp;          // Last time member voted
        bool isActive;                      // Whether member is active
        uint256 stakingAmount;              // Amount of PAW staked
        uint256[] participatedClaims;       // Claim IDs participated in
    }

    // Sybil resistance check data
    struct SybilCheckpoint {
        bytes32 identityHash;               // Hash of biometric/document data
        uint256 timestamp;                  // When check was performed
        address verifier;                   // Who performed verification
        bool passed;                        // Whether check passed
    }

    // Reputation history
    struct ReputationEvent {
        uint256 timestamp;
        int256 scoreChange;                 // Can be positive or negative
        string reason;
        address updatedBy;
    }

    // Mappings
    mapping(address => JuryMember) public juryMembers;
    mapping(string => address) public didToAddress;
    mapping(address => SybilCheckpoint[]) public sybilChecks;
    mapping(address => ReputationEvent[]) public reputationHistory;
    mapping(bytes32 => bool) public usedIdentityHashes;      // Prevent duplicate identities
    mapping(address => mapping(uint256 => bool)) public hasVotedOnClaim;  // member => claimId => voted

    // Authorized verifiers who can perform Sybil checks
    mapping(address => bool) public isVerifier;

    // Access control for registration
    mapping(address => bool) public registrationEnabled;  // Addresses allowed to register
    bool public openRegistration = false;                 // Whether registration is open to all

    // Configuration
    uint256 public minimumReputationForJury = 300;     // Minimum reputation to serve on jury
    uint256 public minimumStakeForJury;                // Minimum PAW stake required
    uint256 public reputationDecayPeriod = 90 days;    // Period for reputation decay
    uint256 public inactivityPenaltyPeriod = 180 days; // Period before inactivity penalty

    // Events
    event JuryMemberRegistered(address indexed member, string did);
    event JuryMemberVerified(address indexed member, address indexed verifier);
    event SybilCheckPerformed(address indexed member, bool passed, address indexed verifier);
    event ReputationUpdated(address indexed member, int256 change, uint256 newScore, string reason);
    event JuryMemberSuspended(address indexed member, string reason);
    event JuryMemberBanned(address indexed member, string reason);
    event JuryMemberReinstated(address indexed member);
    event StakeUpdated(address indexed member, uint256 newAmount);
    event RegistrationEnabledForAddress(address indexed member);
    event RegistrationDisabledForAddress(address indexed member);
    event OpenRegistrationToggled(bool enabled);

    constructor(uint256 _minimumStake) Ownable(msg.sender) {
        minimumStakeForJury = _minimumStake;
        isVerifier[msg.sender] = true;
    }

    /**
     * @dev Register as a potential jury member
     * @param _did Decentralized Identifier
     * @param _identityProofIPFSHash IPFS hash of identity proof
     */
    function registerJuryMember(
        string memory _did,
        string memory _identityProofIPFSHash
    ) public {
        // Access control: check if registration is allowed for this address
        require(
            openRegistration || registrationEnabled[msg.sender],
            "JuryIdentity: Registration not allowed for this address"
        );
        require(juryMembers[msg.sender].memberAddress == address(0), "JuryIdentity: Already registered");
        require(didToAddress[_did] == address(0), "JuryIdentity: DID already exists");
        require(bytes(_did).length > 0, "JuryIdentity: DID cannot be empty");

        juryMembers[msg.sender] = JuryMember({
            did: _did,
            memberAddress: msg.sender,
            identityProofIPFSHash: _identityProofIPFSHash,
            status: JuryStatus.Unverified,
            registrationDate: block.timestamp,
            reputationScore: 500,  // Start with neutral reputation
            totalVotes: 0,
            consistentVotes: 0,
            lastVoteTimestamp: 0,
            isActive: true,
            stakingAmount: 0,
            participatedClaims: new uint256[](0)
        });

        didToAddress[_did] = msg.sender;

        emit JuryMemberRegistered(msg.sender, _did);
    }

    /**
     * @dev Perform Sybil resistance check on a jury member
     * @param _member Member address to check
     * @param _identityHash Hash of biometric/document data for uniqueness check
     * @param _passed Whether the check passed
     */
    function performSybilCheck(
        address _member,
        bytes32 _identityHash,
        bool _passed
    ) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "JuryIdentity: Not authorized");
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");

        // Check if this identity hash is already used by another address
        if (_passed) {
            require(!usedIdentityHashes[_identityHash] || sybilChecks[_member].length > 0,
                    "JuryIdentity: Identity already registered to another address");
            usedIdentityHashes[_identityHash] = true;
        }

        SybilCheckpoint memory checkpoint = SybilCheckpoint({
            identityHash: _identityHash,
            timestamp: block.timestamp,
            verifier: msg.sender,
            passed: _passed
        });

        sybilChecks[_member].push(checkpoint);

        if (_passed && juryMembers[_member].status == JuryStatus.Unverified) {
            juryMembers[_member].status = JuryStatus.Verified;
            emit JuryMemberVerified(_member, msg.sender);
        }

        emit SybilCheckPerformed(_member, _passed, msg.sender);
    }

    /**
     * @dev Check if a member is eligible for jury duty
     * @param _member Address to check
     * @return bool True if eligible
     */
    function isEligibleForJury(address _member) public view returns (bool) {
        JuryMember memory member = juryMembers[_member];

        if (member.memberAddress == address(0)) return false;
        if (member.status != JuryStatus.Verified) return false;
        if (!member.isActive) return false;
        if (member.reputationScore < minimumReputationForJury) return false;
        if (member.stakingAmount < minimumStakeForJury) return false;

        // Apply reputation decay for inactivity
        if (member.lastVoteTimestamp > 0 &&
            block.timestamp > member.lastVoteTimestamp + inactivityPenaltyPeriod) {
            return false;  // Too inactive
        }

        return true;
    }

    /**
     * @dev Update jury member's stake amount
     * @param _member Member address
     * @param _newAmount New staking amount
     */
    function updateStake(address _member, uint256 _newAmount) external {
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");

        juryMembers[_member].stakingAmount = _newAmount;
        emit StakeUpdated(_member, _newAmount);
    }

    /**
     * @dev Record a vote by a jury member
     * @param _member Member address
     * @param _claimId Claim ID
     * @param _votedWithMajority Whether vote aligned with final outcome
     */
    function recordVote(
        address _member,
        uint256 _claimId,
        bool _votedWithMajority
    ) external {
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");
        require(!hasVotedOnClaim[_member][_claimId], "JuryIdentity: Already voted on this claim");

        JuryMember storage member = juryMembers[_member];
        member.totalVotes++;
        member.lastVoteTimestamp = block.timestamp;
        member.participatedClaims.push(_claimId);
        hasVotedOnClaim[_member][_claimId] = true;

        if (_votedWithMajority) {
            member.consistentVotes++;

            // Reward reputation for voting with majority
            int256 reputationGain = 5;
            _updateReputation(_member, reputationGain, "Voted with majority");
        } else {
            // Small penalty for voting against majority
            int256 reputationLoss = -2;
            _updateReputation(_member, reputationLoss, "Voted against majority");
        }
    }

    /**
     * @dev Update jury member reputation
     * @param _member Member address
     * @param _scoreChange Change in reputation (can be negative)
     * @param _reason Reason for change
     */
    function updateReputation(
        address _member,
        int256 _scoreChange,
        string memory _reason
    ) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "JuryIdentity: Not authorized");
        _updateReputation(_member, _scoreChange, _reason);
    }

    /**
     * @dev Internal function to update reputation
     */
    function _updateReputation(
        address _member,
        int256 _scoreChange,
        string memory _reason
    ) internal {
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");

        JuryMember storage member = juryMembers[_member];

        // Apply change with bounds checking
        int256 newScore = int256(member.reputationScore) + _scoreChange;
        if (newScore < 0) newScore = 0;
        if (newScore > 1000) newScore = 1000;

        member.reputationScore = uint256(newScore);

        // Record in history
        ReputationEvent memory repEvent = ReputationEvent({
            timestamp: block.timestamp,
            scoreChange: _scoreChange,
            reason: _reason,
            updatedBy: msg.sender
        });
        reputationHistory[_member].push(repEvent);

        emit ReputationUpdated(_member, _scoreChange, member.reputationScore, _reason);
    }

    /**
     * @dev Suspend a jury member
     * @param _member Member address
     * @param _reason Reason for suspension
     */
    function suspendMember(address _member, string memory _reason) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "JuryIdentity: Not authorized");
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");

        juryMembers[_member].status = JuryStatus.Suspended;
        emit JuryMemberSuspended(_member, _reason);
    }

    /**
     * @dev Ban a jury member permanently
     * @param _member Member address
     * @param _reason Reason for ban
     */
    function banMember(address _member, string memory _reason) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "JuryIdentity: Not authorized");
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");

        juryMembers[_member].status = JuryStatus.Banned;
        juryMembers[_member].isActive = false;
        emit JuryMemberBanned(_member, _reason);
    }

    /**
     * @dev Reinstate a suspended jury member
     * @param _member Member address
     */
    function reinstateMember(address _member) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "JuryIdentity: Not authorized");
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");
        require(juryMembers[_member].status == JuryStatus.Suspended, "JuryIdentity: Member not suspended");

        juryMembers[_member].status = JuryStatus.Verified;
        juryMembers[_member].isActive = true;
        emit JuryMemberReinstated(_member);
    }

    /**
     * @dev Get jury member details
     * @param _member Member address
     * @return JuryMember struct
     */
    function getJuryMember(address _member) public view returns (JuryMember memory) {
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");
        return juryMembers[_member];
    }

    /**
     * @dev Get member's voting consistency percentage
     * @param _member Member address
     * @return uint256 Percentage (0-100)
     */
    function getVotingConsistency(address _member) public view returns (uint256) {
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");

        if (juryMembers[_member].totalVotes == 0) return 0;

        return (juryMembers[_member].consistentVotes * 100) / juryMembers[_member].totalVotes;
    }

    /**
     * @dev Get reputation history for a member
     * @param _member Member address
     * @return ReputationEvent[] Array of reputation events
     */
    function getReputationHistory(address _member) public view returns (ReputationEvent[] memory) {
        return reputationHistory[_member];
    }

    /**
     * @dev Get claims participated in by a member
     * @param _member Member address
     * @return uint256[] Array of claim IDs
     */
    function getParticipatedClaims(address _member) public view returns (uint256[] memory) {
        require(juryMembers[_member].memberAddress != address(0), "JuryIdentity: Member not registered");
        return juryMembers[_member].participatedClaims;
    }

    /**
     * @dev Batch check eligibility for multiple addresses
     * @param _members Array of member addresses
     * @return bool[] Array of eligibility results
     */
    function batchCheckEligibility(address[] memory _members) public view returns (bool[] memory) {
        bool[] memory results = new bool[](_members.length);
        for (uint i = 0; i < _members.length; i++) {
            results[i] = isEligibleForJury(_members[i]);
        }
        return results;
    }

    /**
     * @dev Set minimum reputation required for jury duty
     * @param _newMinimum New minimum reputation
     */
    function setMinimumReputation(uint256 _newMinimum) public onlyOwner {
        require(_newMinimum <= 1000, "JuryIdentity: Reputation must be <= 1000");
        minimumReputationForJury = _newMinimum;
    }

    /**
     * @dev Enable registration for a specific address
     * @param _address Address to enable registration for
     */
    function enableRegistrationForAddress(address _address) public onlyOwner {
        require(_address != address(0), "JuryIdentity: Invalid address");
        registrationEnabled[_address] = true;
        emit RegistrationEnabledForAddress(_address);
    }

    /**
     * @dev Disable registration for a specific address
     * @param _address Address to disable registration for
     */
    function disableRegistrationForAddress(address _address) public onlyOwner {
        registrationEnabled[_address] = false;
        emit RegistrationDisabledForAddress(_address);
    }

    /**
     * @dev Enable or disable open registration (allow anyone to register)
     * @param _enabled True to allow open registration
     */
    function toggleOpenRegistration(bool _enabled) public onlyOwner {
        openRegistration = _enabled;
        emit OpenRegistrationToggled(_enabled);
    }

    /**
     * @dev Batch enable registration for multiple addresses
     * @param _addresses Array of addresses to enable
     */
    function batchEnableRegistration(address[] memory _addresses) public onlyOwner {
        for (uint256 i = 0; i < _addresses.length; i++) {
            require(_addresses[i] != address(0), "JuryIdentity: Invalid address");
            registrationEnabled[_addresses[i]] = true;
            emit RegistrationEnabledForAddress(_addresses[i]);
        }
    }

    /**
     * @dev Check if an address is eligible to register
     * @param _address Address to check
     * @return bool True if eligible to register
     */
    function canRegister(address _address) public view returns (bool) {
        return openRegistration || registrationEnabled[_address];
    }

    /**
     * @dev Set minimum stake required for jury duty
     * @param _newMinimum New minimum stake
     */
    function setMinimumStake(uint256 _newMinimum) public onlyOwner {
        minimumStakeForJury = _newMinimum;
    }

    /**
     * @dev Authorize a verifier
     * @param _verifier Address to authorize
     */
    function authorizeVerifier(address _verifier) public onlyOwner {
        require(_verifier != address(0), "JuryIdentity: Invalid address");
        isVerifier[_verifier] = true;
    }

    /**
     * @dev Revoke verifier authorization
     * @param _verifier Address to revoke
     */
    function revokeVerifier(address _verifier) public onlyOwner {
        isVerifier[_verifier] = false;
    }

    /**
     * @dev Get number of Sybil checks performed on a member
     * @param _member Member address
     * @return uint256 Number of checks
     */
    function getSybilCheckCount(address _member) public view returns (uint256) {
        return sybilChecks[_member].length;
    }

    /**
     * @dev Check if member has passed Sybil verification
     * @param _member Member address
     * @return bool True if passed
     */
    function hasSybilVerification(address _member) public view returns (bool) {
        SybilCheckpoint[] memory checks = sybilChecks[_member];
        if (checks.length == 0) return false;

        // Check most recent verification
        return checks[checks.length - 1].passed;
    }
}
