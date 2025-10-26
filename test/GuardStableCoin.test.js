import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("GuardStableCoin", function () {
    let GuardStableCoin;
    let guardToken;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
        guardToken = await GuardStableCoin.deploy();
        
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await guardToken.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await guardToken.balanceOf(owner.address);
            expect(await guardToken.totalSupply()).to.equal(ownerBalance);
        });

        it("Should have correct name and symbol", async function () {
            expect(await guardToken.name()).to.equal("$GUARD");
            expect(await guardToken.symbol()).to.equal("GUARD");
        });

        it("Should have initial supply of 1,000,000 tokens", async function () {
            const expectedSupply = ethers.utils.parseEther("100000");
            expect(await guardToken.totalSupply()).to.equal(expectedSupply);
        });
    });

    describe("Minting", function () {
        it("Should allow owner to mint new tokens", async function () {
            const mintAmount = ethers.utils.parseEther("1000");
            await guardToken.mint(addr1.address, mintAmount);
            expect(await guardToken.balanceOf(addr1.address)).to.equal(mintAmount);
        });

        it("Should not allow non-owner to mint tokens", async function () {
            const mintAmount = ethers.utils.parseEther("1000");
            await expect(
                guardToken.connect(addr1).mint(addr2.address, mintAmount)
            ).to.be.reverted;
        });

        it("Should increase total supply when minting", async function () {
            const initialSupply = await guardToken.totalSupply();
            const mintAmount = ethers.utils.parseEther("1000");
            await guardToken.mint(addr1.address, mintAmount);
            expect(await guardToken.totalSupply()).to.equal(initialSupply.add(mintAmount));
        });
    });

    describe("Burning", function () {
        beforeEach(async function () {
            // Transfer some tokens to addr1 for burning tests
            await guardToken.transfer(addr1.address, ethers.utils.parseEther("1000"));
        });

        it("Should allow owner to burn tokens from an address", async function () {
            const burnAmount = ethers.utils.parseEther("500");
            const initialBalance = await guardToken.balanceOf(addr1.address);

            await guardToken.burn(addr1.address, burnAmount);

            expect(await guardToken.balanceOf(addr1.address)).to.equal(initialBalance.sub(burnAmount));
        });

        it("Should not allow non-owner to burn tokens", async function () {
            const burnAmount = ethers.utils.parseEther("500");
            await expect(
                guardToken.connect(addr1).burn(addr1.address, burnAmount)
            ).to.be.reverted;
        });

        it("Should decrease total supply when burning", async function () {
            const initialSupply = await guardToken.totalSupply();
            const burnAmount = ethers.utils.parseEther("500");

            await guardToken.burn(addr1.address, burnAmount);

            expect(await guardToken.totalSupply()).to.equal(initialSupply.sub(burnAmount));
        });

        it("Should fail to burn more tokens than address has", async function () {
            const excessiveAmount = ethers.utils.parseEther("10000");
            await expect(
                guardToken.burn(addr1.address, excessiveAmount)
            ).to.be.reverted;
        });
    });

    describe("Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            const transferAmount = ethers.utils.parseEther("100");
            await guardToken.transfer(addr1.address, transferAmount);
            expect(await guardToken.balanceOf(addr1.address)).to.equal(transferAmount);

            await guardToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("50"));
            expect(await guardToken.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther("50"));
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await guardToken.balanceOf(owner.address);
            await expect(
                guardToken.connect(addr1).transfer(owner.address, ethers.utils.parseEther("1"))
            ).to.be.reverted;

            expect(await guardToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
        });

        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await guardToken.balanceOf(owner.address);
            const transferAmount = ethers.utils.parseEther("100");

            await guardToken.transfer(addr1.address, transferAmount);
            await guardToken.transfer(addr2.address, transferAmount);

            const finalOwnerBalance = await guardToken.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(transferAmount.mul(2)));

            const addr1Balance = await guardToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(transferAmount);

            const addr2Balance = await guardToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(transferAmount);
        });
    });
});
