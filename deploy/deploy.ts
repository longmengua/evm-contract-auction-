import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import {
  ERC721A_NFT_NAME,
  ERC721A_NFT_SYMBOL,
  ERC721A_MAX_SUPPLY,
  ERC721A_MINT_PRICE,
  ERC721A_URI_PREFIX,
  ERC721_NFT_NAME,
  ERC721_NFT_SYMBOL,
  AUCTION_TREASURY,
  AUCTION_PROTOCOL_FEE_PERCENTAGE,
  TRADE_TREASURY,
  TRADE_PROTOCOL_FEE_PERCENTAGE,
} from "./params";

task(
  "deploy:ERC721A",
  "Deploy CGCNftERC721ACollection Smart Contract"
).setAction(async function (taskArguments: TaskArguments, hre) {
  const CGCNftERC721ACollectionFactory = await hre.ethers.getContractFactory(
    "CGCNftERC721ACollection"
  );

  // Deploy Contract
  const cgcnfterc721acollection = await CGCNftERC721ACollectionFactory.deploy(
    ERC721A_NFT_NAME,
    ERC721A_NFT_SYMBOL,
    ERC721A_MINT_PRICE,
    ERC721A_MAX_SUPPLY,
    ERC721A_URI_PREFIX
  );
  await cgcnfterc721acollection.deployed();

  console.log(
    "CGCNftERC721ACollection deployed to:",
    cgcnfterc721acollection.address
  );
});

task("deploy:ERC721", "Deploy CGCNftERC721Collection Smart Contract").setAction(
  async function (taskArguments: TaskArguments, hre) {
    const CGCNftERC721CollectionFactory = await hre.ethers.getContractFactory(
      "CGCNftERC721Collection"
    );

    // Deploy Contract
    const cgcnfterc721collection = await CGCNftERC721CollectionFactory.deploy(
      ERC721_NFT_NAME,
      ERC721_NFT_SYMBOL
    );
    await cgcnfterc721collection.deployed();

    console.log(
      "CGCNftERC721Collection deployed to:",
      cgcnfterc721collection.address
    );
  }
);

task("deploy:Auction", "Deploy CGCNftAuction Smart Contract").setAction(
  async function (taskArguments: TaskArguments, hre) {
    const CGCNftAuctionFactory = await hre.ethers.getContractFactory(
      "CGCNftAuction"
    );
    // Deploy Contract
    const cgcnftauction = await hre.upgrades.deployProxy(CGCNftAuctionFactory, [
      AUCTION_TREASURY,
      AUCTION_PROTOCOL_FEE_PERCENTAGE,
    ]);
    await cgcnftauction.deployed();

    console.log("CGCNftAuction deployed to:", cgcnftauction.address);
  }
);

task("deploy:Trade", "Deploy CGCNftTrade Smart Contract").setAction(
  async function (taskArguments: TaskArguments, hre) {
    const CGCNftTradeFactory = await hre.ethers.getContractFactory(
      "CGCNftTrade"
    );

    // Deploy Contract
    const cgcnfttrade = await hre.upgrades.deployProxy(CGCNftTradeFactory, [
      TRADE_TREASURY,
      TRADE_PROTOCOL_FEE_PERCENTAGE,
    ]);
    await cgcnfttrade.deployed();

    console.log("CGCNftTrade deployed to:", cgcnfttrade.address);
  }
);
