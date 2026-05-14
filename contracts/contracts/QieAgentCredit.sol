// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// AgentScore-based credit line for AI agents on QIE.
// Score 0-1000 from TollGate receipt history. Tier thresholds:
// Bronze<400 (no credit) / Silver>=400 (10 QIE) / Gold>=700 (50 QIE) / Platinum>=850 (200 QIE)
contract QieAgentCredit {
    address public owner;

    struct CreditLine {
        uint256 score;
        uint256 limitWei;
        uint256 borrowedWei;
        uint256 updatedAt;
        bool    active;
    }

    mapping(address => CreditLine) public lines;

    event ScoreUpdated(address indexed agent, uint256 score, uint256 limitWei);
    event CreditBorrowed(address indexed agent, uint256 amount, uint256 outstanding);
    event CreditRepaid(address indexed agent, uint256 amount, uint256 outstanding);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    constructor() { owner = msg.sender; }

    function updateScore(address agent, uint256 score) external onlyOwner {
        require(score > 0 && score <= 1000, "score out of range");
        uint256 limit = _scoreToLimit(score);
        lines[agent] = CreditLine({ score: score, limitWei: limit, borrowedWei: lines[agent].borrowedWei, updatedAt: block.timestamp, active: true });
        emit ScoreUpdated(agent, score, limit);
    }

    function borrow(uint256 amount) external {
        CreditLine storage l = lines[msg.sender];
        require(l.active, "no credit line");
        require(l.borrowedWei + amount <= l.limitWei, "exceeds limit");
        l.borrowedWei += amount;
        payable(msg.sender).transfer(amount);
        emit CreditBorrowed(msg.sender, amount, l.borrowedWei);
    }

    function repay() external payable {
        CreditLine storage l = lines[msg.sender];
        require(l.borrowedWei > 0, "nothing to repay");
        uint256 repaid = msg.value <= l.borrowedWei ? msg.value : l.borrowedWei;
        l.borrowedWei -= repaid;
        emit CreditRepaid(msg.sender, repaid, l.borrowedWei);
    }

    function getLine(address agent) external view returns (uint256 score, uint256 limitWei, uint256 borrowedWei, uint256 availableWei, bool active) {
        CreditLine storage l = lines[agent];
        uint256 avail = l.limitWei > l.borrowedWei ? l.limitWei - l.borrowedWei : 0;
        return (l.score, l.limitWei, l.borrowedWei, avail, l.active);
    }

    function _scoreToLimit(uint256 s) internal pure returns (uint256) {
        if (s >= 850) return 200 ether;
        if (s >= 700) return  50 ether;
        if (s >= 400) return  10 ether;
        return 0;
    }

    receive() external payable {}
    function withdraw(uint256 amount) external onlyOwner { payable(owner).transfer(amount); }
}
