import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  PROTOCOL_FEE_PERCENTAGE,
  NFT_NAME,
  NFT_SYMBOL,
  TOKEN_URI_0,
  TOKEN_URI_1,
  ZERO_ADDRESS,
} from "../helper";

export function TradeTest(): void {
  describe("3. Trade Contract Unit Test", async () => {
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let eve: SignerWithAddress;
    let treasury: SignerWithAddress;
    let trade: Contract;
    let testERC721: Contract;

    beforeEach(async () => {
      [owner, alice, bob, eve, treasury] = await ethers.getSigners();

      // deploy contract (upgradeable)
      const TradeFactory = await ethers.getContractFactory("Trade", owner);
      trade = await upgrades.deployProxy(TradeFactory, [
        treasury.address,
        PROTOCOL_FEE_PERCENTAGE,
      ]);
      await trade.deployed();

      // deploy ERC721
      const TestERC721Factory = await ethers.getContractFactory(
        "TestERC721",
        owner
      );
      testERC721 = await TestERC721Factory.deploy(NFT_NAME, NFT_SYMBOL);
      await testERC721.deployed();

      /// Mint NFT to alice
      await testERC721.mint(alice.address, TOKEN_URI_0);
      /// Mint NFT to bob
      await testERC721.mint(bob.address, TOKEN_URI_1);

      /// Approve
      await testERC721.connect(alice).approve(trade.address, 0);
      await testERC721.connect(bob).approve(trade.address, 1);
    });

    it("Should have the treasury", async function () {
      expect(await trade.treasury()).to.eq(treasury.address);
    });

    it("Should have the protocol fee percent", async function () {
      expect(await trade.feePt()).to.eq(PROTOCOL_FEE_PERCENTAGE);
    });

    it("Only Owner is able to set fee percent", async function () {
      await expect(trade.connect(alice).setFeePt(200)).to.revertedWith(
        "Ownable: caller is not the owner"
      );

      await expect(trade.setFeePt(200))
        .to.emit(trade, "SetFeePt")
        .withArgs(100, 200);
    });

    it("Owner is not able to set fee percent with invalid value", async function () {
      await expect(trade.setFeePt(0)).to.revertedWith(
        "SetFeePercentageAsInvalidValue"
      );

      await expect(trade.setFeePt(10000)).to.revertedWith(
        "SetFeePercentageAsInvalidValue"
      );

      await expect(trade.setFeePt(20000)).to.revertedWith(
        "SetFeePercentageAsInvalidValue"
      );
    });

    it("Only Owner is able to set treasury", async function () {
      await expect(
        trade.connect(alice).setTreasury(eve.address)
      ).to.revertedWith("Ownable: caller is not the owner");

      await expect(trade.setTreasury(eve.address))
        .to.emit(trade, "SetTreasury")
        .withArgs(treasury.address, eve.address);
    });

    it("Owner is not able to set treasury with address", async function () {
      await expect(trade.setTreasury(ZERO_ADDRESS)).to.revertedWith(
        "SetTreasuryAsZeroAddress"
      );
    });

    it("NFT Owner can create trade", async function () {
      await expect(trade.addTrade(testERC721.address, 0, 100)).to.revertedWith(
        "TradeForNotOwner"
      );

      // Add Trade
      await expect(trade.connect(alice).addTrade(testERC721.address, 0, 100))
        .to.emit(trade, "AddTrade")
        .withArgs(testERC721.address, 0, 100);

      expect(await testERC721.ownerOf(0)).to.eq(trade.address);
    });

    it("Only NFT Owner can close trade", async function () {
      // Add Trade
      await trade.connect(alice).addTrade(testERC721.address, 0, 100);

      await expect(trade.closeTrade(0)).to.revertedWith("TradeForNotOwner");

      // nft owner is trade contract
      expect(await testERC721.ownerOf(0)).to.eq(trade.address);

      await expect(trade.connect(alice).closeTrade(0))
        .to.emit(trade, "CloseTrade")
        .withArgs(0);

      // nft owner is alice
      expect(await testERC721.ownerOf(0)).to.eq(alice.address);
    });

    it("Anyone can buy nft", async function () {
      /// alice add trade
      await trade.connect(alice).addTrade(testERC721.address, 0, 100);

      // bob buy nft
      await expect(trade.connect(bob).buyNft(0, { value: 100 }))
        .to.emit(trade, "BuyNft")
        .withArgs(0, 100);
    });

    it("Withdraw ETH of NFT seller", async function () {
      /// alice add trade
      await trade.connect(alice).addTrade(testERC721.address, 0, 100);

      // bob buy nft
      await trade.connect(bob).buyNft(0, { value: 100 });

      const depositedAmt = await trade.getDepositedAmt(alice.address);

      // withdraw ETH excluding fee
      await expect(trade.connect(alice).withdraw(alice.address, depositedAmt))
        .to.emit(trade, "Withdraw")
        .withArgs(alice.address, 100 - PROTOCOL_FEE_PERCENTAGE / 100);

      // revert when no ETH
      await expect(
        trade.connect(eve).withdraw(alice.address, depositedAmt)
      ).to.revertedWith("WithdrawInsufficientDeposited");
    });

    it("Withdraw protocol fee to treasury", async function () {
      /// alice add trade
      await trade.connect(alice).addTrade(testERC721.address, 0, 100);

      // bob buy nft
      await trade.connect(bob).buyNft(0, { value: 100 });

      const treasury = await trade.treasury();
      const depositedFeeAmt = await trade.depositedFeeAmt();

      // Claim Treasury Fee 1 (1%)
      await expect(trade.withdrawFee(depositedFeeAmt))
        .to.emit(trade, "WithdrawFee")
        .withArgs(treasury, 1);
    });

    describe("Buy several nfts in one transaction", async function () {
      beforeEach(async () => {
        /// alice add trade
        await trade.connect(alice).addTrade(testERC721.address, 0, 100);
        /// alice add trade
        await trade.connect(bob).addTrade(testERC721.address, 1, 200);
      });

      it("Anyone can buy serveral nfts in one transaction", async function () {
        // bob buy nft
        await expect(trade.connect(eve).buyNfts([0, 1], { value: 300 }))
          .to.emit(trade, "BuyNfts")
          .withArgs([0, 1], 300);
      });

      it("Anyone can not buy nfts with empty array", async function () {
        // bob buy nft
        await expect(
          trade.connect(eve).buyNfts([], { value: 300 })
        ).to.revertedWith("InvalidParams");
      });

      it("Anyone can not buy nfts with insufficient fund", async function () {
        // bob buy nft
        await expect(
          trade.connect(eve).buyNfts([0, 1], { value: 200 })
        ).to.revertedWith("BuyNftWithInsufficient");
      });

      it("Anyone can not buy nfts with the closed trade", async function () {
        // alice close trade
        await trade.connect(alice).closeTrade(0);

        // bob buy nft
        await expect(
          trade.connect(eve).buyNfts([0, 1], { value: 300 })
        ).to.revertedWith("TradeStatusNotOpen");
      });
    });

    describe("Upgradable", async function () {
      let tradeV2: Contract;

      beforeEach(async () => {
        const TradeV2Factory = await ethers.getContractFactory(
          "TradeV2",
          owner
        );

        // Upgrade to Version 2
        tradeV2 = await upgrades.upgradeProxy(trade.address, TradeV2Factory);
      });

      it("It should be kept origin data", async function () {
        expect(await tradeV2.treasury()).to.eq(treasury.address);
        expect(await tradeV2.feePt()).to.eq(PROTOCOL_FEE_PERCENTAGE);
      });

      it("It should be set Treasury Address by only origin treasury account", async function () {
        await expect(tradeV2.setTreasury(eve.address)).to.revertedWith(
          "V2SetTreasuryNotPermission"
        );
      });
    });
  });
}
