// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract QieCheckout {
    struct Invoice { address payable payee; uint256 amount; bool paid; uint64 createdAt; }
    uint256 public nextId;
    mapping(uint256 => Invoice) public invoices;
    mapping(address => uint256) public merchantRevenue;
    event InvoiceCreated(uint256 indexed id, address indexed payee, uint256 amount);
    event InvoicePaid(uint256 indexed id, address indexed payer, uint256 amount);
    event SplitPayout(address[] payees, uint256[] amounts);
    function createInvoice(address payee, uint256 amount) external returns (uint256 id) {
        id = nextId++;
        invoices[id] = Invoice(payable(payee), amount, false, uint64(block.timestamp));
        emit InvoiceCreated(id, payee, amount);
    }
    function payInvoice(uint256 id) external payable {
        Invoice storage inv = invoices[id];
        require(!inv.paid, "already paid");
        require(msg.value >= inv.amount, "insufficient payment");
        inv.paid = true;
        merchantRevenue[inv.payee] += msg.value;
        inv.payee.transfer(msg.value);
        emit InvoicePaid(id, msg.sender, msg.value);
    }
    function splitPayout(address[] calldata payees, uint256[] calldata amounts) external payable {
        require(payees.length == amounts.length, "length mismatch");
        uint256 total; for (uint256 i = 0; i < amounts.length; i++) total += amounts[i];
        require(msg.value >= total, "insufficient funds");
        for (uint256 i = 0; i < payees.length; i++) { payable(payees[i]).transfer(amounts[i]); merchantRevenue[payees[i]] += amounts[i]; }
        emit SplitPayout(payees, amounts);
    }
    function getInvoice(uint256 id) external view returns (address payee, uint256 amount, bool paid, uint64 createdAt) {
        Invoice storage inv = invoices[id]; return (inv.payee, inv.amount, inv.paid, inv.createdAt);
    }
}
