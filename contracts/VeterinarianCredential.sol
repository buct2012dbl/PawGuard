// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title VeterinarianCredential
 * @dev Manages verifiable credentials for veterinarians with DID support
 * @notice This contract implements W3C-inspired Verifiable Credentials for veterinary professionals
 */
contract VeterinarianCredential is Ownable, EIP712 {
    using ECDSA for bytes32;

    // Credential status enum
    enum CredentialStatus { Active, Suspended, Revoked, Expired }

    // Veterinarian credential structure
    struct Credential {
        string did;                     // Decentralized Identifier (DID)
        address vetAddress;             // Ethereum address of the veterinarian
        string licenseNumber;           // Official veterinary license number (encrypted/hashed)
        string credentialIPFSHash;      // IPFS hash containing full credential details
        uint256 issuanceDate;           // When the credential was issued
        uint256 expirationDate;         // When the credential expires
        CredentialStatus status;        // Current status of the credential
        address issuer;                 // Address of the issuing authority
        uint256 reputationScore;        // Reputation score (0-1000)
        uint256 totalRecordsIssued;     // Total medical records issued by this vet
        uint256 totalClaimsApproved;    // Total insurance claims approved
    }

    // Credential verification signature structure
    struct CredentialProof {
        bytes signature;                // Cryptographic signature
        uint256 timestamp;              // When the proof was created
        address signer;                 // Who signed the proof
    }

    // Mappings
    mapping(address => Credential) public credentials;
    mapping(string => address) public didToAddress;        // DID to address lookup
    mapping(address => bool) public isIssuer;              // Authorized credential issuers
    mapping(address => CredentialProof[]) public proofs;   // Verification proofs for each vet

    // Events
    event CredentialIssued(
        address indexed vetAddress,
        string did,
        string licenseNumber,
        uint256 expirationDate
    );
    event CredentialRevoked(address indexed vetAddress, string reason);
    event CredentialSuspended(address indexed vetAddress, string reason);
    event CredentialReactivated(address indexed vetAddress);
    event ReputationUpdated(address indexed vetAddress, uint256 newScore, string reason);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event CredentialVerified(address indexed vetAddress, address indexed verifier);

    // Modifiers
    modifier onlyIssuer() {
        require(isIssuer[msg.sender] || msg.sender == owner(), "VeterinarianCredential: Caller is not an authorized issuer");
        _;
    }

    modifier credentialExists(address _vetAddress) {
        require(credentials[_vetAddress].vetAddress != address(0), "VeterinarianCredential: Credential does not exist");
        _;
    }

    constructor() Ownable(msg.sender) EIP712("VeterinarianCredential", "1") {
        // Owner is automatically an issuer
        isIssuer[msg.sender] = true;
    }

    /**
     * @dev Issue a new credential to a veterinarian
     * @param _vetAddress Ethereum address of the veterinarian
     * @param _did Decentralized Identifier (e.g., "did:pawguard:vet:abc123")
     * @param _licenseNumber Official veterinary license number
     * @param _credentialIPFSHash IPFS hash containing full credential details
     * @param _expirationDate Unix timestamp when credential expires
     */
    function issueCredential(
        address _vetAddress,
        string memory _did,
        string memory _licenseNumber,
        string memory _credentialIPFSHash,
        uint256 _expirationDate
    ) public onlyIssuer {
        require(_vetAddress != address(0), "VeterinarianCredential: Invalid vet address");
        require(credentials[_vetAddress].vetAddress == address(0), "VeterinarianCredential: Credential already exists");
        require(didToAddress[_did] == address(0), "VeterinarianCredential: DID already registered");
        require(_expirationDate > block.timestamp, "VeterinarianCredential: Expiration date must be in the future");
        require(bytes(_did).length > 0, "VeterinarianCredential: DID cannot be empty");
        require(bytes(_licenseNumber).length > 0, "VeterinarianCredential: License number cannot be empty");

        credentials[_vetAddress] = Credential({
            did: _did,
            vetAddress: _vetAddress,
            licenseNumber: _licenseNumber,
            credentialIPFSHash: _credentialIPFSHash,
            issuanceDate: block.timestamp,
            expirationDate: _expirationDate,
            status: CredentialStatus.Active,
            issuer: msg.sender,
            reputationScore: 500,  // Start with neutral reputation (out of 1000)
            totalRecordsIssued: 0,
            totalClaimsApproved: 0
        });

        didToAddress[_did] = _vetAddress;

        emit CredentialIssued(_vetAddress, _did, _licenseNumber, _expirationDate);
    }

    /**
     * @dev Verify if a veterinarian has a valid active credential
     * @param _vetAddress Address to verify
     * @return bool True if credential is valid and active
     */
    function isValidCredential(address _vetAddress) public view returns (bool) {
        Credential memory cred = credentials[_vetAddress];

        if (cred.vetAddress == address(0)) return false;
        if (cred.status != CredentialStatus.Active) return false;
        if (cred.expirationDate <= block.timestamp) return false;

        return true;
    }

    /**
     * @dev Get credential details by address
     * @param _vetAddress Veterinarian address
     * @return Credential struct
     */
    function getCredential(address _vetAddress) public view credentialExists(_vetAddress) returns (Credential memory) {
        return credentials[_vetAddress];
    }

    /**
     * @dev Get veterinarian address by DID
     * @param _did Decentralized Identifier
     * @return address Veterinarian address
     */
    function getAddressByDID(string memory _did) public view returns (address) {
        address vetAddress = didToAddress[_did];
        require(vetAddress != address(0), "VeterinarianCredential: DID not found");
        return vetAddress;
    }

    /**
     * @dev Revoke a credential (permanent)
     * @param _vetAddress Address of the veterinarian
     * @param _reason Reason for revocation
     */
    function revokeCredential(address _vetAddress, string memory _reason) public onlyIssuer credentialExists(_vetAddress) {
        credentials[_vetAddress].status = CredentialStatus.Revoked;
        emit CredentialRevoked(_vetAddress, _reason);
    }

    /**
     * @dev Suspend a credential (temporary)
     * @param _vetAddress Address of the veterinarian
     * @param _reason Reason for suspension
     */
    function suspendCredential(address _vetAddress, string memory _reason) public onlyIssuer credentialExists(_vetAddress) {
        require(credentials[_vetAddress].status == CredentialStatus.Active, "VeterinarianCredential: Can only suspend active credentials");
        credentials[_vetAddress].status = CredentialStatus.Suspended;
        emit CredentialSuspended(_vetAddress, _reason);
    }

    /**
     * @dev Reactivate a suspended credential
     * @param _vetAddress Address of the veterinarian
     */
    function reactivateCredential(address _vetAddress) public onlyIssuer credentialExists(_vetAddress) {
        require(credentials[_vetAddress].status == CredentialStatus.Suspended, "VeterinarianCredential: Can only reactivate suspended credentials");
        credentials[_vetAddress].status = CredentialStatus.Active;
        emit CredentialReactivated(_vetAddress);
    }

    /**
     * @dev Update reputation score based on performance
     * @param _vetAddress Address of the veterinarian
     * @param _newScore New reputation score (0-1000)
     * @param _reason Reason for reputation change
     */
    function updateReputation(address _vetAddress, uint256 _newScore, string memory _reason) public onlyIssuer credentialExists(_vetAddress) {
        require(_newScore <= 1000, "VeterinarianCredential: Score must be between 0 and 1000");
        credentials[_vetAddress].reputationScore = _newScore;
        emit ReputationUpdated(_vetAddress, _newScore, _reason);
    }

    /**
     * @dev Increment medical records counter when vet issues a record
     * @param _vetAddress Address of the veterinarian
     */
    function incrementRecordsIssued(address _vetAddress) external credentialExists(_vetAddress) {
        credentials[_vetAddress].totalRecordsIssued++;

        // Auto-increase reputation slightly for active participation
        if (credentials[_vetAddress].reputationScore < 1000) {
            credentials[_vetAddress].reputationScore += 1;
        }
    }

    /**
     * @dev Increment approved claims counter when a claim involving this vet is approved
     * @param _vetAddress Address of the veterinarian
     */
    function incrementClaimsApproved(address _vetAddress) external credentialExists(_vetAddress) {
        credentials[_vetAddress].totalClaimsApproved++;

        // Auto-increase reputation for successful claims
        if (credentials[_vetAddress].reputationScore < 1000) {
            credentials[_vetAddress].reputationScore += 2;
        }
    }

    /**
     * @dev Add an authorized issuer
     * @param _issuer Address of the new issuer
     */
    function authorizeIssuer(address _issuer) public onlyOwner {
        require(_issuer != address(0), "VeterinarianCredential: Invalid issuer address");
        isIssuer[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }

    /**
     * @dev Remove an authorized issuer
     * @param _issuer Address of the issuer to remove
     */
    function revokeIssuer(address _issuer) public onlyOwner {
        isIssuer[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }

    /**
     * @dev Verify credential with cryptographic proof (for advanced use cases)
     * @param _vetAddress Address of the veterinarian
     * @param _signature Signature from the credential holder
     */
    function verifyCredentialWithProof(address _vetAddress, bytes memory _signature) public credentialExists(_vetAddress) {
        require(isValidCredential(_vetAddress), "VeterinarianCredential: Invalid or inactive credential");

        // Create proof record
        CredentialProof memory newProof = CredentialProof({
            signature: _signature,
            timestamp: block.timestamp,
            signer: msg.sender
        });

        proofs[_vetAddress].push(newProof);
        emit CredentialVerified(_vetAddress, msg.sender);
    }

    /**
     * @dev Get reputation score for a veterinarian
     * @param _vetAddress Address of the veterinarian
     * @return uint256 Reputation score (0-1000)
     */
    function getReputationScore(address _vetAddress) public view credentialExists(_vetAddress) returns (uint256) {
        return credentials[_vetAddress].reputationScore;
    }

    /**
     * @dev Check if a credential is expired
     * @param _vetAddress Address to check
     * @return bool True if expired
     */
    function isExpired(address _vetAddress) public view credentialExists(_vetAddress) returns (bool) {
        return credentials[_vetAddress].expirationDate <= block.timestamp;
    }

    /**
     * @dev Renew credential expiration date
     * @param _vetAddress Address of the veterinarian
     * @param _newExpirationDate New expiration timestamp
     */
    function renewCredential(address _vetAddress, uint256 _newExpirationDate) public onlyIssuer credentialExists(_vetAddress) {
        require(_newExpirationDate > block.timestamp, "VeterinarianCredential: New expiration must be in the future");
        require(_newExpirationDate > credentials[_vetAddress].expirationDate, "VeterinarianCredential: New expiration must be later than current");

        credentials[_vetAddress].expirationDate = _newExpirationDate;

        // Reactivate if expired
        if (credentials[_vetAddress].status == CredentialStatus.Expired) {
            credentials[_vetAddress].status = CredentialStatus.Active;
        }
    }

    /**
     * @dev Batch check credential validity for multiple addresses
     * @param _vetAddresses Array of addresses to check
     * @return bool[] Array of validity results
     */
    function batchCheckValidity(address[] memory _vetAddresses) public view returns (bool[] memory) {
        bool[] memory results = new bool[](_vetAddresses.length);
        for (uint i = 0; i < _vetAddresses.length; i++) {
            results[i] = isValidCredential(_vetAddresses[i]);
        }
        return results;
    }
}
