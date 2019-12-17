pragma solidity ^0.5.14;


contract DocContract {
    address public owner;
    constructor() public {
        owner  = msg.sender;
    }
    
    string public ipfsHash = "_ipfsHash_";
    string public instrumentType = "_instrumentType_";
    string public amount = "_amount_";
    string public currencySupported = "_currencySupported_";
    string public maturityDate = "_maturityDate_";
    string public docRef = "_docRef_";
    string public country = "_country_";
    string public name = "_name_";
  

    function getData() public view returns(string memory,string memory,string memory,string memory,string memory,string memory,string memory) {
        return (instrumentType,amount,currencySupported,maturityDate,docRef,country, name);
    }

    function getDocHash() public view returns (string memory) {
        return (ipfsHash);
    }
}
    
    