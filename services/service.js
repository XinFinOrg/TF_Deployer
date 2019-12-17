const _ = require("lodash");
const Web3 = require("web3");
const XDC3 = require("xdc3");
const argv = require("yargs").argv;
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ipfs = require("ipfs-http-client");
const contractAbi = require("../config/contractAbi");
const { logger } = require("./logger");
const Cryptr = require("cryptr");

let ipfsNetwork = "xinfin";

if (!_.isEmpty(argv) && !_.isEmpty(argv["ipfsNetwork"])) {
  if (argv["ipfsNetwork"] === "local") {
    logger.info("[*] changed IPFS network to local");
    ipfsNetwork = "local";
  }
}

const ipfsConfig = require("../config/ipfs-config").getConfig(ipfsNetwork); // to be replaced by process.env.IPFS_CONFIG
const ipfsClient = new ipfs(ipfsConfig);

// contract type values
const contractTypes = {
  commonInstrument: "Common_Template_Beta.sol",
  brokerInstrument: "Broker_Template_Beta.sol"
};

let network = "http://rpc.apothem.network";
if (!_.isEmpty(argv["httpProvider"])) {
  network = argv["httpProvider"];
}
const xdc3 = new XDC3(new XDC3.providers.HttpProvider(network));
const web3 = new Web3(new Web3.providers.HttpProvider(network));

exports.generateContract = (req, res) => {
  try {
    logger.info("called generateContract");
    // generate contract code.
    const ipfsHash = req.body.ipfsHash;
    const instrumentType = req.body.instrumentType;
    const amount = req.body.amount;
    const currencySupported = req.body.currencySupported;
    const maturityDate = req.body.maturityDate;
    const docRef = req.body.docRef;
    const country = req.body.country;
    const contractType = req.body.contractType;
    const privKey = req.body.privKey;
    const validContractTypes = Object.keys(contractTypes);

    if (
      _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(docRef) ||
      _.isEmpty(country) ||
      _.isEmpty(contractType) ||
      _.isEmpty(privKey)
    ) {
      return res.status(400).json({ status: false, error: "bad request" });
    }

    if (!validContractTypes.includes(contractType)) {
      return res
        .status(400)
        .json({ status: false, error: "bad request, invalid contract type" });
    }

    let contractTemplate = fs.readFileSync(
      path.join(__dirname, `../contracts/${contractTypes[contractType]}`)
    );
    contractTemplate = contractTemplate.toString();
    if (contractType == "brokerInstrument") {
      const name = req.body.name;
      if (_.isEmpty(name)) {
        return res
          .json(400)
          .json({ status: false, error: "missing paramter: name" });
      }
      contractTemplate = contractTemplate.replace("_name_", name);
    }
    const cryptr = new Cryptr(privKey);
    const encryptedString = cryptr.encrypt(ipfsHash);
    contractTemplate = contractTemplate.replace("_ipfsHash_", encryptedString);
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
    contractTemplate = contractTemplate.replace("_docRef_", docRef);
    contractTemplate = contractTemplate.replace("_country_", country);
    return res.json({ status: true, error: null, contract: contractTemplate });
  } catch (e) {
    console.log(e);
    logger.error("error:")
    logger.error(e.toString());
    return res.status(500).json({ status: false, error: "internal error" });
  }
};

exports.uploadDoc = async (req, res) => {
  logger.info("called upload doc");
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
        logger.error("error while uploading to IPFS");
        logger.error(err.toString());
        return res.json({ error: "internal error", status: false });
      }
      res.json({ status: true, hash: ipfsHash[0].hash });
    });
  } catch (e) {
    logger.error("error");
    logger.error(e.toString());
    console.log("errror ", e);
    return res.status(500).json({ status: false, error: "internal error" });
  }
};

exports.deployContract = async (req, res) => {
  try {
    logger.info("called deployContract");
    // generate contract code.
    const ipfsHash = req.body.ipfsHash;
    const instrumentType = req.body.instrumentType;
    const amount = req.body.amount;
    const currencySupported = req.body.currencySupported;
    const maturityDate = req.body.maturityDate;
    const docRef = req.body.docRef;
    const country = req.body.country;
    const privKey = req.body.privKey;
    const contractType = req.body.contractType;

    if (
      _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(docRef) ||
      _.isEmpty(country) ||
      _.isEmpty(contractType)
    ) {
      return res.status(400).json({ status: false, error: "bad request" });
    }

    const validContractTypes = Object.keys(contractTypes);
    if (!validContractTypes.includes(contractType)) {
      return res
        .status(400)
        .json({ status: false, error: "bad request, invalid contract type" });
    }

    let contractTemplate = fs.readFileSync(
      path.join(__dirname, `../contracts/${contractTypes[contractType]}`)
    );
    contractTemplate = contractTemplate.toString();
    if (contractType == "brokerInstrument") {
      const name = req.body.name;
      if (_.isEmpty(name)) {
        return res
          .status(400)
          .json({ status: false, error: "missing paramter: name" });
      }
      contractTemplate = contractTemplate.replace("_name_", name);
    }
    const cryptr = new Cryptr(privKey);
    const encryptedString = cryptr.encrypt(ipfsHash);
    contractTemplate = contractTemplate.replace("_ipfsHash_", encryptedString);
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
    contractTemplate = contractTemplate.replace("_docRef_", docRef);
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
    logger.info("contract generated");
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
    logger.error("internal error at service.deploy");
    logger.error(e.toString());
    console.log(e);
    return res.status(500).json({ status: false, error: "internal error" });
  }
};

exports.getDocHash = async (req, res) => {
  console.log("called getDocHash");
  if (
    _.isEmpty(req.body) ||
    _.isEmpty(req.body.contractAddr) ||
    _.isEmpty(req.body.privKey) ||
    _.isEmpty(req.body.contractType)
  ) {
    logger.error("missing parameters at service.getDochash");
    console.error("missing parameters at service.getDocHash");
    return res.json({ status: false, error: "missing parameters" });
  }
  const privKey = req.body.privKey;
  const contractType = req.body.contractType;

  const validContractTypes = Object.keys(contractTypes);
  if (!validContractTypes.includes(contractType)) {
    logger.error("unknown contract type");
    return res
      .status(400)
      .json({ error: "bad request; invalid contract type", status: false });
  }
  const contractInst = new web3.eth.Contract(
    contractAbi[contractType].ABI,
    "0x" + req.body.contractAddr.slice(3)
  );
  contractInst.methods
    .getDocHash()
    .call()
    .then(resp => {
      logger.info("got the doc hash");
      logger.info(resp.toString());
      console.log(resp);
      const cryptr = new Cryptr(privKey);
      const decryptedString = cryptr.decrypt(resp);
      console.log("decrypted string: ", decryptedString);
      return res.json({ status: true, ipfsHash: decryptedString });
    })
    .catch(e => {
      logger.error("error at service.getDocHash");
      logger.error(e.toString());
      console.log("error at service.getDocHash: ", e);
      return res.status(500).json({ status: false, error: "internal error" });
    });
};

async function deploy(abi, bin, privKey, callback) {
  try {
    logger.info("called service.deploy");
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
        logger.info("receipt received");
        logger.info(receipt.toString());
        if (receipt.status === true) {
          logger.info("receipt status true");
          logger.info(`contract address ${receipt.contractAddress}`);
          console.log(receipt.contractAddress);
          callback(true, null, receipt);
        } else {
          logger.error(
            "error: contract execution failed, receipt status false"
          );
          logger.error(`receipt: ${receipt.toString()}`);
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
    logger.error("error: exception at service.deploy");
    logger.error(e.toString());
    console.log("error");
    console.log("error at deploy, ", e);
    callback(false, "exception", null);
  }
}
