pragma solidity ^0.5.14;

contract Ownable {
    address public Owner;
    constructor() public {
        Owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == Owner,"Ownable: not valid owner");
        _;
    }
}

contract DocContract is Ownable {
    string private IPFS_HASH = "_ipfs_hash_val";
    string private LOC_FORM = "_loc_form_val";
    string private LOC_NUMBER = "_loc_number_val";
    string private LOC_DATE_OF_EXPIRY = "_loc_date_val";
    string private LOC_APPLICANT_BANK = "_loc_applicant_bank_name_val";
    string private LOC_APPLICANT = "_loc_applicant_val";

    function getData() public onlyOwner view returns(string memory,string memory,string memory,string memory,string memory,string memory) {
        return (IPFS_HASH,LOC_FORM,LOC_NUMBER,LOC_DATE_OF_EXPIRY,LOC_APPLICANT_BANK,LOC_APPLICANT);
    }
}
    
    