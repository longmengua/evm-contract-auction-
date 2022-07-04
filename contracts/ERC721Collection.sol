//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ERC721Collection is ERC721URIStorage, Ownable {
    using Strings for uint256;

    // The tokenId of the next token to be minted.
    uint256 public currentIndex;
    // The number of tokens burned.
    uint256 public burnCounter;
    // mapping of the token URI hash to exist flag
    mapping(bytes32 => bool) private tokenExists;

    // mint counter
    uint256 public mintCounter;
    // mint URI Prefix
    string public mintURIPrefix = "";
    // Token Mint Price
    uint256 public mintPrice;
    // Token Max Supply
    uint256 public mintMaxSupply;
    // Pause Flag
    bool public paused;

    // ******************  Errors  *****************************

    error TokenURIEmpty();
    error TokenExist();
    error TokenNotExist();
    error PauseSameFlag();
    error URIPrefixEmpty();
    error MaxSupplyZero();
    error MintOverMaxSupply();
    error MintInsufficientFund();
    error MintPaused();
    error MintInvalidAmount();

    // ******************  Events  *****************************

    event SetMintConfig(string prefix, uint256 price, uint256 maxSupply);
    event SetPaused(bool oldState, bool newState);
    event SetTokenURI(uint256 tokenId, string tokenUri);

    // ******************  Modifiers  **************************

    modifier mintCompliance(uint256 _mintAmount) {
        if (bytes(mintURIPrefix).length == 0) revert URIPrefixEmpty();
        if (mintCounter + _mintAmount > mintMaxSupply) revert MintOverMaxSupply();
        _;
    }

    modifier mintPriceCompliance(uint256 _mintAmount) {
        if (_msgSender() != owner() && msg.value < mintPrice * _mintAmount) revert MintInsufficientFund();
        _;
    }

    // ******************  Constructor  ************************
    /// @dev construct the nft collection
    /// @param _name NFT name
    /// @param _symbol NFT symbol
    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    /// @dev mint NFT
    /// @param _to The receiver
    /// @param _tokenURI The token URI
    function mintTo(address _to, string memory _tokenURI) external onlyOwner {
        if (bytes(_tokenURI).length == 0) revert TokenURIEmpty();

        // check token exist
        bytes32 uriHash = keccak256(abi.encodePacked(_tokenURI));
        if (tokenExists[uriHash] == true) revert TokenExist();

        // mint with Token URI
        tokenExists[uriHash] = true;

        unchecked {
            currentIndex++;
        }

        _mint(_to, currentIndex);
        _setTokenURI(currentIndex, _tokenURI);
    }

    /// total supply of NFT
    function totalSupply() external view returns (uint256) {
        return currentIndex - burnCounter;
    }

    function burn(uint256 _tokenId) external onlyOwner {
        bytes32 _uriHash = keccak256(abi.encodePacked(tokenURI(_tokenId)));
        if (!tokenExists[_uriHash]) revert TokenNotExist();

        // Overflow not possible, as burnCounter cannot be exceed currentIndex times.
        unchecked {
            burnCounter++;
        }

        delete tokenExists[_uriHash];
        _burn(_tokenId);
    }

    // set mint config by collection owner
    /// @dev set NFT URI Prefix by only collection owner
    /// @param _mintURIPrefix The prefix string of minting
    /// @param _mintPrice The price of minting
    /// @param _mintMaxSupply The max supply of minting
    function setMintConfig(string memory _mintURIPrefix, uint256 _mintPrice, uint256 _mintMaxSupply) external onlyOwner {
        if (bytes(_mintURIPrefix).length == 0) revert URIPrefixEmpty();
        if (_mintMaxSupply == 0) revert MaxSupplyZero();

        mintURIPrefix = _mintURIPrefix;
        mintPrice = _mintPrice;
        mintMaxSupply = _mintMaxSupply;
        mintCounter = 0;

        emit SetMintConfig(_mintURIPrefix, _mintPrice, _mintMaxSupply);
    }

    // mint
    /// @dev mint nft by owner/anyone. If owner mint nft, do not pay ETH, if others mint nft, should pay ETH same as mint price
    /// @param _mintAmount The quantity of nfts for minting
    function mint(uint256 _mintAmount) external payable mintCompliance(_mintAmount) mintPriceCompliance(_mintAmount) {
        if (_mintAmount == 0) revert MintInvalidAmount();
        if (paused) revert MintPaused();

        uint256 mCounter = mintCounter;
        uint256 mCurrentIndex = currentIndex;
        for(uint256 i =0; i<_mintAmount; i++){
            string memory _tokenURI = string(abi.encodePacked(
                mintURIPrefix,
                mCounter.toString(),
                ".json"
            ));

            unchecked {
                mCounter++;
                mCurrentIndex++;
            }

            // check duplicated
            bytes32 uriHash = keccak256(abi.encodePacked(_tokenURI));
            if (tokenExists[uriHash] == true) revert TokenExist();

            // mint token
            tokenExists[uriHash] = true;
            _mint(_msgSender(), mCurrentIndex);
            _setTokenURI(mCurrentIndex, _tokenURI);
        }

        // update states
        mintCounter = mCounter;
        currentIndex = mCurrentIndex;
    }

    /// @dev set Pause flag by only collection owner
    /// @dev _state the flag
    function setPaused(bool _state) external onlyOwner {
        if (paused == _state) revert PauseSameFlag();

        emit SetPaused(paused, _state);

        paused = _state;
    }

    /// @dev set token URI(updating NFT)
    /// @param _tokenId token Id
    /// @param _tokenURI token URI
    function setTokenURI(uint256 _tokenId, string memory _tokenURI) external onlyOwner {
        if (bytes(_tokenURI).length == 0) revert TokenURIEmpty();

        // check token exist
        bytes32 newUriHash = keccak256(abi.encodePacked(_tokenURI));
        if (tokenExists[newUriHash] == true) revert TokenExist();

        bytes32 originUriHash = keccak256(abi.encodePacked(tokenURI(_tokenId)));

        // update checking map
        tokenExists[originUriHash] = false;
        tokenExists[newUriHash] = true;
        // set Token URI
        _setTokenURI(_tokenId, _tokenURI);

        emit SetTokenURI(_tokenId, _tokenURI);
    }
}
