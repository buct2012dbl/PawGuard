// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PetIdentity
 * @dev Manages decentralized identities (DIDs) for pets and their owners
 * @notice This contract creates a bridge between physical pets and their digital identities
 */
contract PetIdentity is Ownable {

    // Identity verification level
    enum VerificationLevel { Unverified, Basic, Enhanced, Premium }

    // Owner identity structure
    struct OwnerIdentity {
        string did;                     // Decentralized Identifier (DID) for the owner
        address ownerAddress;           // Ethereum address of the owner
        string identityIPFSHash;        // IPFS hash containing KYC/identity details (encrypted)
        VerificationLevel verificationLevel;
        uint256 registrationDate;       // When the identity was registered
        bool isActive;                  // Whether identity is active
        address[] authorizedProxies;    // Addresses that can act on behalf of owner
        uint256 reputationScore;        // Owner reputation (0-1000)
    }

    // Pet DID structure (extends the NFT with identity features)
    struct PetDID {
        string did;                     // Decentralized Identifier for the pet
        uint256 petNFTId;               // Reference to PetNFT token ID
        address owner;                  // Current owner address
        string microchipId;             // Physical microchip ID (hashed for privacy)
        string speciesBreed;            // Species and breed info
        uint256 birthDate;              // Birth date timestamp
        string petIdentityIPFSHash;     // IPFS hash with additional identity data
        bool isRegistered;              // Whether pet is registered
        uint256 registrationDate;       // Registration timestamp
    }

    // Cross-chain identity linkage (for future multi-chain support)
    struct CrossChainIdentity {
        string chainId;                 // Chain identifier (e.g., "ethereum", "polygon")
        address contractAddress;        // Contract address on other chain
        string externalDID;             // DID on the external chain
        bool isVerified;                // Whether the cross-chain link is verified
    }

    // Mappings
    mapping(address => OwnerIdentity) public ownerIdentities;
    mapping(string => address) public ownerDIDToAddress;
    mapping(uint256 => PetDID) public petDIDs;                         // petNFTId => PetDID
    mapping(string => uint256) public petDIDToNFTId;                   // DID => NFT ID
    mapping(string => uint256) public microchipToPetId;                // Microchip => NFT ID
    mapping(address => uint256[]) public ownerToPets;                  // Owner => Pet IDs
    mapping(address => CrossChainIdentity[]) public crossChainLinks;   // Cross-chain identity links

    // Authorized identity verifiers (can upgrade verification levels)
    mapping(address => bool) public isVerifier;

    // Events
    event OwnerIdentityRegistered(address indexed owner, string did, VerificationLevel level);
    event OwnerIdentityVerified(address indexed owner, VerificationLevel newLevel);
    event PetDIDCreated(uint256 indexed petNFTId, string petDID, address indexed owner);
    event PetOwnershipTransferred(uint256 indexed petNFTId, address indexed from, address indexed to);
    event ProxyAuthorized(address indexed owner, address indexed proxy);
    event ProxyRevoked(address indexed owner, address indexed proxy);
    event CrossChainLinkAdded(address indexed owner, string chainId, string externalDID);
    event ReputationUpdated(address indexed owner, uint256 newScore);
    event MicrochipLinked(uint256 indexed petNFTId, string microchipId);

    constructor() Ownable(msg.sender) {
        isVerifier[msg.sender] = true;
    }

    /**
     * @dev Register a new owner identity
     * @param _did Decentralized Identifier for the owner
     * @param _identityIPFSHash IPFS hash with identity details
     */
    function registerOwnerIdentity(
        string memory _did,
        string memory _identityIPFSHash
    ) public {
        require(ownerIdentities[msg.sender].ownerAddress == address(0), "PetIdentity: Identity already registered");
        require(ownerDIDToAddress[_did] == address(0), "PetIdentity: DID already exists");
        require(bytes(_did).length > 0, "PetIdentity: DID cannot be empty");

        ownerIdentities[msg.sender] = OwnerIdentity({
            did: _did,
            ownerAddress: msg.sender,
            identityIPFSHash: _identityIPFSHash,
            verificationLevel: VerificationLevel.Unverified,
            registrationDate: block.timestamp,
            isActive: true,
            authorizedProxies: new address[](0),
            reputationScore: 500  // Start with neutral reputation
        });

        ownerDIDToAddress[_did] = msg.sender;

        emit OwnerIdentityRegistered(msg.sender, _did, VerificationLevel.Unverified);
    }

    /**
     * @dev Verify an owner's identity (upgrade verification level)
     * @param _ownerAddress Address of the owner to verify
     * @param _newLevel New verification level
     */
    function verifyOwnerIdentity(address _ownerAddress, VerificationLevel _newLevel) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "PetIdentity: Not authorized to verify");
        require(ownerIdentities[_ownerAddress].ownerAddress != address(0), "PetIdentity: Owner identity not found");

        ownerIdentities[_ownerAddress].verificationLevel = _newLevel;
        emit OwnerIdentityVerified(_ownerAddress, _newLevel);
    }

    /**
     * @dev Create a DID for a pet (links to PetNFT)
     * @param _petDID Decentralized Identifier for the pet
     * @param _petNFTId Pet NFT token ID
     * @param _microchipId Physical microchip ID (hashed)
     * @param _speciesBreed Species and breed
     * @param _birthDate Birth date timestamp
     * @param _petIdentityIPFSHash IPFS hash with pet details
     */
    function createPetDID(
        string memory _petDID,
        uint256 _petNFTId,
        string memory _microchipId,
        string memory _speciesBreed,
        uint256 _birthDate,
        string memory _petIdentityIPFSHash
    ) public {
        require(petDIDs[_petNFTId].isRegistered == false, "PetIdentity: Pet DID already exists");
        require(petDIDToNFTId[_petDID] == 0, "PetIdentity: DID already registered");
        require(bytes(_petDID).length > 0, "PetIdentity: Pet DID cannot be empty");

        petDIDs[_petNFTId] = PetDID({
            did: _petDID,
            petNFTId: _petNFTId,
            owner: msg.sender,
            microchipId: _microchipId,
            speciesBreed: _speciesBreed,
            birthDate: _birthDate,
            petIdentityIPFSHash: _petIdentityIPFSHash,
            isRegistered: true,
            registrationDate: block.timestamp
        });

        petDIDToNFTId[_petDID] = _petNFTId;
        ownerToPets[msg.sender].push(_petNFTId);

        // Link microchip if provided
        if (bytes(_microchipId).length > 0) {
            microchipToPetId[_microchipId] = _petNFTId;
            emit MicrochipLinked(_petNFTId, _microchipId);
        }

        emit PetDIDCreated(_petNFTId, _petDID, msg.sender);
    }

    /**
     * @dev Transfer pet ownership (called when PetNFT is transferred)
     * @param _petNFTId Pet NFT token ID
     * @param _newOwner New owner address
     */
    function transferPetOwnership(uint256 _petNFTId, address _newOwner) public {
        require(petDIDs[_petNFTId].isRegistered, "PetIdentity: Pet not registered");
        require(petDIDs[_petNFTId].owner == msg.sender, "PetIdentity: Only current owner can transfer");
        require(_newOwner != address(0), "PetIdentity: Invalid new owner address");

        address oldOwner = petDIDs[_petNFTId].owner;

        // Remove from old owner's pets
        _removeFromOwnerPets(oldOwner, _petNFTId);

        // Add to new owner's pets
        petDIDs[_petNFTId].owner = _newOwner;
        ownerToPets[_newOwner].push(_petNFTId);

        emit PetOwnershipTransferred(_petNFTId, oldOwner, _newOwner);
    }

    /**
     * @dev Authorize a proxy address to act on behalf of owner
     * @param _proxy Address to authorize
     */
    function authorizeProxy(address _proxy) public {
        require(ownerIdentities[msg.sender].ownerAddress != address(0), "PetIdentity: Owner identity not found");
        require(_proxy != address(0), "PetIdentity: Invalid proxy address");
        require(_proxy != msg.sender, "PetIdentity: Cannot authorize self as proxy");

        ownerIdentities[msg.sender].authorizedProxies.push(_proxy);
        emit ProxyAuthorized(msg.sender, _proxy);
    }

    /**
     * @dev Revoke proxy authorization
     * @param _proxy Address to revoke
     */
    function revokeProxy(address _proxy) public {
        require(ownerIdentities[msg.sender].ownerAddress != address(0), "PetIdentity: Owner identity not found");

        address[] storage proxies = ownerIdentities[msg.sender].authorizedProxies;
        for (uint i = 0; i < proxies.length; i++) {
            if (proxies[i] == _proxy) {
                proxies[i] = proxies[proxies.length - 1];
                proxies.pop();
                emit ProxyRevoked(msg.sender, _proxy);
                return;
            }
        }
        revert("PetIdentity: Proxy not found");
    }

    /**
     * @dev Check if an address is an authorized proxy for an owner
     * @param _owner Owner address
     * @param _proxy Proxy address to check
     * @return bool True if authorized
     */
    function isAuthorizedProxy(address _owner, address _proxy) public view returns (bool) {
        address[] memory proxies = ownerIdentities[_owner].authorizedProxies;
        for (uint i = 0; i < proxies.length; i++) {
            if (proxies[i] == _proxy) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Add cross-chain identity link
     * @param _chainId Chain identifier
     * @param _contractAddress Contract address on other chain
     * @param _externalDID DID on external chain
     */
    function addCrossChainLink(
        string memory _chainId,
        address _contractAddress,
        string memory _externalDID
    ) public {
        require(ownerIdentities[msg.sender].ownerAddress != address(0), "PetIdentity: Owner identity not found");

        CrossChainIdentity memory newLink = CrossChainIdentity({
            chainId: _chainId,
            contractAddress: _contractAddress,
            externalDID: _externalDID,
            isVerified: false
        });

        crossChainLinks[msg.sender].push(newLink);
        emit CrossChainLinkAdded(msg.sender, _chainId, _externalDID);
    }

    /**
     * @dev Update owner reputation score
     * @param _ownerAddress Owner address
     * @param _newScore New reputation score (0-1000)
     */
    function updateOwnerReputation(address _ownerAddress, uint256 _newScore) public {
        require(isVerifier[msg.sender] || msg.sender == owner(), "PetIdentity: Not authorized");
        require(ownerIdentities[_ownerAddress].ownerAddress != address(0), "PetIdentity: Owner identity not found");
        require(_newScore <= 1000, "PetIdentity: Score must be 0-1000");

        ownerIdentities[_ownerAddress].reputationScore = _newScore;
        emit ReputationUpdated(_ownerAddress, _newScore);
    }

    /**
     * @dev Get pet DID by NFT ID
     * @param _petNFTId Pet NFT token ID
     * @return PetDID struct
     */
    function getPetDID(uint256 _petNFTId) public view returns (PetDID memory) {
        require(petDIDs[_petNFTId].isRegistered, "PetIdentity: Pet not registered");
        return petDIDs[_petNFTId];
    }

    /**
     * @dev Get owner identity
     * @param _ownerAddress Owner address
     * @return OwnerIdentity struct
     */
    function getOwnerIdentity(address _ownerAddress) public view returns (OwnerIdentity memory) {
        require(ownerIdentities[_ownerAddress].ownerAddress != address(0), "PetIdentity: Owner identity not found");
        return ownerIdentities[_ownerAddress];
    }

    /**
     * @dev Get all pets owned by an address
     * @param _ownerAddress Owner address
     * @return uint256[] Array of pet NFT IDs
     */
    function getOwnerPets(address _ownerAddress) public view returns (uint256[] memory) {
        return ownerToPets[_ownerAddress];
    }

    /**
     * @dev Look up pet by microchip ID
     * @param _microchipId Microchip identifier
     * @return uint256 Pet NFT ID
     */
    function getPetByMicrochip(string memory _microchipId) public view returns (uint256) {
        uint256 petId = microchipToPetId[_microchipId];
        require(petId != 0, "PetIdentity: Microchip not registered");
        return petId;
    }

    /**
     * @dev Check if owner has sufficient verification level
     * @param _ownerAddress Owner address
     * @param _requiredLevel Required verification level
     * @return bool True if owner meets requirement
     */
    function hasVerificationLevel(address _ownerAddress, VerificationLevel _requiredLevel) public view returns (bool) {
        if (ownerIdentities[_ownerAddress].ownerAddress == address(0)) return false;
        return ownerIdentities[_ownerAddress].verificationLevel >= _requiredLevel;
    }

    /**
     * @dev Authorize an identity verifier
     * @param _verifier Address to authorize
     */
    function authorizeVerifier(address _verifier) public onlyOwner {
        require(_verifier != address(0), "PetIdentity: Invalid verifier address");
        isVerifier[_verifier] = true;
    }

    /**
     * @dev Revoke identity verifier
     * @param _verifier Address to revoke
     */
    function revokeVerifier(address _verifier) public onlyOwner {
        isVerifier[_verifier] = false;
    }

    /**
     * @dev Internal function to remove pet from owner's list
     */
    function _removeFromOwnerPets(address _owner, uint256 _petNFTId) internal {
        uint256[] storage pets = ownerToPets[_owner];
        for (uint i = 0; i < pets.length; i++) {
            if (pets[i] == _petNFTId) {
                pets[i] = pets[pets.length - 1];
                pets.pop();
                return;
            }
        }
    }

    /**
     * @dev Deactivate owner identity
     */
    function deactivateIdentity() public {
        require(ownerIdentities[msg.sender].ownerAddress != address(0), "PetIdentity: Owner identity not found");
        ownerIdentities[msg.sender].isActive = false;
    }

    /**
     * @dev Reactivate owner identity
     */
    function reactivateIdentity() public {
        require(ownerIdentities[msg.sender].ownerAddress != address(0), "PetIdentity: Owner identity not found");
        ownerIdentities[msg.sender].isActive = true;
    }
}
