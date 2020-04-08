pragma solidity ^0.5.14;


contract DocContract {
    address public owner;
    constructor() public {
        owner  = msg.sender;
    }
    
    string public ipfsHash = "_ipfsHash_";
    string public amount = "_amount_";
    string public currencySupported = "_currencySupported_";
    string public docRef = "_docRef_";
    string public country = "_country_";
    string public name = "_name_";
    string public manufacturingMethod = "_manuMethod_";
    string public materialType = "_materialType_";
    

    function getData() public view returns(string memory,string memory,string memory,string memory,string memory,string memory,string memory) {
        return (amount,currencySupported,docRef,country, name,manufacturingMethod,materialType);
    }

    function getDocHash() public view returns (string memory) {
        return (ipfsHash);
    }
}
    
    