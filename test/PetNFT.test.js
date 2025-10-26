import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PetNFT", function () {
    let PetNFT;
    let petNFT;
    let owner;
    let addr1; // Represents a pet owner
    let addr2; // Represents another pet owner/user
    let vet1;  // Represents an authorized veterinarian
    let vet2;  // Represents another veterinarian
    let addrs;

    beforeEach(async function () {
        PetNFT = await ethers.getContractFactory("PetNFT");
        [owner, addr1, addr2, vet1, vet2, ...addrs] = await ethers.getSigners();

        petNFT = await PetNFT.deploy();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await petNFT.owner()).to.equal(owner.address);
        });
    });

    describe("Pet Registration", function () {
        it("Should allow the owner to register a new pet", async function () {
            await expect(petNFT.connect(owner).registerPet(addr1.address, "ipfs://basicinfo1"))
                .to.emit(petNFT, "PetRegistered")
                .withArgs(1, addr1.address, "ipfs://basicinfo1");

            const petRecord = await petNFT.petRecords(1);
            expect(petRecord.owner).to.equal(addr1.address);
            expect(petRecord.basicInfoIPFSHash).to.equal("ipfs://basicinfo1");
        });

        it("Should not allow non-owners to register a pet", async function () {
            await expect(petNFT.connect(addr1).registerPet(addr1.address, "ipfs://basicinfo2"))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should increment pet ID counter", async function () {
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://basicinfo1");
            await petNFT.connect(owner).registerPet(addr2.address, "ipfs://basicinfo2");
            const petIdCounter = await petNFT._petIdCounter();
            expect(petIdCounter.current).to.equal(2);
        });
    });

    describe("Veterinarian Authorization", function () {
        beforeEach(async function () {
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://basicinfo1");
        });

        it("Should allow pet owner to authorize a vet", async function () {
            await expect(petNFT.connect(addr1).authorizeVet(1, vet1.address))
                .to.emit(petNFT, "VetAuthorized")
                .withArgs(1, vet1.address, addr1.address);
            expect(await petNFT.isAuthorizedVet(1, vet1.address)).to.be.true;
        });

        it("Should not allow non-owners to authorize a vet", async function () {
            await expect(petNFT.connect(addr2).authorizeVet(1, vet1.address))
                .to.be.revertedWith("PetNFT: Only pet owner can authorize vets");
        });

        it("Should not authorize an already authorized vet", async function () {
            await petNFT.connect(addr1).authorizeVet(1, vet1.address);
            await expect(petNFT.connect(addr1).authorizeVet(1, vet1.address))
                .to.not.be.reverted; // Function should return, not revert
        });

        it("Should allow pet owner to deauthorize a vet", async function () {
            await petNFT.connect(addr1).authorizeVet(1, vet1.address);
            await expect(petNFT.connect(addr1).deauthorizeVet(1, vet1.address))
                .to.emit(petNFT, "VetDeauthorized")
                .withArgs(1, vet1.address, addr1.address);
            expect(await petNFT.isAuthorizedVet(1, vet1.address)).to.be.false;
        });

        it("Should not allow non-owners to deauthorize a vet", async function () {
            await expect(petNFT.connect(addr2).deauthorizeVet(1, vet1.address))
                .to.be.revertedWith("PetNFT: Only pet owner can deauthorize vets");
        });

        it("Should revert if deauthorizing a non-existent vet", async function () {
            await expect(petNFT.connect(addr1).deauthorizeVet(1, vet2.address))
                .to.be.revertedWith("PetNFT: Vet not found for deauthorization");
        });
    });

    describe("Medical Records", function () {
        beforeEach(async function () {
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://basicinfo1");
            await petNFT.connect(addr1).authorizeVet(1, vet1.address);
        });

        it("Should allow authorized vet to add a medical record", async function () {
            await expect(petNFT.connect(vet1).addMedicalRecord(1, "ipfs://medicalrecord1"))
                .to.emit(petNFT, "MedicalRecordAdded")
                .withArgs(1, vet1.address, "ipfs://medicalrecord1", (await ethers.provider.getBlock("latest")).timestamp);

            const medicalHistoryLength = await petNFT.getMedicalHistoryLength(1);
            expect(medicalHistoryLength).to.equal(1);

            const record = await petNFT.getMedicalRecord(1, 0);
            expect(record.vetAddress).to.equal(vet1.address);
            expect(record.recordIPFSHash).to.equal("ipfs://medicalrecord1");
            expect(record.isValid).to.be.true;
        });

        it("Should not allow unauthorized addresses to add a medical record", async function () {
            await expect(petNFT.connect(addr1).addMedicalRecord(1, "ipfs://medicalrecord2"))
                .to.be.revertedWith("PetNFT: Caller is not an authorized vet for this pet");
        });

        it("Should not allow empty IPFS hash for medical record", async function () {
            await expect(petNFT.connect(vet1).addMedicalRecord(1, ""))
                .to.be.revertedWith("PetNFT: IPFS hash cannot be empty");
        });

        it("Should return correct medical history length", async function () {
            await petNFT.connect(vet1).addMedicalRecord(1, "ipfs://med1");
            await petNFT.connect(vet1).addMedicalRecord(1, "ipfs://med2");
            expect(await petNFT.getMedicalHistoryLength(1)).to.equal(2);
        });

        it("Should return correct medical record at index", async function () {
            await petNFT.connect(vet1).addMedicalRecord(1, "ipfs://med1");
            const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
            await petNFT.connect(vet1).addMedicalRecord(1, "ipfs://med2");

            const record = await petNFT.getMedicalRecord(1, 0);
            expect(record.recordIPFSHash).to.equal("ipfs://med1");

            const secondRecord = await petNFT.getMedicalRecord(1, 1);
            expect(secondRecord.recordIPFSHash).to.equal("ipfs://med2");
        });
    });

    describe("Breeding Records", function () {
        beforeEach(async function () {
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://parent1_info"); // Pet ID 1
            await petNFT.connect(owner).registerPet(addr2.address, "ipfs://parent2_info"); // Pet ID 2
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://offspring1_info"); // Pet ID 3
            await petNFT.connect(owner).registerPet(addr2.address, "ipfs://offspring2_info"); // Pet ID 4
        });

        it("Should allow pet owner to add a breeding record for their pet", async function () {
            const sireId = 1;
            const damId = 2;
            const birthTimestamp = Math.floor(Date.now() / 1000);
            const offspringIds = [3, 4];

            await expect(petNFT.connect(addr1).addBreedingRecord(1, sireId, damId, birthTimestamp, offspringIds))
                .to.emit(petNFT, "BreedingRecordAdded")
                .withArgs(1, sireId, damId, birthTimestamp);

            const breedingHistoryLength = await petNFT.getBreedingHistoryLength(1);
            expect(breedingHistoryLength).to.equal(1);

            const record = await petNFT.getBreedingRecord(1, 0);
            expect(record.sirePetId).to.equal(sireId);
            expect(record.damPetId).to.equal(damId);
            expect(record.birthTimestamp).to.equal(birthTimestamp);
            expect(record.offspringPetIds.map(id => id.toNumber())).to.deep.equal(offspringIds);
        });

        it("Should not allow non-owners to add a breeding record", async function () {
            const sireId = 1;
            const damId = 2;
            const birthTimestamp = Math.floor(Date.now() / 1000);
            const offspringIds = [3, 4];

            await expect(petNFT.connect(addr2).addBreedingRecord(1, sireId, damId, birthTimestamp, offspringIds))
                .to.be.revertedWith("PetNFT: Only pet owner can add breeding records");
        });

        it("Should return correct breeding history length", async function () {
            const sireId1 = 1; const damId1 = 2; const birthTimestamp1 = Math.floor(Date.now() / 1000);
            const sireId2 = 1; const damId2 = 2; const birthTimestamp2 = birthTimestamp1 + 1000;

            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://pet5"); // Pet ID 5
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://pet6"); // Pet ID 6

            await petNFT.connect(addr1).addBreedingRecord(1, sireId1, damId1, birthTimestamp1, []);
            await petNFT.connect(addr1).addBreedingRecord(1, sireId2, damId2, birthTimestamp2, []);

            expect(await petNFT.getBreedingHistoryLength(1)).to.equal(2);
        });

        it("Should return correct breeding record at index", async function () {
            const sireId1 = 1; const damId1 = 2; const birthTimestamp1 = Math.floor(Date.now() / 1000);
            const sireId2 = 1; const damId2 = 2; const birthTimestamp2 = birthTimestamp1 + 1000;

            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://pet5"); // Pet ID 5
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://pet6"); // Pet ID 6

            await petNFT.connect(addr1).addBreedingRecord(1, sireId1, damId1, birthTimestamp1, [5]);
            await petNFT.connect(addr1).addBreedingRecord(1, sireId2, damId2, birthTimestamp2, [6]);

            const record1 = await petNFT.getBreedingRecord(1, 0);
            expect(record1.sirePetId).to.equal(sireId1);
            expect(record1.offspringPetIds.map(id => id.toNumber())).to.deep.equal([5]);

            const record2 = await petNFT.getBreedingRecord(1, 1);
            expect(record2.sirePetId).to.equal(sireId2);
            expect(record2.offspringPetIds.map(id => id.toNumber())).to.deep.equal([6]);
        });
    });

    describe("Ownership Transfer", function () {
        beforeEach(async function () {
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://basicinfo1");
            await petNFT.connect(addr1).authorizeVet(1, vet1.address);
            await petNFT.connect(vet1).addMedicalRecord(1, "ipfs://medicalrecord1");
        });

        it("Should update pet owner on ERC1155 transfer", async function () {
            // Transfer the NFT from addr1 to addr2
            await expect(petNFT.connect(addr1).safeTransferFrom(addr1.address, addr2.address, 1, 1, "0x"))
                .to.emit(petNFT, "PetTransferred")
                .withArgs(1, addr1.address, addr2.address);

            const petRecord = await petNFT.petRecords(1);
            expect(petRecord.owner).to.equal(addr2.address);
            expect(await petNFT.balanceOf(addr1.address, 1)).to.equal(0);
            expect(await petNFT.balanceOf(addr2.address, 1)).to.equal(1);
        });

        it("Should not allow transfer if caller is not the owner of the NFT", async function () {
            await expect(petNFT.connect(addr2).safeTransferFrom(addr1.address, addr2.address, 1, 1, "0x"))
                .to.be.revertedWith("ERC1155: caller is not token owner nor approved");
        });

        it("Should retain medical history after transfer", async function () {
            await petNFT.connect(addr1).safeTransferFrom(addr1.address, addr2.address, 1, 1, "0x");
            const medicalHistoryLength = await petNFT.getMedicalHistoryLength(1);
            expect(medicalHistoryLength).to.equal(1);
            const record = await petNFT.getMedicalRecord(1, 0);
            expect(record.vetAddress).to.equal(vet1.address);
        });
    });

    describe("URI Management", function () {
        it("Should return the correct URI for a pet NFT", async function () {
            await petNFT.connect(owner).registerPet(addr1.address, "ipfs://basicinfo1");
            // Default URI is set in constructor and can be updated by owner
            expect(await petNFT.uri(1)).to.equal("https://pawguard.com/petnft/1/metadata.json");
        });

        it("Should allow owner to set base URI", async function () {
            const newBaseURI = "https://new.pawguard.com/data/";
            await petNFT.connect(owner).setBaseURI(newBaseURI);
            expect(await petNFT.uri(1)).to.equal("https://new.pawguard.com/data/1");
        });

        it("Should not allow non-owner to set base URI", async function () {
            const newBaseURI = "https://bad.pawguard.com/data/";
            await expect(petNFT.connect(addr1).setBaseURI(newBaseURI))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
