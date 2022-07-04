//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721ACollection is ERC721A, Ownable {
    using Strings for uint256;

    // Token URI Prefix
    string public uriPrefix = "";
    // Token URI Suffix
    string public uriSuffix = ".json";
    // Token Mint Price
    uint256 public mintPrice;
    // Token Max Supply
    uint256 public maxSupply;
    // Pause Flag
    bool public paused;

    // ******************  Errors  *****************************

    error MaxSupplyZero();
    error URIPrefixEmpty();
    error MintInvalidAmount();
    error MintMaxSupply();
    error MintInsufficientFund();
    error MintPaused();
    error PauseSameFlag();

    // ******************  Events  *****************************

    event SetMintPrice(uint256 oldPrice, uint256 newPrice);
    event SetUriPrefix(string oldPrefix, string newPrefix);
    event SetUriSuffix(string oldURISuffix, string newURISuffix);
    event SetPaused(bool oldState, bool newState);

    // ******************  Modifiers  **************************

    modifier mintCompliance(uint256 _mintAmount) {
        if (totalSupply() + _mintAmount > maxSupply) revert MintMaxSupply();
        _;
    }

    modifier mintPriceCompliance(uint256 _mintAmount) {
        if (msg.value < mintPrice * _mintAmount) revert MintInsufficientFund();
        _;
    }

    // ******************  Constructor  ************************
    /// @dev construct nft collection
    /// @param _tokenName The token name
    /// @param _tokenSymbol The token symbol
    /// @param _mintPrice The mint price
    /// @param _maxSupply The nft max supply
    /// @param _uriPrefix The prefix of nft uri
    constructor(
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _mintPrice,
        uint256 _maxSupply,
        string memory _uriPrefix
    ) ERC721A(_tokenName, _tokenSymbol) {
        if (_maxSupply == 0) revert MaxSupplyZero();
        if (bytes(_uriPrefix).length == 0) revert URIPrefixEmpty();

        mintPrice = _mintPrice;
        maxSupply = _maxSupply;
        uriPrefix = _uriPrefix;
    }

    function mint(uint256 _mintAmount)
        external
        payable
        mintCompliance(_mintAmount)
        mintPriceCompliance(_mintAmount)
    {
        if (paused) revert MintPaused();

        _safeMint(_msgSender(), _mintAmount);
    }

    function mintTo(address to, uint256 _mintAmount)
        external
        mintCompliance(_mintAmount)
        onlyOwner
    {
        _safeMint(to, _mintAmount);
    }

    /// @dev get the token URI
    /// @param _tokenId The NFT token Id
    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        if (!_exists(_tokenId)) revert URIQueryForNonexistentToken();

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        _tokenId.toString(),
                        uriSuffix
                    )
                )
                : "";
    }

    /// @dev get the tokenIds of NFTs owned by _owner
    /// @param _owner NFT owner address
    function tokenIdsOf(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
        uint256 currentTokenId = 0;
        uint256 ownedTokenIndex = 0;
        address latestOwnerAddress;

        while (
            ownedTokenIndex < ownerTokenCount && currentTokenId < _currentIndex
        ) {
            TokenOwnership memory ownership = _ownerships[currentTokenId];

            if (!ownership.burned) {
                if (ownership.addr != address(0)) {
                    latestOwnerAddress = ownership.addr;
                }

                if (latestOwnerAddress == _owner) {
                    ownedTokenIds[ownedTokenIndex] = currentTokenId;

                    ownedTokenIndex++;
                }
            }

            currentTokenId++;
        }

        return ownedTokenIds;
    }

    /// @dev set mint price by only collection owner
    /// @param _mintPrice The mint price (ETH)
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        emit SetMintPrice(mintPrice, _mintPrice);

        mintPrice = _mintPrice;
    }

    /// @dev set NFT URI Prefix by only collection owner
    /// @param _uriPrefix The prefix string
    function setUriPrefix(string memory _uriPrefix) external onlyOwner {
        if (bytes(_uriPrefix).length == 0) revert URIPrefixEmpty();

        emit SetUriPrefix(uriPrefix, _uriPrefix);

        uriPrefix = _uriPrefix;
    }

    /// @dev set NFT URI suffix by only collection owner
    /// @param _uriSuffix URI suffix string
    function setUriSuffix(string memory _uriSuffix) external onlyOwner {
        emit SetUriSuffix(uriSuffix, _uriSuffix);

        uriSuffix = _uriSuffix;
    }

    /// @dev set Pause flag by only collection owner
    /// @dev _state the flag
    function setPaused(bool _state) external onlyOwner {
        if (paused == _state) revert PauseSameFlag();

        emit SetPaused(paused, _state);

        paused = _state;
    }

    /// @dev get the NFT base URI (overrided)
    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }
}
