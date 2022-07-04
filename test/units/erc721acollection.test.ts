import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  NFT_NAME,
  NFT_SYMBOL,
  MINT_PRICE,
  MAX_SUPPLY,
  URI_PREFIX,
  ZERO_ADDRESS,
  parseETHWithDecimals,
} from "../helper";

export function ERC721acollectionTest(): void {
  describe("2. ERC721A Collection Contract Unit Test", async () => {
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let eve: SignerWithAddress;
    let erc721acollection: Contract;

    beforeEach(async () => {
      [owner, alice, bob, eve] = await ethers.getSigners();

      // deploy contract
      const ERC721ACollectionFactory = await ethers.getContractFactory(
        "ERC721ACollection",
        owner
      );
      erc721acollection = await ERC721ACollectionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL,
        MINT_PRICE,
        MAX_SUPPLY,
        URI_PREFIX
      );
      await erc721acollection.deployed();
    });

    it("Should have a name", async function () {
      expect(await erc721acollection.name()).to.eq(NFT_NAME);
    });

    it("Should have a symbol", async function () {
      expect(await erc721acollection.symbol()).to.eq(NFT_SYMBOL);
    });

    it("After deploying, total supply should be zero", async function () {
      expect(await erc721acollection.totalSupply()).to.eq(0);
    });

    it("Should have a mint price", async function () {
      expect(await erc721acollection.mintPrice()).to.eq(MINT_PRICE);
    });

    it("Should have a max supply", async function () {
      expect(await erc721acollection.maxSupply()).to.eq(MAX_SUPPLY);
    });

    it("Should have the uri prefix", async function () {
      expect(await erc721acollection.uriPrefix()).to.eq(URI_PREFIX);
    });

    describe("Ownable", function () {
      it("After deploying, the owner should be deployer", async function () {
        expect(await erc721acollection.owner()).to.eq(owner.address);
      });

      it("Owner is able to transfer ownership", async function () {
        expect(await erc721acollection.transferOwnership(alice.address))
          .to.emit(erc721acollection, "OwnershipTransferred")
          .withArgs(owner.address, alice.address);
        expect(await erc721acollection.owner()).to.eq(alice.address);
      });

      it("Owner is not able to transfer ownership to zero address", async function () {
        await expect(
          erc721acollection.transferOwnership(ZERO_ADDRESS)
        ).to.be.revertedWith("Ownable: new owner is the zero address");
      });

      it("No Owner is not able to transfer ownership", async function () {
        await expect(
          erc721acollection.connect(alice).transferOwnership(bob.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    describe("Mint", function () {
      it("Owner is able to mint several nfts without ETH", async function () {
        await erc721acollection.mintTo(owner.address, 2);

        expect(await erc721acollection.totalSupply()).to.eq(2);
        expect(await erc721acollection.balanceOf(owner.address)).to.eq(2);
        expect(await erc721acollection.ownerOf(0)).to.eq(owner.address);
        expect(await erc721acollection.ownerOf(1)).to.eq(owner.address);

        // token URI
        const uriSuffix = await erc721acollection.uriSuffix();
        expect(await erc721acollection.tokenURI(0)).to.eq(
          URI_PREFIX + `0` + uriSuffix
        );
        expect(await erc721acollection.tokenURI(1)).to.eq(
          URI_PREFIX + `1` + uriSuffix
        );

        const tokenIds = await erc721acollection.tokenIdsOf(owner.address);
        expect(tokenIds[0]).to.eq(BigNumber.from(0));
        expect(tokenIds[1]).to.eq(BigNumber.from(1));
      });

      it("Owner is not able to mint nft with zero amount", async function () {
        await expect(
          erc721acollection.mintTo(owner.address, 0)
        ).to.be.revertedWith("MintZeroQuantity");
      });

      it("No Owner is not able to mint nft without ETH", async function () {
        await expect(
          erc721acollection.connect(alice).mint(2)
        ).to.be.revertedWith("MintInsufficientFund");
      });

      it("No Owner is not able to mint nft with insufficient ETH", async function () {
        await expect(
          erc721acollection
            .connect(alice)
            .mint(2, { value: parseETHWithDecimals(5) })
        ).to.be.revertedWith("MintInsufficientFund");
      });

      it("No Owner is not able to mint nft with ETH over mint price", async function () {
        await erc721acollection
          .connect(alice)
          .mint(2, { value: MINT_PRICE.mul(2) });

        expect(await erc721acollection.totalSupply()).to.eq(2);
        expect(await erc721acollection.balanceOf(alice.address)).to.eq(2);
      });
    });

    describe("Transfer", function () {
      beforeEach(async () => {
        // mint to alice
        await erc721acollection.mintTo(alice.address, 1);
      });

      it("NFT Owner is able to transfer nft", async function () {
        // before transferring
        expect(await erc721acollection.totalSupply()).to.eq(1);
        expect(await erc721acollection.balanceOf(alice.address)).to.eq(1);
        expect(await erc721acollection.balanceOf(bob.address)).to.eq(0);

        // transfer
        expect(
          await erc721acollection
            .connect(alice)
            .transferFrom(alice.address, bob.address, 0)
        )
          .to.emit(erc721acollection, "Transfer")
          .withArgs(alice.address, bob.address, 0);

        // after transferring
        expect(await erc721acollection.totalSupply()).to.eq(1);
        expect(await erc721acollection.balanceOf(alice.address)).to.eq(0);
        expect(await erc721acollection.balanceOf(bob.address)).to.eq(1);
        expect(await erc721acollection.ownerOf(0)).to.eq(bob.address);
      });

      it("The approved account is able to transfer nft", async function () {
        // owner alice
        expect(await erc721acollection.ownerOf(0)).to.eq(alice.address);
        // approve
        expect(await erc721acollection.connect(alice).approve(eve.address, 0));
        // transfer
        expect(
          await erc721acollection
            .connect(eve)
            .transferFrom(alice.address, bob.address, 0)
        )
          .to.emit(erc721acollection, "Transfer")
          .withArgs(alice.address, bob.address, 0);
      });

      it("Not approved account and Not owner is not able to transfer nft", async function () {
        // owner alice
        expect(await erc721acollection.ownerOf(0)).to.eq(alice.address);
        // transfer
        await expect(
          erc721acollection
            .connect(eve)
            .transferFrom(alice.address, bob.address, 0)
        ).to.revertedWith("TransferCallerNotOwnerNorApproved");
      });
    });

    describe("Set props", function () {
      it("Only owner is able to set mint price", async function () {
        const newMintprice = parseETHWithDecimals(200);
        // set mint price
        await expect(
          erc721acollection.connect(alice).setMintPrice(newMintprice)
        ).to.revertedWith("Ownable: caller is not the owner");
        expect(await erc721acollection.setMintPrice(newMintprice))
          .to.emit(erc721acollection, "SetMintPrice")
          .withArgs(MINT_PRICE, newMintprice);

        expect(await erc721acollection.mintPrice()).to.eq(newMintprice);
      });

      it("Only owner is able to set token uri prefix", async function () {
        const newPrefix =
          "https://ipfs.io/ipfs/QmSemUFEmbuieCgHfjnd33DeiTqAyacUi6CFfL84M5kMps/";
        // set uri prefix
        await expect(
          erc721acollection.connect(alice).setUriPrefix(newPrefix)
        ).to.revertedWith("Ownable: caller is not the owner");
        expect(await erc721acollection.setUriPrefix(newPrefix))
          .to.emit(erc721acollection, "SetUriSuffix")
          .withArgs(URI_PREFIX, newPrefix);

        expect(await erc721acollection.uriPrefix()).to.eq(newPrefix);
      });

      it("owner is not able to set token uri with empty string", async function () {
        // set uri prefix
        await expect(erc721acollection.setUriPrefix("")).to.revertedWith(
          "URIPrefixEmpty"
        );
      });

      it("Only owner is able to set uri suffix", async function () {
        const newSuffix = "";
        // set uri suffix
        await expect(
          erc721acollection.connect(alice).setUriSuffix(newSuffix)
        ).to.revertedWith("Ownable: caller is not the owner");
        expect(await erc721acollection.setUriSuffix(newSuffix))
          .to.emit(erc721acollection, "SetUriSuffix")
          .withArgs(".json", newSuffix);

        expect(await erc721acollection.uriSuffix()).to.eq(newSuffix);
      });

      it("Only owner is able to set pause flag", async function () {
        // set pause flag
        await expect(
          erc721acollection.connect(alice).setPaused(true)
        ).to.revertedWith("Ownable: caller is not the owner");
        expect(await erc721acollection.setPaused(true))
          .to.emit(erc721acollection, "SetPaused")
          .withArgs(false, true);

        expect(await erc721acollection.paused()).to.eq(true);
      });

      it("owner is not able to set pause flag with same value", async function () {
        // set pause flag
        await expect(erc721acollection.setPaused(false)).to.revertedWith(
          "PauseSameFlag"
        );
      });

      it("After pausing, anyone can not mint", async function () {
        // set pause flag
        await erc721acollection.setPaused(true);

        await expect(
          erc721acollection.connect(alice).mint(2, { value: MINT_PRICE.mul(2) })
        ).to.revertedWith("MintPaused");
      });
    });
  });
}
