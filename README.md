# NFT auction contracts

## About

The NFT marketplace contracts which allow a user to do the following:

- List an NFT for sale
  - User must also be able to also change the price of a previously listed NFT
- Sell now at current bid price (accept offer)
- Cancel listing
- Buy (bid) on a NFT
  - User must also be able to change a previous buy (bid) price, provided the transaction has not gone through
- Buy a NFT now for the listed price
- Buy more than one multiple NFT for the listed price

## Implementation

- ERC721A

  - This smart contract is the thing in order to mint NFTs to users with special mint price
  - This contract was built by using `ERC721A`
  - This smart contract has the following features
    - mint several nfts in one transaction.
    - The collection owner can mint nft to special user without fund.
    - The user can mint serveral nfts with fund (mint_price \* number of minting nfts)
    - The collection owner can withdraw the deposited fund from contract.
    - The collection owner can change mint_price
    - The collection owner can stop/restart minting by setting `paused` flag

- ERC721

  - This smart contract is the thing for anyone to create NFT collection and mint nfts with collections on our market
  - This contract was built by using `ERC721URIStorage`
  - This smart contract has the following features
    - Only collection owner can mint NFT
    - The collection owner can mint only one NFT in one transaction
    - The collection owner can burn nft his nft

- Trade

  - This smart contract is the thing that is allowed for nft sellers to sell their nfts and for customers to buy nfts on our market.
  - This smart contract is upgradable smart contract.
  - This smart contract has the following features
    - The market owner can create market with the special fee percentage and the treasury address.
    - The market owner can change fee percentage and treasury address
    - The nft sellers can upload their nfts on market by adding trades with special price.
    - The customers can buy nfts on our market
    - The nft sellers can withdraw the deposited fund by trading at any time
    - The market owner can withdraw fee at any time

- Auction
  - This smart contract is the thing that is allowed for nft sellers to sell their nfts by auction.
  - This smart contract is upgradable smart contract.
  - This smart contract has the following features
    - The market owner can create auction market with the special fee percentage and the treasury address.
    - NFT sellers can start auction with their nfts on auction market.
    - NFT sellers set auction duration.
    - NFT seller can close auction before the end of auction, so that the bidded fund will be return to bidder and nft will be return to NFT seller.
    - In one auction, only one winner is exsited.
    - bidder can bid to the auction with the greater fund than auction min price and old bidder`s bid price.
    - After the end of auction, anyone can finish the auction. If the auction is succeed, the final bidder receive NFT and seller receive fund. Else the auction is not failed (no bidder), the nft seller receive his nft.
    - The market owner can withdraw the deposited fee funds by the succeed auctions.

## Usage

### Configuration

- create `.env` file by using `.env.sample` and set keys

```
INFURA_API_KEY=<INFURA_API_KEY>
PRIVATE_KEY=<YOUR_EOA_PRIVATE_KEY>
ETHERSCAN_API_KEY=<ETHERSCAN_API_KEY>
REPORT_GAS=true
```

- place the nft assets in `assets` folder

### Install packages

```
$ yarn install
```

### Build smart contracts

```
$ yarn compile
```

### Test smart contracts (Unit tests)

```
$ yarn test
```

### Deploy smart contrats

#### CGCNftERC721ACollection

- upload assets to ipfs

```
$ yarn upload
```

After excuting command, you will see the result such as the following :

```
NFT Metadata uploaded. Directory CID: QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn, Number: 5, Directory Path: https://ipfs.io/ipfs/QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn/
```

This means 5 nft metadata was uploaded in `https://ipfs.io/ipfs/QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn/` with `.json` file format
You can see the result from `https://ipfs.io/ipfs/QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn/0.json` ~ `https://ipfs.io/ipfs/QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn/4.json`

- config params in `deploy/params.ts`

```
// -------------- ERC721A ----------------
export const ERC721A_NFT_NAME = "ERC721A";
export const ERC721A_NFT_SYMBOL = "EA";
export const ERC721A_MINT_PRICE = ethers.utils.parseEther("0.1");       // Mint Price 0.1ETH
export const ERC721A_MAX_SUPPLY = 5;                                    // number of the uploaded nft metadata
export const ERC721A_URI_PREFIX = "https://ipfs.io/ipfs/QmaTMQ7P53LDpki1mnTT4aAf27NzyQs72Gm1o4nCLvsUDn/";           // ipfs directory path of the uploaded nft metadata
```

- deploy contract

```
$ yarn deploy:ERC721A <CHAIN_NAME>
```

- verify contract

```
$ yarn verify:ERC721A <CHAIN_NAME> --address <DEPLOYED_ADDRESS>
```

#### ERC721Collection

- config params in `deploy/params.ts`

```
// -------------- ERC721 ----------------
export const ERC721_NFT_NAME = "Catheon Gaming Center ERC721";
export const ERC721_NFT_SYMBOL = "CGCE";
```

- deploy contract

```
$ yarn deploy:ERC721 <CHAIN_NAME>
```

- verify contract

```
$ yarn verify:ERC721 <CHAIN_NAME> --address <DEPLOYED_ADDRESS>
```

#### Auction

- config params in `deploy/params.ts`

```
// -------------- Auction ----------------
export const AUCTION_TREASURY = "0x6155711b7a66B1473C9eFeF10150340E69ea48de";
export const AUCTION_PROTOCOL_FEE_PERCENTAGE = 100;                 // 1%  (10000 > PERCENTAGE > 0)
```

- deploy contract

```
$ yarn deploy:Auction <CHAIN_NAME>
```

#### Trade

- config params in `deploy/params.ts`

```
// -------------- Trade ----------------
export const TRADE_TREASURY = "0x6155711b7a66B1473C9eFeF10150340E69ea48de";
export const TRADE_PROTOCOL_FEE_PERCENTAGE = 100;                 // 1%  (10000 > PERCENTAGE > 0)
```

- deploy contract

```
$ yarn deploy:Trade <CHAIN_NAME>
```
