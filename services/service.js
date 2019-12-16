const _ = require("lodash");
const XDC3 = require("xdc3");
const argv = require("yargs").argv;
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ipfsConfig = require("../config/ipfs-config").getConfig("xinfin"); // to be replaced by process.env.IPFS_CONFIG
const ipfs = require("ipfs-http-client");
const ipfsClient = new ipfs(ipfsConfig);

let network = "http://rpc.apothem.network";
if (!_.isEmpty(argv["httpProvider"])) {
  network = argv["httpProvider"];
}
const xdc3 = new XDC3(new XDC3.providers.HttpProvider(network));

exports.generateContract = (req, res) => {
  try {
    console.log("called generateContract");
    // generate contract code.
    const ipfsHash = req.body.ipfsHash;
    const instrumentType = req.body.instrumentType;
    const amount = req.body.amount;
    const currencySupported = req.body.currencySupported;
    const maturityDate = req.body.maturityDate;
    const name = req.body.name;
    const country = req.body.country;
    if (
      _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(name) ||
      _.isEmpty(country)
    ) {
      return res.status(400).json({ status: false, error: "bad" });
    }
    let contractTemplate = fs.readFileSync(
      path.join(__dirname, "../contracts/Invoice_template.sol")
    );
    contractTemplate = contractTemplate.toString();
    contractTemplate = contractTemplate.replace("_ipfsHash_", ipfsHash);
    contractTemplate = contractTemplate.replace(
      "_instrumentType_",
      instrumentType
    );
    contractTemplate = contractTemplate.replace("_amount_", amount);
    contractTemplate = contractTemplate.replace(
      "_currencySupported_",
      currencySupported
    );
    contractTemplate = contractTemplate.replace("_maturityDate_", maturityDate);
    contractTemplate = contractTemplate.replace("_name_", name);
    contractTemplate = contractTemplate.replace("_country_", country);
    return res.json({ status: true, error: null, contract: contractTemplate });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: false, error: "internal error" });
  }
};

exports.uploadDoc = async (req, res) => {
  if (_.isEmpty(req.body) || _.isEmpty(req.body.data)) {
    res.status(400).json({ status: false, error: "bad request" });
    return;
  }
  try {
    const fileBase64 = req.body.data;
    const fileBuffer = new Buffer.from(fileBase64, "base64");
    if (_.isEmpty(fileBuffer) || typeof fileBuffer !== "object") {
      res.status(400).json({ status: false, error: "invalid request" });
      return;
    }
    ipfsClient.add(fileBuffer, async (err, ipfsHash) => {
      if (err !== null) {
        console.log("error while uploading to IPFS");
        csonole.log(err);
        return res.json({ error: "internal error", status: false });
      }
      res.json({ status: true, hash: ipfsHash[0].hash });
    });
  } catch (e) {
    console.log("exception ", e);
    return res.json({ status: false, error: "internal error" });
  }
};

exports.deployContract = async (req, res) => {
  try {
    console.log("called deployContract");
    // generate contract code.
    const ipfsHash = req.body.ipfsHash;
    const instrumentType = req.body.instrumentType;
    const amount = req.body.amount;
    const currencySupported = req.body.currencySupported;
    const maturityDate = req.body.maturityDate;
    const name = req.body.name;
    const country = req.body.country;
    const privKey = req.body.privKey;
    if (
      _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(name) ||
      _.isEmpty(country)
    ) {
      return res.status(400).json({ status: false, error: "bad" });
    }

    let contractTemplate = fs.readFileSync(
      path.join(__dirname, "../contracts/Invoice_template.sol")
    );
    contractTemplate = contractTemplate.toString();
    contractTemplate = contractTemplate.replace("_ipfsHash_", ipfsHash);
    contractTemplate = contractTemplate.replace(
      "_instrumentType_",
      instrumentType
    );
    contractTemplate = contractTemplate.replace("_amount_", amount);
    contractTemplate = contractTemplate.replace(
      "_currencySupported_",
      currencySupported
    );
    contractTemplate = contractTemplate.replace("_maturityDate_", maturityDate);
    contractTemplate = contractTemplate.replace("_name_", name);
    contractTemplate = contractTemplate.replace("_country_", country);

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
            "": ["legacyAST", "ast"],
            "*": [
              "abi",
              "evm.bytecode.object",
              "evm.bytecode.sourceMap",
              "evm.deployedBytecode.object",
              "evm.deployedBytecode.sourceMap",
              "evm.gasEstimates"
            ]
          }
        }
      }
    };
    console.log(contractTemplate);
    solcInput = JSON.stringify(solcInput);
    var contractObject = solc.compile(solcInput);
    contractObject = JSON.parse(contractObject);
    const abi = contractObject.contracts.contract.DocContract.abi;
    const byteCode =
      contractObject.contracts.contract.DocContract.evm.bytecode.object;
    deploy(
      JSON.stringify(abi),
      byteCode.toString(),
      privKey,
      (deployed, error, receipt) => {
        if (deployed !== true) {
          return res.json({ error: error, status: false, receipt: null });
        } else {
          return res.json({ error: null, status: true, receipt: receipt });
        }
      }
    );
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: false, error: "internal error" });
  }
};

async function deploy(abi, bin, privKey, callback) {
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
          callback(true, null, receipt);
        } else {
          console.log("error");
          console.log("contract execution failed");
          console.log("receipt: ", receipt);
          callback(false, "contract execution failed", null);
        }
      })
      .catch(e => {
        console.log("error");
        console.log("contract execution failed");
        console.error(e);
        callback(false, "contract execution failed", null);
      });
  } catch (e) {
    console.log("error");
    console.log("error at deploy, ", e);
    callback(false, "exception", null);
  }
}
