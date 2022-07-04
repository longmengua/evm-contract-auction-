import { ERC721collectionTest } from "./units/erc721collection.test";
import { ERC721acollectionTest } from "./units/erc721acollection.test";
import { TradeTest } from "./units/trade.test";
import { NFTAuctionTest } from "./units/auction.test";

describe("NFT marektplace smart contracts uint tests", function () {
  ERC721collectionTest();
  ERC721acollectionTest();
  TradeTest();
  NFTAuctionTest();
});
