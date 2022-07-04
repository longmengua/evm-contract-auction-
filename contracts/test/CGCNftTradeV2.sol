//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../Trade.sol";

contract TradeV2 is Trade {
    error V2SetTreasuryNotPermission();

    /// @dev override setTreasury function
    /// @notice set treasury address by only treasury
    function setTreasury(address _treasury) external override {
        if (_treasury != treasury) revert V2SetTreasuryNotPermission();
        treasury = _treasury;
    }
}
