//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Trade is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // ******************  Event functions  ********************

    // Nft Trading Status
    enum NftTradeStatus {
        Closed, // Closed trade
        Open // On market
    }

    // Trade data structure
    struct NftTrade {
        address nft;
        uint256 tokenId;
        address seller;
        uint256 price;
        uint16 feePt;
        NftTradeStatus status;
    }

    // NftTradeMap Counter
    uint256 public tradeCounter;
    // Total deposited fee amount
    uint256 public depositedFeeAmt;
    // NftMarket Fee
    uint16 public feePt;
    // Market Treasury address
    address public treasury;
    // NftTradeMap
    mapping(uint256 => NftTrade) private trades;
    // DepositedMap
    mapping(address => uint256) private depositedAmt;
    // Percentage Unit
    uint16 internal constant MAX_PERCENTAGE = 10000;

    // ******************  Event functions  ********************

    event AddTrade(address nft, uint256 tokenId, uint256 price);
    event UpdateTrade(uint256 tradeId, uint256 price);
    event CloseTrade(uint256 tradeId);
    event BuyNft(uint256 tradeId, uint256 price);
    event BuyNfts(uint256[] tradeIds, uint256 price);
    event Withdraw(address seller, uint256 amount);
    event WithdrawFee(address treasury, uint256 amount);
    event Receive(uint256 amount);
    event SetFeePt(uint16 oldFeePt, uint16 newFeePt);
    event SetTreasury(address oldTreasury, address newTreasury);

    // ******************  Errors  *****************************

    error SetTreasuryAsZeroAddress();
    error SetFeePercentageAsInvalidValue();
    error NftContractAsZeroAddress();
    error NftPriceAsZero();
    error TradeForNotOwner();
    error TradeStatusNotOpen();
    error InvalidParams();
    error BuyNftWithInsufficient();
    error WithdrawToZeroAddress();
    error WithdrawZeroAmount();
    error WithdrawInsufficientDeposited();
    error WithdrawFeeZeroAmount();

    // *****  Initialize (Upgradeable - Proxy pattern)  *******

    /// @dev construct nft marketplace with treasury and feePercentage
    /// @param _treasury The market`s treasury address
    /// @param _feePt The fee percentage of Market
    function initialize(address _treasury, uint16 _feePt) public initializer {
        if (_treasury == address(0)) revert SetTreasuryAsZeroAddress();
        if (_feePt == 0 || _feePt >= MAX_PERCENTAGE)
            revert SetFeePercentageAsInvalidValue();

        treasury = _treasury;
        feePt = _feePt;

        // ReentrancyGuard Initialize
        __ReentrancyGuard_init();
        // Ownable Initialize
        __Ownable_init();
    }

    // ******************  Functions  *************************

    /// @dev get a trade
    /// @param _tradeId The trade ID
    function getTrade(uint256 _tradeId)
        external
        view
        returns (NftTrade memory trade_)
    {
        trade_ = trades[_tradeId];
    }

    /// @dev get the deposited amount
    /// @param _seller the NFT seller address
    function getDepositedAmt(address _seller) external view returns (uint256) {
        return depositedAmt[_seller];
    }

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

    /// @dev add a trade with nft and price for selling (Must have approved to this contract for transferring NFT)
    /// @param _nft The Nft collection address
    /// @param _tokenId The Nft`s token Id
    /// @param _price The ETH amount of NFT price
    function addTrade(
        address _nft,
        uint256 _tokenId,
        uint256 _price
    ) external virtual nonReentrant returns (uint256 tradeId_) {
        if (_nft == address(0)) revert NftContractAsZeroAddress();
        if (_price == 0) revert NftPriceAsZero();

        // check nft owner
        IERC721 nftCollection = IERC721(_nft);
        if (nftCollection.ownerOf(_tokenId) != msg.sender)
            revert TradeForNotOwner();

        tradeId_ = tradeCounter;
        trades[tradeId_] = NftTrade({
            nft: _nft,
            tokenId: _tokenId,
            seller: msg.sender,
            price: _price,
            feePt: feePt,
            status: NftTradeStatus.Open
        });

        ++tradeCounter;
        // lock nft to the market
        nftCollection.transferFrom(msg.sender, address(this), _tokenId);

        emit AddTrade(_nft, _tokenId, _price);
    }

    /// @dev update a trade with new price
    /// @param _tradeId The trade Id
    /// @param _price The new price
    function updateTrade(uint256 _tradeId, uint256 _price) external virtual {
        NftTrade storage trade = trades[_tradeId];
        if (trade.seller != msg.sender) revert TradeForNotOwner();
        if (trade.status != NftTradeStatus.Open) revert TradeStatusNotOpen();

        // update price
        trade.price = _price;

        emit UpdateTrade(_tradeId, _price);
    }

    /// @dev close a trade
    /// @param _tradeId The Nft trade Id
    function closeTrade(uint256 _tradeId) external virtual {
        NftTrade storage trade = trades[_tradeId];
        if (trade.seller != msg.sender) revert TradeForNotOwner();
        if (trade.status != NftTradeStatus.Open) revert TradeStatusNotOpen();

        // update trade state
        trade.status = NftTradeStatus.Closed;

        // return nft to seller
        IERC721(trade.nft).transferFrom(
            address(this),
            trade.seller,
            trade.tokenId
        );

        emit CloseTrade(_tradeId);
    }

    /// @dev buy NFT with native coin
    function buyNft(uint256 _tradeId) external payable virtual nonReentrant {
        NftTrade storage trade = trades[_tradeId];
        if (msg.value < trade.price) revert BuyNftWithInsufficient();
        if (trade.status != NftTradeStatus.Open) revert TradeStatusNotOpen();

        trade.status = NftTradeStatus.Closed;

        // trasnsfer ownership from market to buyer
        IERC721(trade.nft).transferFrom(
            address(this),
            msg.sender,
            trade.tokenId
        );

        // calculate fee and deposited amount
        uint256 reservePrice = (trade.price * (MAX_PERCENTAGE - trade.feePt)) /
            MAX_PERCENTAGE;
        depositedAmt[trade.seller] += reservePrice;
        depositedFeeAmt += msg.value - reservePrice;

        emit BuyNft(_tradeId, msg.value);
    }

    /// @dev buy NFTs with native coin
    function buyNfts(uint256[] calldata _tradeIds)
        external
        payable
        virtual
        nonReentrant
    {
        if (_tradeIds.length == 0) revert InvalidParams();

        uint256 allPrice = 0;
        uint256 reserveAllPrice = 0;
        for (uint256 i = 0; i < _tradeIds.length; ++i) {
            NftTrade storage trade = trades[_tradeIds[i]];
            if (trade.status != NftTradeStatus.Open)
                revert TradeStatusNotOpen();

            trade.status = NftTradeStatus.Closed;

            // trasnsfer ownership from market to buyer
            IERC721(trade.nft).transferFrom(
                address(this),
                msg.sender,
                trade.tokenId
            );

            uint256 reservePrice = (trade.price *
                (MAX_PERCENTAGE - trade.feePt)) / MAX_PERCENTAGE;
            depositedAmt[trade.seller] += reservePrice;
            reserveAllPrice += reservePrice;
            allPrice += trade.price;
        }

        if (msg.value < allPrice) revert BuyNftWithInsufficient();
        depositedFeeAmt += msg.value - reserveAllPrice;

        emit BuyNfts(_tradeIds, msg.value);
    }

    /// @dev withdraw ETH from market to seller
    /// @param _seller the seller address
    function withdraw(address _seller, uint256 _amount)
        external
        payable
        virtual
        nonReentrant
    {
        if (_seller == address(0)) revert WithdrawToZeroAddress();
        if (_amount == 0) revert WithdrawZeroAmount();
        if (depositedAmt[_seller] < _amount)
            revert WithdrawInsufficientDeposited();

        depositedAmt[_seller] -= _amount;
        // withdraw
        payable(_seller).transfer(_amount);

        emit Withdraw(_seller, _amount);
    }

    /// @dev withdraw Fee from market to treasury
    function withdrawFee(uint256 _amount)
        external
        payable
        virtual
        nonReentrant
    {
        if (_amount == 0) revert WithdrawZeroAmount();
        if (depositedFeeAmt == 0) revert WithdrawFeeZeroAmount();

        depositedFeeAmt -= _amount;
        // withdraw fee
        payable(treasury).transfer(depositedFeeAmt);

        emit WithdrawFee(treasury, _amount);
    }

    // ******************  Receive Ether functions  ********************
    receive() external payable {
        emit Receive(msg.value);
    }
}
