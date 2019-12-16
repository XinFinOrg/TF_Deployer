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
    string private ipfsHash = "_ipfsHash_";
    string private instrumentType = "_instrumentType_";
    string private amount = "_amount_";
    string private currencySupported = "_currencySupported_";
    string private maturityDate = "_maturityDate_";
    string private name = "_name_";
    string private country = "_country_";
    string[] allTempHash;
    struct TempHash {
        address[] recipients;
        string DAE;
    }
    mapping(string => TempHash) private tempView;

    function getData() public onlyOwner view returns(string memory,string memory,string memory,string memory,string memory,string memory,string memory) {
        return (ipfsHash,instrumentType,amount,currencySupported,maturityDate,name,country);
    }

    function addTempView(string memory _ipfsHash, address _recipient,string memory _dae ) onlyOwner public {
        require(!isRecipient(_ipfsHash,_recipient),"addTempView: already owner");
        allTempHash.push(_ipfsHash);
        tempView[_ipfsHash].recipients.push(_recipient);
        tempView[_ipfsHash].DAE=_dae;
    }
    
    function addRecipient(string memory _ipfsHash, address _recipient) onlyOwner public {
        require(tempHashExists(_ipfsHash),"isRecipient: hash does not exists");
        require(!isRecipient(_ipfsHash,_recipient),"addTempView: already owner");
        tempView[_ipfsHash].recipients.push(_recipient);
    }
    
    function getTempDoc() public view returns (string memory hash) {
        for (uint x=0;x<allTempHash.length;x++){
            if (isRecipient(allTempHash[x],msg.sender)){
                return allTempHash[x];
            }
        }
        return "";
    }
    
    function isRecipient(string memory _ipfsHash,address _recipient) internal view returns(bool){
        TempHash memory currReci = tempView[_ipfsHash];
        for (uint x=0;x<currReci.recipients.length;x++){
            if (_recipient == currReci.recipients[x]){
                return true;
            }
        }
        return false;
    }

    function getTempHashDAE(string memory _ipfsHash) public view returns (string memory) {
        require(tempHashExists(_ipfsHash),"temp hash does not exist");
        return tempView[_ipfsHash].DAE;
    }

    function tempHashExists(string memory _ipfsHash) internal view returns (bool) {
        for (uint i=0;i<allTempHash.length;i++){
            if (strCompare(_ipfsHash,allTempHash[i]) == 0){
                return true;
            }
        }
        return false;
    }
    
        // Credit for this function goes to https://github.com/provable-things/ethereum-api/blob/master/oraclizeAPI_0.5.sol
    function strCompare(string memory _a, string memory _b) internal pure returns(int _returnCode) {
        bytes memory a = bytes(_a);
        bytes memory b = bytes(_b);
        uint minLength = a.length;
        if (b.length < minLength) {
            minLength = b.length;
        }
        for (uint i = 0; i < minLength; i++) {
            if (a[i] < b[i]) {
                return -1;
            } else if (a[i] > b[i]) {
                return 1;
            }
        }
        if (a.length < b.length) {
            return -1;
        } else if (a.length > b.length) {
            return 1;
        } else {
            return 0;
        }
    }
}
    
    