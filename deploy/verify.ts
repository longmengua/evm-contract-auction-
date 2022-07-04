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
} from "./params";

task("verify:ERC721A", "Verify CGCNftERC721ACollection Smart Contract")
  .addParam("address", "The deployed smart contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const params = [
      ERC721A_NFT_NAME,
      ERC721A_NFT_SYMBOL,
      ERC721A_MINT_PRICE,
      ERC721A_MAX_SUPPLY,
      ERC721A_URI_PREFIX,
    ];

    // Verify Contract
    await hre.run("verify:verify", {
      address: taskArguments.address,
      constructorArguments: params,
    });

    console.log("CGCNftERC721ACollection was verified successfully !!!");
  });

task("verify:ERC721", "Verify CGCNftERC721Collection Smart Contract")
  .addParam("address", "The deployed smart contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const params = [ERC721_NFT_NAME, ERC721_NFT_SYMBOL];

    // Verify Contract
    await hre.run("verify:verify", {
      address: taskArguments.address,
      constructorArguments: params,
    });

    console.log("CGCNftERC721Collection was verified successfully !!!");
  });
