import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  NFT_NAME,
  NFT_SYMBOL,
  ZERO_ADDRESS,
  URI_PREFIX,
  MINT_PRICE,
  MAX_SUPPLY,
  URI_PREFIX_NEW,
  TOKEN_URI_0,
  TOKEN_URI_1,
} from "../helper";

export function ERC721collectionTest(): void {
  describe("1. ERC721 Collection Contract Unit Test", async () => {
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let eve: SignerWithAddress;
    let erc721collection: Contract;

    beforeEach(async () => {
      [owner, alice, bob, eve] = await ethers.getSigners();

      // deploy contract
      const ERC721CollectionFactory = await ethers.getContractFactory(
        "ERC721Collection",
        owner
      );
      erc721collection = await ERC721CollectionFactory.deploy(
        NFT_NAME,
        NFT_SYMBOL
      );
      await erc721collection.deployed();
    });

    it("Should have a name", async function () {
      expect(await erc721collection.name()).to.eq(NFT_NAME);
    });

    it("Should have a symbol", async function () {
      expect(await erc721collection.symbol()).to.eq(NFT_SYMBOL);
    });

    it("After deploying, total supply should be zero", async function () {
      expect(await erc721collection.totalSupply()).to.eq(0);
    });

    describe("Ownable", function () {
      it("After deploying, the owner should be deployer", async function () {
        expect(await erc721collection.owner()).to.eq(owner.address);
      });

      it("Owner is able to transfer ownership", async function () {
        expect(await erc721collection.transferOwnership(alice.address))
          .to.emit(erc721collection, "OwnershipTransferred")
          .withArgs(owner.address, alice.address);
        expect(await erc721collection.owner()).to.eq(alice.address);
      });

      it("Owner is not able to transfer ownership to zero address", async function () {
        await expect(
          erc721collection.transferOwnership(ZERO_ADDRESS)
        ).to.be.revertedWith("Ownable: new owner is the zero address");
      });

      it("No Owner is not able to transfer ownership", async function () {
        await expect(
          erc721collection.connect(alice).transferOwnership(bob.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });

    describe("Mint by owner", function () {
      it("Owner is able to mint nft", async function () {
        expect(await erc721collection.mintTo(owner.address, TOKEN_URI_0))
          .to.emit(erc721collection, "Transfer")
          .withArgs(ZERO_ADDRESS, owner.address, 1);
        expect(await erc721collection.totalSupply()).to.eq(1);
        expect(await erc721collection.balanceOf(owner.address)).to.eq(1);
        expect(await erc721collection.ownerOf(1)).to.eq(owner.address);
        expect(await erc721collection.tokenURI(1)).to.eq(TOKEN_URI_0);
      });

      it("Owner is not able to mint nft with empty uri", async function () {
        await expect(
          erc721collection.mintTo(owner.address, "")
        ).to.be.revertedWith("TokenURIEmpty");
      });

      it("Owner is not able to mint nft with same uri", async function () {
        await erc721collection.mintTo(owner.address, TOKEN_URI_0);
        await expect(
          erc721collection.mintTo(owner.address, TOKEN_URI_0)
        ).to.be.revertedWith("TokenExist");
      });

      it("No Owner is not able to mint nft", async function () {
        await expect(
          erc721collection.connect(alice).mintTo(owner.address, TOKEN_URI_0)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Collection owner can set token URI", async function () {
        await erc721collection.mintTo(alice.address, TOKEN_URI_0);

        await expect(erc721collection.setTokenURI(1, TOKEN_URI_1))
          .to.emit(erc721collection, "SetTokenURI")
          .withArgs(1, TOKEN_URI_1);

        expect(await erc721collection.tokenURI(1)).to.eq(TOKEN_URI_1);
      });
    });

    describe("Set mint-config by owner and mint nfts", function () {
      it("Owner is able to set configuration for minting", async function () {
        await expect(
          erc721collection.setMintConfig(URI_PREFIX, MINT_PRICE, MAX_SUPPLY)
        )
          .to.emit(erc721collection, "SetMintConfig")
          .withArgs(URI_PREFIX, MINT_PRICE, MAX_SUPPLY);
        expect(await erc721collection.totalSupply()).to.eq(0);
        expect(await erc721collection.mintCounter()).to.eq(0);
        expect(await erc721collection.mintURIPrefix()).to.eq(URI_PREFIX);
        expect(await erc721collection.mintMaxSupply()).to.eq(MAX_SUPPLY);
      });

      it("After setting config for minting, anyone can mint nfts with ETH", async function () {
        await erc721collection.setMintConfig(
          URI_PREFIX,
          MINT_PRICE,
          MAX_SUPPLY
        );

        await expect(
          erc721collection.connect(alice).mint(1, { value: MINT_PRICE })
        )
          .to.emit(erc721collection, "Transfer")
          .withArgs(ZERO_ADDRESS, alice.address, 1);

        // mint several nfts
        await erc721collection
          .connect(bob)
          .mint(2, { value: MINT_PRICE.mul(2) });

        // can not mint over max supply
        await expect(
          erc721collection.connect(eve).mint(3, { value: MINT_PRICE.mul(3) })
        ).to.revertedWith("MintOverMaxSupply");

        // can not mint with insufficient ETH
        await expect(
          erc721collection.connect(eve).mint(2, { value: MINT_PRICE })
        ).to.revertedWith("MintInsufficientFund");
      });

      it("Before setting config for minting, anyone can not mint nfts with ETH", async function () {
        await expect(
          erc721collection.connect(alice).mint(1, { value: MINT_PRICE })
        ).to.revertedWith("URIPrefixEmpty");
      });

      it("Collection owner can upgrade the configuration for minting", async function () {
        await erc721collection.setMintConfig(
          URI_PREFIX,
          MINT_PRICE,
          MAX_SUPPLY
        );

        await erc721collection
          .connect(alice)
          .mint(2, { value: MINT_PRICE.mul(2) });

        await erc721collection.setMintConfig(
          URI_PREFIX_NEW,
          MINT_PRICE,
          MAX_SUPPLY
        );

        await erc721collection
          .connect(bob)
          .mint(2, { value: MINT_PRICE.mul(2) });

        expect(await erc721collection.totalSupply()).to.eq(4);
        expect(await erc721collection.mintCounter()).to.eq(2);
        expect(await erc721collection.balanceOf(alice.address)).to.eq(2);
        expect(await erc721collection.balanceOf(bob.address)).to.eq(2);
      });
    });

    describe("Transfer", function () {
      beforeEach(async () => {
        // mint
        await erc721collection.mintTo(owner.address, TOKEN_URI_0);
        // transfer token_0 to alice
        await erc721collection.transferFrom(owner.address, alice.address, 1);
      });

      it("NFT Owner is able to transfer nft", async function () {
        // before transferring
        expect(await erc721collection.totalSupply()).to.eq(1);
        expect(await erc721collection.balanceOf(alice.address)).to.eq(1);
        expect(await erc721collection.balanceOf(bob.address)).to.eq(0);

        // transfer
        expect(
          await erc721collection
            .connect(alice)
            .transferFrom(alice.address, bob.address, 1)
        )
          .to.emit(erc721collection, "Transfer")
          .withArgs(alice.address, bob.address, 1);

        // after transferring
        expect(await erc721collection.totalSupply()).to.eq(1);
        expect(await erc721collection.balanceOf(alice.address)).to.eq(0);
        expect(await erc721collection.balanceOf(bob.address)).to.eq(1);
        expect(await erc721collection.ownerOf(1)).to.eq(bob.address);
      });

      it("The approved account is able to transfer nft", async function () {
        // owner alice
        expect(await erc721collection.ownerOf(1)).to.eq(alice.address);
        // approve
        expect(await erc721collection.connect(alice).approve(eve.address, 1));
        // transfer
        expect(
          await erc721collection
            .connect(eve)
            .transferFrom(alice.address, bob.address, 1)
        )
          .to.emit(erc721collection, "Transfer")
          .withArgs(alice.address, bob.address, 1);
      });

      it("Not approved account and Not owner is not able to transfer nft", async function () {
        // owner alice
        expect(await erc721collection.ownerOf(1)).to.eq(alice.address);
        // transfer
        await expect(
          erc721collection
            .connect(eve)
            .transferFrom(alice.address, bob.address, 1)
        ).to.revertedWith("ERC721: caller is not token owner nor approved");
      });
    });

    describe("Burn", function () {
      beforeEach(async () => {
        // mint
        await erc721collection.mintTo(owner.address, TOKEN_URI_0);
        // transfer token_0 to alice
        await erc721collection.transferFrom(owner.address, alice.address, 1);
      });

      it("Collection Owner is able to burn nft", async function () {
        // before burning
        expect(await erc721collection.totalSupply()).to.eq(1);
        expect(await erc721collection.balanceOf(alice.address)).to.eq(1);
        expect(await erc721collection.balanceOf(bob.address)).to.eq(0);

        // burn
        expect(await erc721collection.burn(1))
          .to.emit(erc721collection, "Transfer")
          .withArgs(alice.address, ZERO_ADDRESS, 1);

        // after burning
        expect(await erc721collection.totalSupply()).to.eq(0);
        expect(await erc721collection.balanceOf(alice.address)).to.eq(0);
      });

      it("Nobody(excluding collection`s owner) is able to burn nft", async function () {
        // owner alice
        expect(await erc721collection.ownerOf(1)).to.eq(alice.address);
        // burn
        await expect(erc721collection.connect(eve).burn(1)).to.revertedWith(
          "Ownable: caller is not the owner"
        );
      });

      it("After burning, Collection`s owner can create NFT with same URI", async function () {
        // owner alice
        expect(await erc721collection.ownerOf(1)).to.eq(alice.address);
        // check token URI
        expect(await erc721collection.tokenURI(1)).to.eq(TOKEN_URI_0);
        // burn
        await erc721collection.burn(1);
        // mint
        await expect(erc721collection.mintTo(owner.address, TOKEN_URI_0))
          .to.emit(erc721collection, "Transfer")
          .withArgs(ZERO_ADDRESS, owner.address, 2);
      });
    });
  });
}
