//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract Auction is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    enum AuctionStatus {
        Closed,
        Open
    }
    // Auction data
    struct Auction {
        address nft;
        uint256 tokenId;
        uint256 minPrice;
        address seller;
        uint16 feePt;
        uint256 startTp;
        uint256 endTp;
        address bidder;
        uint256 bidPrice;
        AuctionStatus status;
    }

    // Bid data
    struct BidData {
        address addr;
        uint256 bidAmt;
        uint256 tp;
    }

    // mapping of nft to mapping of tokenId to auction Id
    mapping(address => mapping(uint256 => uint256)) private nftAuctionIds;
    // mapping of the auction Id to auction data
    mapping(uint256 => Auction) public auctions;
    // mapping of seller to auction Ids
    mapping(address => uint256[]) public sellerAuctionIds;
    // mapping of the auction Id to bids
    mapping(uint256 => BidData[]) public bids;

    // Auction Counter
    uint256 public idCounter;
    // Protocol Fee
    uint16 public feePt;
    // Treasuy address
    address public treasury;
    // Percentage Unit
    uint16 internal constant MAX_PERCENTAGE = 10000;
    // Deposited protocol fee amount
    uint256 public protocolFeeAmt;

    // ******************  Errors  *****************************

    error SetTreasuryAsZeroAddress();
    error SetFeePercentageAsInvalidValue();
    error NftContractAsZeroAddress();
    error NftPriceAsZero();
    error AuctionInvalidStartTimestamp();
    error AuctionInvalidTimestamp();
    error AuctionForNotOwner();
    error AuctionNotOpened();
    error AuctionNotOngoing();
    error AuctionEnded();
    error AuctionNotEnd();
    error BidInSufficientFund();
    error ProtocolFeeZero();

    // ******************  Event functions  ********************

    event SetFeePt(uint16 oldFeePt, uint16 newFeePt);
    event SetTreasury(address oldTreasury, address newTreasury);
    event AddAuction(
        uint256 auctionId,
        address nft,
        uint256 tokenId,
        uint256 startTp,
        uint256 endTp,
        uint256 minPrice
    );
    event CancelAuction(uint256 auctionId);
    event Bid(uint256 auctionId, uint256 amount);
    event FinishAuction(uint256 auctionId);
    event WithdrawFee(address treasury, uint256 amount);
    event Receive(uint256 amount);

    // ******************  View Functions  **********************

    /// @dev get the auctions of seller
    /// @param _seller the seller address
    function getAuctionsOf(address _seller)
        external
        view
        returns (Auction[] memory auctions_)
    {
        uint256[] memory auctionIds = sellerAuctionIds[_seller];
        auctions_ = new Auction[](auctionIds.length);

        for (uint256 i = 0; i < auctionIds.length; ++i) {
            auctions_[i] = (auctions[auctionIds[i]]);
        }
    }

    /// @dev get the number of auctions
    function getCount() external view returns (uint256) {
        return idCounter - startIndex();
    }

    /// @dev get the start index of auction id
    function startIndex() public pure returns (uint256) {
        return 1;
    }

    // *****  Initialize (Upgradeable - Proxy pattern)  *******

    /// @dev initialize auction contract with treasury and feePercentage
    /// @param _treasury The market`s treasury address
    /// @param _feePt The fee percentage of Market
    function initialize(address _treasury, uint16 _feePt) public initializer {
        if (_treasury == address(0)) revert SetTreasuryAsZeroAddress();
        if (_feePt == 0 || _feePt >= MAX_PERCENTAGE)
            revert SetFeePercentageAsInvalidValue();

        // set states
        treasury = _treasury;
        feePt = _feePt;
        idCounter = startIndex();

        // ReentrancyGuard Initialize
        __ReentrancyGuard_init();
        // Ownable Initialize
        __Ownable_init();
    }

    // ******************  Functions  *************************

    /// @dev update fee percentage (10000 > fee_precentage > 0)
    /// @param _feePt The updated fee percentage
    function setFeePt(uint16 _feePt) external virtual onlyOwner {
        if (_feePt == 0 || _feePt >= MAX_PERCENTAGE)
            revert SetFeePercentageAsInvalidValue();

        emit SetFeePt(feePt, _feePt);

        feePt = _feePt;
    }

    /// @dev update treasury address
    /// @param _treasury The updated treasury address
    function setTreasury(address _treasury) external virtual onlyOwner {
        if (_treasury == address(0)) revert SetTreasuryAsZeroAddress();

        emit SetTreasury(treasury, _treasury);

        treasury = _treasury;
    }

    /// @dev add auction
    /// @notice muct approve nft to contract before calling
    function addAuction(
        address _nft,
        uint256 _tokenId,
        uint256 _startTp,
        uint256 _endTp,
        uint256 _minPrice
    ) external virtual returns (uint256 auctionId_) {
        if (_nft == address(0)) revert NftContractAsZeroAddress();
        if (_minPrice == 0) revert NftPriceAsZero();
        if (_startTp < block.timestamp) revert AuctionInvalidStartTimestamp();
        if (_endTp <= _startTp) revert AuctionInvalidTimestamp();

        // check nft owner
        IERC721 nftCollection = IERC721(_nft);
        if (nftCollection.ownerOf(_tokenId) != msg.sender)
            revert AuctionForNotOwner();

        auctionId_ = idCounter;
        // add
        auctions[auctionId_] = Auction({
            nft: _nft,
            tokenId: _tokenId,
            seller: msg.sender,
            minPrice: _minPrice,
            startTp: _startTp,
            endTp: _endTp,
            feePt: feePt,
            bidder: address(0),
            bidPrice: 0,
            status: AuctionStatus.Open
        });

        // set auction Id
        nftAuctionIds[_nft][_tokenId] = auctionId_;
        sellerAuctionIds[msg.sender].push(auctionId_);

        ++idCounter;
        // lock nft to the market
        nftCollection.transferFrom(msg.sender, address(this), _tokenId);

        emit AddAuction(
            auctionId_,
            _nft,
            _tokenId,
            _startTp,
            _endTp,
            _minPrice
        );
    }

    /// @dev cancel a auction
    /// @param _auctionId The auction Id
    function cancelAuction(uint256 _auctionId) external virtual {
        Auction storage auction = auctions[_auctionId];
        if (auction.seller != msg.sender) revert AuctionForNotOwner();
        if (auction.status != AuctionStatus.Open) revert AuctionNotOpened();
        if (auction.endTp <= block.timestamp) revert AuctionEnded();

        // update auction status
        auction.status = AuctionStatus.Closed;
        // return nft to seller
        IERC721(auction.nft).transferFrom(
            address(this),
            auction.seller,
            auction.tokenId
        );

        if (auction.bidPrice != 0) {
            // return ETH to bidder
            payable(auction.bidder).transfer(auction.bidPrice);
        }

        emit CancelAuction(_auctionId);
    }

    /// @dev bid to a auction
    /// @param _auctionId The auction Id
    function bid(uint256 _auctionId) external payable virtual {
        Auction storage auction = auctions[_auctionId];
        if (auction.status != AuctionStatus.Open) revert AuctionNotOpened();
        if (
            block.timestamp < auction.startTp ||
            auction.endTp <= block.timestamp
        ) revert AuctionNotOngoing();
        if (msg.value < auction.minPrice || msg.value <= auction.bidPrice)
            revert BidInSufficientFund();

        if (auction.bidPrice != 0) {
            // return ETH to past bidder
            payable(auction.bidder).transfer(auction.bidPrice);
        }

        // set auction data
        auction.bidder = msg.sender;
        auction.bidPrice = msg.value;

        // set bid map
        bids[_auctionId].push(
            BidData({addr: msg.sender, bidAmt: msg.value, tp: block.timestamp})
        );

        emit Bid(_auctionId, msg.value);
    }

    /// @dev finish the auction that is over than end timestamp;
    function finishAuction(uint256 _auctionId) external payable virtual {
        Auction storage auction = auctions[_auctionId];
        if (block.timestamp < auction.endTp) revert AuctionNotEnd();
        if (auction.status != AuctionStatus.Open) revert AuctionNotOpened();

        // update auction status
        auction.status = AuctionStatus.Closed;

        if (auction.bidPrice == 0) {
            // return nft to seller
            IERC721(auction.nft).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
        } else {
            uint256 feeAmt = (auction.bidPrice * auction.feePt) /
                MAX_PERCENTAGE;
            // update fee
            protocolFeeAmt += feeAmt;

            // transfer ETH to seller
            payable(auction.seller).transfer(auction.bidPrice - feeAmt);

            // transfer nft to winner
            IERC721(auction.nft).transferFrom(
                address(this),
                auction.bidder,
                auction.tokenId
            );
        }
        emit FinishAuction(_auctionId);
    }

    /// @dev withdraw protocol fee
    function withdrawFee() external payable virtual {
        if (protocolFeeAmt == 0) revert ProtocolFeeZero();

        // transfer fee
        payable(treasury).transfer(protocolFeeAmt);

        emit WithdrawFee(treasury, protocolFeeAmt);
    }

    // ******************  Receive Ether functions  ********************

    receive() external payable {
        emit Receive(msg.value);
    }
}
