import { ethers } from "ethers";

// -------------- ERC721A ----------------
export const ERC721A_NFT_NAME = "Catheon Gaming Center ERC721A";
export const ERC721A_NFT_SYMBOL = "CGCEA";
export const ERC721A_MINT_PRICE = ethers.utils.parseEther("0.1");
export const ERC721A_MAX_SUPPLY = 5;
export const ERC721A_URI_PREFIX =
  "https://ipfs.io/ipfs/QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn/";

// -------------- ERC721 ----------------
export const ERC721_NFT_NAME = "Catheon Gaming Center ERC721";
export const ERC721_NFT_SYMBOL = "CGCE";

// -------------- Auction ----------------
export const AUCTION_TREASURY = "0x6155711b7a66B1473C9eFeF10150340E69ea48de";
export const AUCTION_PROTOCOL_FEE_PERCENTAGE = 100;

// -------------- Trade ----------------
export const TRADE_TREASURY = "0x6155711b7a66B1473C9eFeF10150340E69ea48de";
export const TRADE_PROTOCOL_FEE_PERCENTAGE = 100;
