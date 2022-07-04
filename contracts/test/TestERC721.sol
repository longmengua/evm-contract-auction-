//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TestERC721 is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {}

    function mint(address recipient, string memory tokenURI)
        external
        onlyOwner
        returns (uint256)
    {
        require(recipient != address(0), "Mint address is zero address");
        require(bytes(tokenURI).length > 0, "Mint uri is empty");

        uint256 newItemId = _tokenIds.current();

        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        _tokenIds.increment();

        return newItemId;
    }
}
