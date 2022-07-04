import { ethers as hEthers } from "hardhat";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";

export async function travelTime(ethers: HardhatEthersHelpers, time: number) {
  await ethers.provider.send("evm_increaseTime", [time]);
  await ethers.provider.send("evm_mine", []);
}

export async function resetBlockTimestamp(ethers: HardhatEthersHelpers) {
  const blockNumber = ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const currentTimestamp = Math.floor(new Date().getTime() / 1000);
  const secondsDiff = currentTimestamp - block.timestamp;
  await ethers.provider.send("evm_increaseTime", [secondsDiff]);
  await ethers.provider.send("evm_mine", []);
}

export async function getTimestamp(
  ethers: HardhatEthersHelpers,
  duration: number
) {
  const blockNumber = ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block.timestamp + duration;
}

export function parseETHWithDecimals(amount: number) {
  return hEthers.utils.parseEther(Math.floor(amount).toString());
}

export const NFT_NAME = "Cathone Gaming Center NFT";
export const NFT_SYMBOL = "CGCNFT";
export const URI_PREFIX =
  "https://ipfs.io/ipfs/QmWT3G8y72jj3i1GaxAbcMeuPqhLMrQHzJ9DCDRy3N7DsK/";
export const URI_PREFIX_NEW =
  "https://ipfs.io/ipfs/QmUIVD5yr9E7EFp9iFXcMeuPqp9iFXAGSbyKri6CFfL84M/";
export const TOKEN_URI_0 =
  "https://ipfs.io/ipfs/QmZDr5J7MWyZM2CdbLqNXNjAGSbyKr9E7EFp9iFXuNB6hX";
export const TOKEN_URI_1 =
  "https://ipfs.io/ipfs/QmXKnD7NrCTfwg5vJL9dDRudeaSPE15F8stFo9tMRCsDBH";
export const TOKEN_URI_2 =
  "https://ipfs.io/ipfs/QmSemUFEmbuieCgHfjnd33DeiTqAyacUi6CFfL84M5kMps";
export const MINT_PRICE = parseETHWithDecimals(10);
export const MAX_SUPPLY = 5;
export const PROTOCOL_FEE_PERCENTAGE = 100; // 1%
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ONE_HOUR = 3600;
export const TWO_HOURS = 3600 * 2;
export const AFTER_ONE_HOUR_TP = async (ethers: HardhatEthersHelpers) =>
  await getTimestamp(ethers, ONE_HOUR);
export const AFTER_TWO_HOUR_TP = async (ethers: HardhatEthersHelpers) =>
  await getTimestamp(ethers, TWO_HOURS);
export const BEFORE_ONE_HOUR_TP = async (ethers: HardhatEthersHelpers) =>
  await getTimestamp(ethers, -ONE_HOUR);
export const AUCTION_MIN_PRICE = parseETHWithDecimals(10);
