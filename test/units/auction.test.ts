import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  PROTOCOL_FEE_PERCENTAGE,
  NFT_NAME,
  NFT_SYMBOL,
  TOKEN_URI_0,
  ZERO_ADDRESS,
  resetBlockTimestamp,
  travelTime,
  parseETHWithDecimals,
  ONE_HOUR,
  TWO_HOURS,
  BEFORE_ONE_HOUR_TP,
  AFTER_ONE_HOUR_TP,
  AFTER_TWO_HOUR_TP,
  AUCTION_MIN_PRICE,
} from "../helper";

export function NFTAuctionTest(): void {
  describe("4. Auction Contract Unit Test", async () => {
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let eve: SignerWithAddress;
    let treasury: SignerWithAddress;
    let auction: Contract;
    let testERC721: Contract;

    beforeEach(async () => {
      [owner, alice, bob, eve, treasury] = await ethers.getSigners();

      // deploy contract (upgradeable)
      const AuctionFactory = await ethers.getContractFactory("Auction", owner);
      auction = await upgrades.deployProxy(AuctionFactory, [
        treasury.address,
        PROTOCOL_FEE_PERCENTAGE,
      ]);
      await auction.deployed();

      // deploy ERC721
      const TestERC721Factory = await ethers.getContractFactory(
        "TestERC721",
        owner
      );
      testERC721 = await TestERC721Factory.deploy(NFT_NAME, NFT_SYMBOL);
      await testERC721.deployed();

      /// Mint NFT to alice
      await expect(testERC721.mint(alice.address, TOKEN_URI_0))
        .to.emit(testERC721, "Transfer")
        .withArgs(ZERO_ADDRESS, alice.address, 0);

      /// Approve
      await testERC721.connect(alice).approve(auction.address, 0);
    });

    it("Should have the treasury", async function () {
      expect(await auction.treasury()).to.eq(treasury.address);
    });

    it("Should have the protocol fee percent", async function () {
      expect(await auction.feePt()).to.eq(PROTOCOL_FEE_PERCENTAGE);
    });

    it("Only Owner is able to set fee percent", async function () {
      await expect(auction.connect(alice).setFeePt(200)).to.revertedWith(
        "Ownable: caller is not the owner"
      );

      await expect(auction.setFeePt(200))
        .to.emit(auction, "SetFeePt")
        .withArgs(100, 200);
    });

    it("Owner is not able to set fee percent with invalid value", async function () {
      await expect(auction.setFeePt(0)).to.revertedWith(
        "SetFeePercentageAsInvalidValue"
      );

      await expect(auction.setFeePt(10000)).to.revertedWith(
        "SetFeePercentageAsInvalidValue"
      );

      await expect(auction.setFeePt(20000)).to.revertedWith(
        "SetFeePercentageAsInvalidValue"
      );
    });

    it("Only Owner is able to set treasury", async function () {
      await expect(
        auction.connect(alice).setTreasury(eve.address)
      ).to.revertedWith("Ownable: caller is not the owner");

      await expect(auction.setTreasury(eve.address))
        .to.emit(auction, "SetTreasury")
        .withArgs(treasury.address, eve.address);
    });

    it("Owner is not able to set treasury with address", async function () {
      await expect(auction.setTreasury(ZERO_ADDRESS)).to.revertedWith(
        "SetTreasuryAsZeroAddress"
      );
    });

    describe("Create auctions", function () {
      let afterOneHourTp: number;
      let afterTwoHoursTp: number;
      let beforeOneHourTp: number;

      beforeEach(async () => {
        await resetBlockTimestamp(ethers);

        afterOneHourTp = await AFTER_ONE_HOUR_TP(ethers);
        afterTwoHoursTp = await AFTER_TWO_HOUR_TP(ethers);
        beforeOneHourTp = await BEFORE_ONE_HOUR_TP(ethers);
      });

      it("NFT Owner can add auction", async function () {
        await expect(
          auction.addAuction(
            testERC721.address,
            0,
            afterOneHourTp,
            afterTwoHoursTp,
            AUCTION_MIN_PRICE
          )
        ).to.revertedWith("AuctionForNotOwner");

        // Add Auction
        await expect(
          auction
            .connect(alice)
            .addAuction(
              testERC721.address,
              0,
              afterOneHourTp,
              afterTwoHoursTp,
              AUCTION_MIN_PRICE
            )
        )
          .to.emit(auction, "AddAuction")
          .withArgs(
            1,
            testERC721.address,
            0,
            afterOneHourTp,
            afterTwoHoursTp,
            AUCTION_MIN_PRICE
          );

        expect(await testERC721.ownerOf(0)).to.eq(auction.address);
      });

      it("NFT Owner can not add auction with invalid nft", async function () {
        await expect(
          auction
            .connect(alice)
            .addAuction(
              ZERO_ADDRESS,
              0,
              afterOneHourTp,
              afterTwoHoursTp,
              AUCTION_MIN_PRICE
            )
        ).to.revertedWith("NftContractAsZeroAddress");
      });

      it("NFT Owner can not add auction with zero min price", async function () {
        await expect(
          auction
            .connect(alice)
            .addAuction(
              testERC721.address,
              0,
              afterOneHourTp,
              afterTwoHoursTp,
              0
            )
        ).to.revertedWith("NftPriceAsZero");
      });

      it("NFT Owner can not add auction with invalid start timestamp", async function () {
        await expect(
          auction
            .connect(alice)
            .addAuction(
              testERC721.address,
              0,
              beforeOneHourTp,
              afterTwoHoursTp,
              AUCTION_MIN_PRICE
            )
        ).to.revertedWith("AuctionInvalidStartTimestamp");
      });

      it("NFT Owner can not add auction with invalid timestamps", async function () {
        await expect(
          auction
            .connect(alice)
            .addAuction(
              testERC721.address,
              0,
              afterOneHourTp,
              beforeOneHourTp,
              AUCTION_MIN_PRICE
            )
        ).to.revertedWith("AuctionInvalidTimestamp");
      });
    });

    describe("Cancel the auction", function () {
      let afterOneHourTp: number;
      let afterTwoHoursTp: number;

      beforeEach(async () => {
        await resetBlockTimestamp(ethers);

        afterOneHourTp = await AFTER_ONE_HOUR_TP(ethers);
        afterTwoHoursTp = await AFTER_TWO_HOUR_TP(ethers);
        // Add Auction
        await auction
          .connect(alice)
          .addAuction(
            testERC721.address,
            0,
            afterOneHourTp,
            afterTwoHoursTp,
            AUCTION_MIN_PRICE
          );
      });

      it("Only NFT Owner can cancel auction before the end time of auction", async function () {
        await expect(auction.cancelAuction(1)).to.revertedWith(
          "AuctionForNotOwner"
        );

        // nft owner is auction contract
        expect(await testERC721.ownerOf(0)).to.eq(auction.address);

        await expect(auction.connect(alice).cancelAuction(1))
          .to.emit(auction, "CancelAuction")
          .withArgs(1);

        // nft owner is alice
        expect(await testERC721.ownerOf(0)).to.eq(alice.address);
      });

      it("The cancelled auction can not cancel", async function () {
        // Cancel Auction
        await auction.connect(alice).cancelAuction(1);
        // Try again
        await expect(auction.connect(alice).cancelAuction(1)).to.revertedWith(
          "AuctionNotOpened"
        );
      });

      it("The owner can not cancel after end time", async function () {
        await travelTime(ethers, TWO_HOURS);

        await expect(auction.connect(alice).cancelAuction(1)).to.revertedWith(
          "AuctionEnded"
        );

        expect(await ethers.provider.getBalance(auction.address)).to.be.eq(0);
      });
    });

    describe("Bid to the auction", function () {
      let afterOneHourTp: number;
      let afterTwoHoursTp: number;

      beforeEach(async () => {
        await resetBlockTimestamp(ethers);

        afterOneHourTp = await AFTER_ONE_HOUR_TP(ethers);
        afterTwoHoursTp = await AFTER_TWO_HOUR_TP(ethers);
        // Add Auction
        await auction
          .connect(alice)
          .addAuction(
            testERC721.address,
            0,
            afterOneHourTp,
            afterTwoHoursTp,
            AUCTION_MIN_PRICE
          );
      });

      it("Anyone can bid after start time", async function () {
        await travelTime(ethers, ONE_HOUR);

        expect(await auction.connect(bob).bid(1, { value: AUCTION_MIN_PRICE }))
          .to.emit(auction, "Bid")
          .withArgs(1, AUCTION_MIN_PRICE);
      });

      it("Anyone can not bid before start time", async function () {
        await expect(
          auction.connect(bob).bid(1, { value: AUCTION_MIN_PRICE })
        ).to.revertedWith("AuctionNotOngoing");
      });

      it("Anyone can not bid with insufficient price", async function () {
        await travelTime(ethers, ONE_HOUR);

        await expect(
          auction.connect(bob).bid(1, { value: parseETHWithDecimals(1) })
        ).to.revertedWith("BidInSufficientFund");
      });

      it("Anyone can not bid to the closed auction", async function () {
        await travelTime(ethers, ONE_HOUR);

        // Cancel Auction
        await auction.connect(alice).cancelAuction(1);

        await expect(
          auction.connect(bob).bid(1, { value: AUCTION_MIN_PRICE })
        ).to.revertedWith("AuctionNotOpened");
      });

      it("Anyone can not bid with less ETH than the old bider", async function () {
        await travelTime(ethers, ONE_HOUR);

        // Bob bid with 10ETH
        await auction.connect(bob).bid(1, { value: AUCTION_MIN_PRICE });

        // Eve can not bid with 10ETH
        await expect(
          auction.connect(eve).bid(1, { value: AUCTION_MIN_PRICE })
        ).to.revertedWith("BidInSufficientFund");

        expect(await ethers.provider.getBalance(auction.address)).to.be.eq(
          AUCTION_MIN_PRICE
        );

        // Eve can bid with the greater amount than 10ETH
        expect(
          await auction.connect(eve).bid(1, { value: parseETHWithDecimals(20) })
        )
          .to.emit(auction, "Bid")
          .withArgs(1, parseETHWithDecimals(20));

        // auction contract receive 20ETH
        expect(await ethers.provider.getBalance(auction.address)).to.be.eq(
          parseETHWithDecimals(20)
        );
      });
    });

    describe("Finish the auction", function () {
      let afterOneHourTp: number;
      let afterTwoHoursTp: number;

      beforeEach(async () => {
        await resetBlockTimestamp(ethers);

        afterOneHourTp = await AFTER_ONE_HOUR_TP(ethers);
        afterTwoHoursTp = await AFTER_TWO_HOUR_TP(ethers);
        // Add Auction
        await auction
          .connect(alice)
          .addAuction(
            testERC721.address,
            0,
            afterOneHourTp,
            afterTwoHoursTp,
            AUCTION_MIN_PRICE
          );

        await travelTime(ethers, ONE_HOUR);
      });

      it("anyone can finish the auction after the end of auction", async function () {
        // bob bid
        await auction.connect(bob).bid(1, { value: parseETHWithDecimals(100) });
        // go to the end of auction
        await travelTime(ethers, ONE_HOUR);

        // Finish Auction
        await expect(auction.connect(alice).finishAuction(1))
          .to.emit(auction, "FinishAuction")
          .withArgs(1);

        // bob received nft
        expect(await testERC721.ownerOf(0)).to.eq(bob.address);
        // alice receive the deposited ETH (99ETH - excluding fee 1%)
        expect(await ethers.provider.getBalance(auction.address)).to.be.eq(
          parseETHWithDecimals(1)
        );
      });

      it("Auction owner can not finish the closed auction", async function () {
        // Cancel Auction
        await auction.connect(alice).cancelAuction(1);

        await expect(auction.connect(alice).finishAuction(1)).to.revertedWith(
          "AuctionNotEnd"
        );
      });

      it("If anyone did not bid, nft will return to auction owner", async function () {
        // go to the end of auction
        await travelTime(ethers, ONE_HOUR);

        // Finish Auction
        await expect(auction.connect(alice).finishAuction(1))
          .to.emit(auction, "FinishAuction")
          .withArgs(1);

        // nft return to alice
        expect(await testERC721.ownerOf(0)).to.eq(alice.address);
        // alice balance deos not change
        expect(await ethers.provider.getBalance(auction.address)).to.be.eq(0);
      });
    });

    describe("Withdraw fee", function () {
      let afterOneHourTp: number;
      let afterTwoHoursTp: number;

      beforeEach(async () => {
        await resetBlockTimestamp(ethers);

        afterOneHourTp = await AFTER_ONE_HOUR_TP(ethers);
        afterTwoHoursTp = await AFTER_TWO_HOUR_TP(ethers);
        // Add Auction
        await auction
          .connect(alice)
          .addAuction(
            testERC721.address,
            0,
            afterOneHourTp,
            afterTwoHoursTp,
            AUCTION_MIN_PRICE
          );

        await travelTime(ethers, ONE_HOUR);
      });

      it("Withdraw protocol fee to treasury", async function () {
        // bob bid
        await auction.connect(bob).bid(1, { value: parseETHWithDecimals(100) });

        await travelTime(ethers, ONE_HOUR);
        // finish the auction
        await auction.connect(alice).finishAuction(1);

        const treasury = await auction.treasury();

        // Fee 1%
        expect(await auction.protocolFeeAmt()).to.eq(parseETHWithDecimals(1));

        // Claim Treasury Fee 1 (1%)
        await expect(auction.withdrawFee())
          .to.emit(auction, "WithdrawFee")
          .withArgs(treasury, parseETHWithDecimals(1));
      });
    });

    describe("Upgradable", async function () {
      let auctionV2: Contract;

      beforeEach(async () => {
        const AuctionV2Factory = await ethers.getContractFactory(
          "AuctionV2",
          owner
        );

        // Upgrade to Version 2
        auctionV2 = await upgrades.upgradeProxy(
          auction.address,
          AuctionV2Factory
        );
      });

      it("It should be kept origin data", async function () {
        expect(await auctionV2.treasury()).to.eq(treasury.address);
        expect(await auctionV2.feePt()).to.eq(PROTOCOL_FEE_PERCENTAGE);
      });

      it("It should be set Treasury Address by only origin treasury account", async function () {
        await expect(auctionV2.setTreasury(eve.address)).to.revertedWith(
          "V2SetTreasuryNotPermission"
        );
      });
    });
  });
}
