// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuditAnchor {

    struct AuditRecord {
        uint transactionId;
        string hashValue;
        uint timestamp;
    }

    AuditRecord[] public records;

    function storeAudit(uint txId, string memory hashValue) public {

        records.push(
            AuditRecord({
                transactionId: txId,
                hashValue: hashValue,
                timestamp: block.timestamp
            })
        );
    }

    function getRecord(uint index) public view returns(uint,string memory,uint) {
        AuditRecord memory r = records[index];
        return (r.transactionId, r.hashValue, r.timestamp);
    }

    function totalRecords() public view returns(uint){
        return records.length;
    }
}