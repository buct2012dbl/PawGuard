// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./VeterinarianCredential.sol";

contract PetNFT is ERC1155, Ownable {

    // Reference to VeterinarianCredential contract
    VeterinarianCredential public vetCredentialContract;

    string private _baseTokenURI;

    // Structs for Pet and Medical Records
    struct MedicalRecord {
        address vetAddress;         // Veterinarian's address who signed the record
        string recordIPFSHash;      // IPFS hash of detailed medical record
        uint256 timestamp;          // Timestamp of the record
        bool isValid;               // Flag to indicate if the record is valid
    }

    struct BreedingRecord {
        uint256 sirePetId;          // ID of the father pet (sire)
        uint256 damPetId;           // ID of the mother pet (dam)
        uint256 birthTimestamp;     // Timestamp of birth
        uint256[] offspringPetIds;  // IDs of the offspring pets
    }

    struct PetRecord {
        address owner;                      // Current owner of the PetNFT
        string basicInfoIPFSHash;           // IPFS hash of basic pet information (breed, birthdate, etc.)
        address[] authorizedVets;           // List of authorized veterinarians for this pet
        MedicalRecord[] medicalHistory;     // Array of medical records
        BreedingRecord[] breedingHistory;   // Array of breeding records
    }

    // Mapping from pet ID (NFT ID) to PetRecord
    mapping(uint256 => PetRecord) public petRecords;

    // Counter for unique Pet IDs
    uint256 private _petIdCounter;

    // Events
    event PetRegistered(uint256 indexed petId, address indexed owner, string basicInfoIPFSHash);
    event MedicalRecordAdded(uint256 indexed petId, address indexed vetAddress, string recordIPFSHash, uint256 timestamp);
    event VetAuthorized(uint256 indexed petId, address indexed vetAddress, address indexed owner);
    event VetDeauthorized(uint256 indexed petId, address indexed vetAddress, address indexed owner);
    event PetTransferred(uint256 indexed petId, address indexed from, address indexed to);
    event BreedingRecordAdded(uint256 indexed petId, uint256 sirePetId, uint256 damPetId, uint256 birthTimestamp);


    // Modifier to restrict functions to authorized veterinarians
    modifier onlyAuthorizedVet(uint256 _petId) {
        bool isAuthorized = false;
        for (uint i = 0; i < petRecords[_petId].authorizedVets.length; i++) {
            if (petRecords[_petId].authorizedVets[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "PetNFT: Caller is not an authorized vet for this pet");
        _;
    }

    constructor(address _vetCredentialAddress) ERC1155("") Ownable(msg.sender) {
        // Initialize with empty URI, will be set via uri() function
        _baseTokenURI = "https://pawguard.com/api/pet/";
        vetCredentialContract = VeterinarianCredential(_vetCredentialAddress);
    }

    // Function to set the base URI for the NFT metadata
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        _baseTokenURI = _newBaseURI;
    }

    // Function to update VeterinarianCredential contract address
    function setVetCredentialContract(address _newVetCredentialAddress) public onlyOwner {
        require(_newVetCredentialAddress != address(0), "PetNFT: Invalid contract address");
        vetCredentialContract = VeterinarianCredential(_newVetCredentialAddress);
    }

    // Function to register a new pet and mint its NFT
    function registerPet(address _owner, string memory _basicInfoIPFSHash) public onlyOwner returns (uint256) {
        _petIdCounter++;
        uint256 newPetId = _petIdCounter;

        // Mint a new ERC-1155 token for the pet
        _mint(_owner, newPetId, 1, "");

        // Initialize PetRecord
        petRecords[newPetId].owner = _owner;
        petRecords[newPetId].basicInfoIPFSHash = _basicInfoIPFSHash;

        emit PetRegistered(newPetId, _owner, _basicInfoIPFSHash);
        return newPetId;
    }

    // Function to authorize a veterinarian for a specific pet
    function authorizeVet(uint256 _petId, address _vetAddress) public {
        require(msg.sender == petRecords[_petId].owner, "PetNFT: Only pet owner can authorize vets");
        require(_vetAddress != address(0), "PetNFT: Invalid vet address");

        // Verify the vet has valid credentials
        require(
            vetCredentialContract.isValidCredential(_vetAddress),
            "PetNFT: Vet does not have valid credentials"
        );

        // Check if vet is already authorized
        for (uint i = 0; i < petRecords[_petId].authorizedVets.length; i++) {
            if (petRecords[_petId].authorizedVets[i] == _vetAddress) {
                return; // Vet is already authorized, do nothing.
            }
        }

        petRecords[_petId].authorizedVets.push(_vetAddress);
        emit VetAuthorized(_petId, _vetAddress, msg.sender);
    }

    // Function to deauthorize a veterinarian for a specific pet
    function deauthorizeVet(uint256 _petId, address _vetAddress) public {
        require(msg.sender == petRecords[_petId].owner, "PetNFT: Only pet owner can deauthorize vets");

        bool found = false;
        for (uint i = 0; i < petRecords[_petId].authorizedVets.length; i++) {
            if (petRecords[_petId].authorizedVets[i] == _vetAddress) {
                // Remove the vet by swapping with last element and popping
                petRecords[_petId].authorizedVets[i] = petRecords[_petId].authorizedVets[petRecords[_petId].authorizedVets.length - 1];
                petRecords[_petId].authorizedVets.pop();
                found = true;
                break;
            }
        }
        require(found, "PetNFT: Vet not found for deauthorization");
        emit VetDeauthorized(_petId, _vetAddress, msg.sender);
    }

    // Function for an authorized veterinarian to add a medical record
    function addMedicalRecord(uint256 _petId, string memory _recordIPFSHash)
        public
        onlyAuthorizedVet(_petId)
    {
        require(bytes(_recordIPFSHash).length > 0, "PetNFT: IPFS hash cannot be empty");

        // Double-check vet credentials are still valid
        require(
            vetCredentialContract.isValidCredential(msg.sender),
            "PetNFT: Vet credentials expired or revoked"
        );

        MedicalRecord memory newRecord = MedicalRecord({
            vetAddress: msg.sender,
            recordIPFSHash: _recordIPFSHash,
            timestamp: block.timestamp,
            isValid: true
        });

        petRecords[_petId].medicalHistory.push(newRecord);

        // Notify VeterinarianCredential contract to update vet's stats
        vetCredentialContract.incrementRecordsIssued(msg.sender);

        emit MedicalRecordAdded(_petId, msg.sender, _recordIPFSHash, block.timestamp);
    }

    // Function for the owner to add a breeding record
    function addBreedingRecord(
        uint256 _petId,
        uint256 _sirePetId,
        uint256 _damPetId,
        uint256 _birthTimestamp,
        uint256[] memory _offspringPetIds
    ) public {
        require(msg.sender == petRecords[_petId].owner, "PetNFT: Only pet owner can add breeding records");
        require(_petIdCounter >= _sirePetId && _sirePetId > 0, "PetNFT: Invalid sire pet ID");
        require(_petIdCounter >= _damPetId && _damPetId > 0, "PetNFT: Invalid dam pet ID");

        BreedingRecord memory newBreedingRecord = BreedingRecord({
            sirePetId: _sirePetId,
            damPetId: _damPetId,
            birthTimestamp: _birthTimestamp,
            offspringPetIds: _offspringPetIds
        });

        petRecords[_petId].breedingHistory.push(newBreedingRecord);
        emit BreedingRecordAdded(_petId, _sirePetId, _damPetId, _birthTimestamp);
    }

    // Override the ERC1155 `_update` hook to update pet ownership
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        super._update(from, to, ids, values);

        if (from != address(0) && to != address(0)) { // This is a transfer, not minting/burning
            for (uint i = 0; i < ids.length; i++) {
                require(petRecords[ids[i]].owner == from, "PetNFT: Pet owner mismatch for transfer");
                petRecords[ids[i]].owner = to;
                emit PetTransferred(ids[i], from, to);
            }
        } else if (from == address(0)) { // Minting new tokens
            // Initial owner set during registerPet
        } else if (to == address(0)) { // Burning tokens
            // Handle burning logic if needed (e.g., setting isValid to false, clearing records)
            // For now, we assume NFTs are not burned to maintain health history
        }
    }

    // Function to get a pet's basic information
    function getPetBasicInfo(uint256 _petId) public view returns (address, string memory) {
        return (petRecords[_petId].owner, petRecords[_petId].basicInfoIPFSHash);
    }

    // Function to get a pet's medical history length
    function getMedicalHistoryLength(uint256 _petId) public view returns (uint256) {
        return petRecords[_petId].medicalHistory.length;
    }

    // Function to get a specific medical record
    function getMedicalRecord(uint256 _petId, uint256 _index) public view returns (address, string memory, uint256, bool) {
        require(_index < petRecords[_petId].medicalHistory.length, "PetNFT: Medical record index out of bounds");
        MedicalRecord storage record = petRecords[_petId].medicalHistory[_index];
        return (record.vetAddress, record.recordIPFSHash, record.timestamp, record.isValid);
    }

    // Function to get all authorized vets for a pet
    function getAuthorizedVets(uint256 _petId) public view returns (address[] memory) {
        return petRecords[_petId].authorizedVets;
    }

    // Function to get a pet's breeding history length
    function getBreedingHistoryLength(uint256 _petId) public view returns (uint256) {
        return petRecords[_petId].breedingHistory.length;
    }

    // Function to get a specific breeding record
    function getBreedingRecord(uint256 _petId, uint256 _index) public view returns (
        uint256 sirePetId,
        uint256 damPetId,
        uint256 birthTimestamp,
        uint256[] memory offspringPetIds
    ) {
        require(_index < petRecords[_petId].breedingHistory.length, "PetNFT: Breeding record index out of bounds");
        BreedingRecord storage record = petRecords[_petId].breedingHistory[_index];
        return (
            record.sirePetId,
            record.damPetId,
            record.birthTimestamp,
            record.offspringPetIds
        );
    }

    // Function to check if an address is an authorized vet for a pet
    function isAuthorizedVet(uint256 _petId, address _vetAddress) public view returns (bool) {
        for (uint i = 0; i < petRecords[_petId].authorizedVets.length; i++) {
            if (petRecords[_petId].authorizedVets[i] == _vetAddress) {
                return true;
            }
        }
        return false;
    }

    // The following functions are required by ERC1155 but can be left simple if metadata is off-chain
    function uri(uint256 _tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, Strings.toString(_tokenId)));
    }
}
