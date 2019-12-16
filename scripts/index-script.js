"use strict";
const argv = require("yargs").argv;
const _ = require("lodash");
const fs = require("fs");
const solc = require("solc");

const XDC3 = require("xdc3");
let network = "http://rpc.apothem.network";

// default is http://rpc.apothem.network
if (!_.isEmpty(argv["httpProvider"])) {
  network = argv["httpProvider"];
}

if (_.isEmpty(argv["func"])) {
  console.log("error");
  console.log(`[*] invalid function, quiting`);
  process.exit(1);
  return;
}

// node index.js --func=gener
// ateContract --IPFS_HASH=a --LOC_FORM=a --LOC_NUMBER=a --LOC_DATE_OF_EXPIRY=a --LOC_APPLICANT_BANK=a --LOC_AP
// PLICANT=a
// test privKey : 0x88e93c26420e3952c5dc3809ec9d4d6f5b9fb8c01b15326c49e12fff4e2c3c3d
const xdc3 = new XDC3(new XDC3.providers.HttpProvider(network));
// prettier-ignore
switch (argv["func"]) {
  case "generateContract": {
    //   IPFS_HASH,
    // LOC_FORM,
    // LOC_NUMBER,
    // LOC_DATE_OF_EXPIRY,
    // LOC_APPLICANT_BANK,
    // LOC_APPLICANT
    if (
      _.isEmpty(argv["IPFS_HASH"]) ||
      _.isEmpty(argv["LOC_FORM"]) ||
      _.isEmpty(argv["LOC_NUMBER"]) ||
      _.isEmpty(argv["LOC_DATE_OF_EXPIRY"]) ||
      _.isEmpty(argv["LOC_APPLICANT_BANK"]) ||
      _.isEmpty(argv["LOC_APPLICANT"])
    ) {
      console.log("error");
      console.log("missing parameters");
      return;
    }
    try {
      let contractTemplate = fs.readFileSync("./contracts/LC_template.sol");
      contractTemplate = contractTemplate.toString();
      contractTemplate.replace("_ipfs_hash_val", argv["IPFS_HASH"]);
      contractTemplate.replace("_loc_form_val", argv["LOC_FORM"]);
      contractTemplate.replace("_loc_number_val", argv["LOC_NUMBER"]);
      contractTemplate.replace("_loc_date_val", argv["LOC_DATE_OF_EXPIRY"]);
      contractTemplate.replace(
        "_loc_applicant_bank_name_val",
        argv["LOC_APPLICANT_BANK"]
      );
      contractTemplate.replace("_loc_applicant_val", argv["LOC_APPLICANT"]);

      console.log(contractTemplate);
      return;
    } catch (e) {
      console.log("error")
      console.error("error occured at helpers.generateContarct");
      console.error(e.toString());
      return;
    }
  }
  case "deployContarct": {
    if (
      _.isEmpty(argv["IPFS_HASH"]) ||
      _.isEmpty(argv["LOC_FORM"]) ||
      _.isEmpty(argv["LOC_NUMBER"]) ||
      _.isEmpty(argv["LOC_DATE_OF_EXPIRY"]) ||
      _.isEmpty(argv["LOC_APPLICANT_BANK"]) ||
      _.isEmpty(argv["LOC_APPLICANT"]) || 
      _.isEmpty(argv["privKey"])
    ) {
      console.log("error");
      console.log("missing parameters");
      return;
    }
    try {
      let contractTemplate = fs.readFileSync("./contracts/LC_template.sol");
      contractTemplate = contractTemplate.toString();
      contractTemplate=contractTemplate.replace("_ipfs_hash_val", argv["IPFS_HASH"]);
      contractTemplate=contractTemplate.replace("_loc_form_val", argv["LOC_FORM"]);
      contractTemplate=contractTemplate.replace("_loc_number_val", argv["LOC_NUMBER"]);
      contractTemplate=contractTemplate.replace("_loc_date_val", argv["LOC_DATE_OF_EXPIRY"]);
      contractTemplate=contractTemplate.replace(
        "_loc_applicant_bank_name_val",
        argv["LOC_APPLICANT_BANK"]
      );
      contractTemplate=contractTemplate.replace("_loc_applicant_val", argv["LOC_APPLICANT"]);

      var solcInput = {
        language: "Solidity",
        sources: { 
            contract: {
                content: contractTemplate
            }
         },
        settings: {
            optimizer: {
                enabled: true
            },
            evmVersion: "byzantium",
            outputSelection: {
                "*": {
                  "": [
                    "legacyAST",
                    "ast"
                  ],
                  "*": [
                    "abi",
                    "evm.bytecode.object",
                    "evm.bytecode.sourceMap",
                    "evm.deployedBytecode.object",
                    "evm.deployedBytecode.sourceMap",
                    "evm.gasEstimates"
                  ]
                },
            }
        }
    };
    solcInput = JSON.stringify(solcInput);
    var contractObject = solc.compile(solcInput);
    contractObject = JSON.parse(contractObject);
    const abi = contractObject.contracts.contract.DocContract.abi;
    const byteCode = contractObject.contracts.contract.DocContract.evm.bytecode.object;
    deploy(JSON.stringify(abi),byteCode.toString(),argv["privKey"]);
      return;
    } catch (e) {
      console.log("error");
      console.error("error occured at helpers.generateContarct");
      console.error(e.toString());
      return;
    }
  }
}

async function deploy(abi, bin, privKey) {
  try {
    const abiJSON = JSON.parse(abi.trim());
    let contract = new xdc3.eth.Contract(abiJSON);
    let deploy = contract.deploy({ data: "0x" + bin }).encodeABI();
    const account = xdc3.eth.accounts.privateKeyToAccount(privKey);
    const nonce = await xdc3.eth.getTransactionCount(account.address);
    const gasPrice = await xdc3.eth.getGasPrice();
    const estimateGas = await xdc3.eth.estimateGas({ data: deploy });
    let rawTx = {
      from: account.address,
      data: deploy,
      gas: estimateGas,
      gasPrice: gasPrice,
      nonce: nonce,
      chainId: 51
    };
    let signedTransaction = await xdc3.eth.accounts.signTransaction(
      rawTx,
      privKey
    );
    xdc3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on("receipt", receipt => {
        if (receipt.status === true) {
          console.log(receipt.contractAddress);
        } else {
          console.log("error");
          console.log("contract execution failed");
          console.log("receipt: ", receipt);
        }
      })
      .catch(e => {
        console.log("error");
        console.log("contract execution failed");
        console.error(e);
      });
  } catch (e) {
    console.log("error");
    console.log("error at deply, ", e);
  }
}
