const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PawGuard Identity System Integration Tests", function () {
  let veterinarianCredential, petNFT, petIdentity, juryIdentity, pawPool;
  let pawToken, guardToken;
  let owner, vet1, vet2, petOwner1, petOwner2, juror1, juror2, juror3;
  let addrs;

  beforeEach(async function () {
    [owner, vet1, vet2, petOwner1, petOwner2, juror1, juror2, juror3, ...addrs] = await ethers.getSigners();

    // Deploy VeterinarianCredential
    const VeterinarianCredential = await ethers.getContractFactory("VeterinarianCredential");
    veterinarianCredential = await VeterinarianCredential.deploy();
    await veterinarianCredential.deployed();

    // Deploy PetNFT
    const PetNFT = await ethers.getContractFactory("PetNFT");
    petNFT = await PetNFT.deploy(veterinarianCredential.address);
    await petNFT.deployed();

    // Deploy PetIdentity
    const PetIdentity = await ethers.getContractFactory("PetIdentity");
    petIdentity = await PetIdentity.deploy();
    await petIdentity.deployed();

    // Deploy mock tokens
    const PawGuardToken = await ethers.getContractFactory("PawGuardToken");
    pawToken = await PawGuardToken.deploy();
    await pawToken.deployed();

    const GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
    guardToken = await GuardStableCoin.deploy();
    await guardToken.deployed();

    // Deploy JuryIdentity
    const minimumStake = ethers.utils.parseEther("100");
    const JuryIdentity = await ethers.getContractFactory("JuryIdentity");
    juryIdentity = await JuryIdentity.deploy(minimumStake);
    await juryIdentity.deployed();

    // Deploy PawPool
    const PawPool = await ethers.getContractFactory("PawPool");
    pawPool = await PawPool.deploy(
      petNFT.address,
      pawToken.address,
      guardToken.address,
      veterinarianCredential.address,
      juryIdentity.address
    );
    await pawPool.deployed();
  });

  describe("VeterinarianCredential", function () {
    it("Should issue a credential to a veterinarian", async function () {
      const did = "did:pawguard:vet:12345";
      const licenseNumber = "VET-2025-001";
      const ipfsHash = "QmTest123";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year

      await veterinarianCredential.issueCredential(
        vet1.address,
        did,
        licenseNumber,
        ipfsHash,
        expirationDate
      );

      const credential = await veterinarianCredential.getCredential(vet1.address);
      expect(credential.did).to.equal(did);
      expect(credential.licenseNumber).to.equal(licenseNumber);
      expect(credential.vetAddress).to.equal(vet1.address);
    });

    it("Should verify valid credentials", async function () {
      const did = "did:pawguard:vet:12345";
      const licenseNumber = "VET-2025-001";
      const ipfsHash = "QmTest123";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await veterinarianCredential.issueCredential(
        vet1.address,
        did,
        licenseNumber,
        ipfsHash,
        expirationDate
      );

      const isValid = await veterinarianCredential.isValidCredential(vet1.address);
      expect(isValid).to.be.true;
    });

    it("Should revoke a credential", async function () {
      const did = "did:pawguard:vet:12345";
      const licenseNumber = "VET-2025-001";
      const ipfsHash = "QmTest123";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await veterinarianCredential.issueCredential(
        vet1.address,
        did,
        licenseNumber,
        ipfsHash,
        expirationDate
      );

      await veterinarianCredential.revokeCredential(vet1.address, "License revoked");

      const isValid = await veterinarianCredential.isValidCredential(vet1.address);
      expect(isValid).to.be.false;
    });

    it("Should update reputation score", async function () {
      const did = "did:pawguard:vet:12345";
      const licenseNumber = "VET-2025-001";
      const ipfsHash = "QmTest123";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await veterinarianCredential.issueCredential(
        vet1.address,
        did,
        licenseNumber,
        ipfsHash,
        expirationDate
      );

      await veterinarianCredential.updateReputation(vet1.address, 750, "Good performance");

      const reputation = await veterinarianCredential.getReputationScore(vet1.address);
      expect(reputation).to.equal(750);
    });
  });

  describe("PetNFT with VeterinarianCredential Integration", function () {
    beforeEach(async function () {
      // Issue vet credential
      const did = "did:pawguard:vet:12345";
      const licenseNumber = "VET-2025-001";
      const ipfsHash = "QmTest123";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await veterinarianCredential.issueCredential(
        vet1.address,
        did,
        licenseNumber,
        ipfsHash,
        expirationDate
      );
    });

    it("Should only allow credentialed vets to be authorized", async function () {
      // Register a pet
      await petNFT.registerPet(petOwner1.address, "QmPetInfo123");

      // Try to authorize vet1 (has credentials) - should succeed
      await petNFT.connect(petOwner1).authorizeVet(1, vet1.address);

      // Try to authorize vet2 (no credentials) - should fail
      await expect(
        petNFT.connect(petOwner1).authorizeVet(1, vet2.address)
      ).to.be.revertedWith("PetNFT: Vet does not have valid credentials");
    });

    it("Should increment vet records when medical record is added", async function () {
      // Register a pet and authorize vet
      await petNFT.registerPet(petOwner1.address, "QmPetInfo123");
      await petNFT.connect(petOwner1).authorizeVet(1, vet1.address);

      // Vet adds medical record
      await petNFT.connect(vet1).addMedicalRecord(1, "QmMedicalRecord123");

      // Check that vet's record count increased
      const credential = await veterinarianCredential.getCredential(vet1.address);
      expect(credential.totalRecordsIssued).to.equal(1);
    });
  });

  describe("PetIdentity", function () {
    it("Should register owner identity", async function () {
      const did = "did:pawguard:owner:owner1";
      const ipfsHash = "QmOwnerIdentity123";

      await petIdentity.connect(petOwner1).registerOwnerIdentity(did, ipfsHash);

      const identity = await petIdentity.getOwnerIdentity(petOwner1.address);
      expect(identity.did).to.equal(did);
      expect(identity.ownerAddress).to.equal(petOwner1.address);
    });

    it("Should create pet DID", async function () {
      const petDID = "did:pawguard:pet:pet123";
      const petNFTId = 1;
      const microchipId = "CHIP-123456";
      const speciesBreed = "Dog/Golden Retriever";
      const birthDate = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60; // 1 year ago
      const ipfsHash = "QmPetDID123";

      await petIdentity.connect(petOwner1).createPetDID(
        petDID,
        petNFTId,
        microchipId,
        speciesBreed,
        birthDate,
        ipfsHash
      );

      const petDIDData = await petIdentity.getPetDID(petNFTId);
      expect(petDIDData.did).to.equal(petDID);
      expect(petDIDData.microchipId).to.equal(microchipId);
    });

    it("Should lookup pet by microchip", async function () {
      const petDID = "did:pawguard:pet:pet123";
      const petNFTId = 1;
      const microchipId = "CHIP-123456";
      const speciesBreed = "Dog/Golden Retriever";
      const birthDate = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
      const ipfsHash = "QmPetDID123";

      await petIdentity.connect(petOwner1).createPetDID(
        petDID,
        petNFTId,
        microchipId,
        speciesBreed,
        birthDate,
        ipfsHash
      );

      const foundPetId = await petIdentity.getPetByMicrochip(microchipId);
      expect(foundPetId).to.equal(petNFTId);
    });
  });

  describe("JuryIdentity", function () {
    it("Should register jury member", async function () {
      const did = "did:pawguard:juror:juror1";
      const ipfsHash = "QmJurorIdentity123";

      await juryIdentity.connect(juror1).registerJuryMember(did, ipfsHash);

      const member = await juryIdentity.getJuryMember(juror1.address);
      expect(member.did).to.equal(did);
      expect(member.memberAddress).to.equal(juror1.address);
    });

    it("Should perform Sybil check", async function () {
      const did = "did:pawguard:juror:juror1";
      const ipfsHash = "QmJurorIdentity123";

      await juryIdentity.connect(juror1).registerJuryMember(did, ipfsHash);

      const identityHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unique-biometric-data"));
      await juryIdentity.performSybilCheck(juror1.address, identityHash, true);

      const member = await juryIdentity.getJuryMember(juror1.address);
      expect(member.status).to.equal(1); // Verified status
    });

    it("Should check jury eligibility", async function () {
      const did = "did:pawguard:juror:juror1";
      const ipfsHash = "QmJurorIdentity123";

      await juryIdentity.connect(juror1).registerJuryMember(did, ipfsHash);

      const identityHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unique-biometric-data"));
      await juryIdentity.performSybilCheck(juror1.address, identityHash, true);

      // Update stake
      const stake = ethers.utils.parseEther("100");
      await juryIdentity.updateStake(juror1.address, stake);

      const isEligible = await juryIdentity.isEligibleForJury(juror1.address);
      expect(isEligible).to.be.true;
    });

    it("Should track voting consistency", async function () {
      const did = "did:pawguard:juror:juror1";
      const ipfsHash = "QmJurorIdentity123";

      await juryIdentity.connect(juror1).registerJuryMember(did, ipfsHash);

      const identityHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unique-biometric-data"));
      await juryIdentity.performSybilCheck(juror1.address, identityHash, true);

      // Record some votes
      await juryIdentity.recordVote(juror1.address, 1, true);  // Voted with majority
      await juryIdentity.recordVote(juror1.address, 2, true);  // Voted with majority
      await juryIdentity.recordVote(juror1.address, 3, false); // Voted against majority

      const consistency = await juryIdentity.getVotingConsistency(juror1.address);
      expect(consistency).to.equal(66); // 66% (2 out of 3)
    });
  });

  describe("Full Integration Test", function () {
    it("Should complete full insurance claim flow with identity verification", async function () {
      // 1. Issue vet credential
      const vetDID = "did:pawguard:vet:12345";
      const expirationDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      await veterinarianCredential.issueCredential(
        vet1.address,
        vetDID,
        "VET-2025-001",
        "QmVetCredential",
        expirationDate
      );

      // 2. Register pet
      await petNFT.registerPet(petOwner1.address, "QmPetInfo123");

      // 3. Authorize vet
      await petNFT.connect(petOwner1).authorizeVet(1, vet1.address);

      // 4. Register jury members
      for (let i = 0; i < 21; i++) {
        const juror = addrs[i];
        const jurorDID = `did:pawguard:juror:${i}`;
        await juryIdentity.connect(juror).registerJuryMember(jurorDID, "QmJurorIdentity");

        const identityHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`unique-data-${i}`));
        await juryIdentity.performSybilCheck(juror.address, identityHash, true);

        // Give tokens and stake
        await pawToken.transfer(juror.address, ethers.utils.parseEther("1000"));
        await pawToken.connect(juror).approve(pawPool.address, ethers.utils.parseEther("100"));
        await pawPool.connect(juror).stakePaw(ethers.utils.parseEther("100"));
      }

      // 5. Submit claim (requires GUARD tokens)
      await guardToken.transfer(petOwner1.address, ethers.utils.parseEther("1000"));
      await guardToken.connect(petOwner1).approve(pawPool.address, ethers.utils.parseEther("50"));

      await pawPool.connect(petOwner1).submitClaim(
        1,
        vet1.address,
        "QmVetDiagnosis",
        ethers.utils.parseEther("100")
      );

      // 6. Select jury (owner only in test)
      await pawPool.selectJury(1);

      const claim = await pawPool.claims(1);
      expect(claim.status).to.equal(1); // InReview
      expect(claim.juryMembers.length).to.equal(21);
    });
  });
});
