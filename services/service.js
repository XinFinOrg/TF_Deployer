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
const config = require("../config/config");
const crypto = require("crypto");

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

const networkRpc = config.networkRpc;
const networkId = config.networkId;
const xdc3 = new XDC3(new XDC3.providers.HttpProvider(networkRpc));
const web3 = new Web3(new Web3.providers.HttpProvider(networkRpc));

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
    const validContractTypes = Object.keys(contractTypes);

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
    const passKey = genRandomKey();
    const cryptr = new Cryptr(passKey);
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
    return res.json({
      status: true,
      error: null,
      contract: contractTemplate,
      passKey: passKey
    });
  } catch (e) {
    console.log(e);
    logger.error("error:");
    logger.error(e.toString());
    return res.status(500).json({ status: false, error: "internal error" });
  }
};
exports.generateMultiDocContract = (req, res) => {
  try {
    logger.info("called generateMultiDocContract");
    const allDocs = req.body.allDocs;
    const retDocs = [];
    if (allDocs.length == 0) {
      return res.json({ status: false, error: "bad request, missing docs" });
    }
    allDocs.forEach(currDoc => {
      const ipfsHash = currDoc.ipfsHash;
      const instrumentType = currDoc.instrumentType;
      const amount = currDoc.amount;
      const currencySupported = currDoc.currencySupported;
      const maturityDate = currDoc.maturityDate;
      const docRef = currDoc.docRef;
      const country = currDoc.country;
      const contractType = currDoc.contractType;
      const validContractTypes = Object.keys(contractTypes);

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
        const name = currDoc.name;
        if (_.isEmpty(name)) {
          return res
            .json(400)
            .json({ status: false, error: "missing paramter: name" });
        }
        contractTemplate = contractTemplate.replace("_name_", name);
      }
      const passKey = genRandomKey();
      const cryptr = new Cryptr(passKey);
      const encryptedString = cryptr.encrypt(ipfsHash);
      contractTemplate = contractTemplate.replace(
        "_ipfsHash_",
        encryptedString
      );
      contractTemplate = contractTemplate.replace(
        "_instrumentType_",
        instrumentType
      );
      contractTemplate = contractTemplate.replace("_amount_", amount);
      contractTemplate = contractTemplate.replace(
        "_currencySupported_",
        currencySupported
      );
      contractTemplate = contractTemplate.replace(
        "_maturityDate_",
        maturityDate
      );
      contractTemplate = contractTemplate.replace("_docRef_", docRef);
      contractTemplate = contractTemplate.replace("_country_", country);
      retDocs.push({ contract: contractTemplate, passKey: passKey });
    });
    res.json({ status: true, contracts: retDocs });
  } catch (e) {
    console.log(e);
    logger.error("error:");
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

exports.uploadMultiDoc = async (req, res) => {
  logger.info("called upload multiple doc");
  if (_.isEmpty(req.body) || _.isEmpty(req.body.data)) {
    res.status(400).json({ status: false, error: "bad request" });
    return;
  }
  try {
    const fileBase64 = req.body.data;
    const retHash = [];

    for (let i = 0; i < fileBase64.length; i++) {
      const currFileBuf = new Buffer.from(fileBase64[i], "base64");
      const result = await ipfsClient.add(currFileBuf);
      retHash.push(result[0].hash);
    }

    res.json({ status: true, hashes: retHash });
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
    const passKey = req.body.passKey;

    let nonceAdder = 0;
    
    if (!_.isNumber(req.body.nonceAdder)){
      nonceAdder = parseInt(req.body.nonceAdder);
    }

    if (
      _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(docRef) ||
      _.isEmpty(country) ||
      _.isEmpty(contractType) ||
      _.isEmpty(passKey)
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
    const cryptr = new Cryptr(passKey);
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
      nonceAdder,
      (deployed, error, receipt, deployerAddr) => {
        if (deployed !== true) {
          return res.json({ error: error, status: false, receipt: null });
        } else {
          return res.json({
            error: null,
            status: true,
            receipt: receipt,
            deployerAddr: deployerAddr
          });
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

exports.deployMultiContract = async (req, res) => {
  console.log("called deployMultiContract");
  const allDocs = req.body.allDocs;
  const retReceipts = [];
  let currInterval;
  let currNonce=0;
  let deploying = false;
  if (allDocs.length == 0) {
    return res.json({ status: false, error: "bad request, empty array" });
  }
  allDocs.forEach(async currDoc => {
    console.log("current document: ", currDoc);

    const ipfsHash = currDoc.ipfsHash;
    const instrumentType = currDoc.instrumentType;
    const amount = currDoc.amount;
    const currencySupported = currDoc.currencySupported;
    const maturityDate = currDoc.maturityDate;
    const docRef = currDoc.docRef;
    const country = currDoc.country;
    const privKey = currDoc.privKey;
    const contractType = currDoc.contractType;
    const passKey = currDoc.passKey;

    if (
      // _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(docRef) ||
      _.isEmpty(country) ||
      _.isEmpty(contractType) ||
      _.isEmpty(passKey)
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
      const name = currDoc.name;
      if (_.isEmpty(name)) {
        return res
          .status(400)
          .json({ status: false, error: "missing paramter: name" });
      }
      contractTemplate = contractTemplate.replace("_name_", name);
    }
    const cryptr = new Cryptr(passKey);
    for (let i = 0; i < ipfsHash.length; i++) {
      const encryptedString = cryptr.encrypt(ipfsHash[i]);
      contractTemplate = contractTemplate.replace(
        "_ipfsHash_",
        encryptedString
      );
    }
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
    const receipt = await deploySync(
      JSON.stringify(abi),
      byteCode.toString(),
      privKey,
      currNonce++
    );
    const account = xdc3.eth.accounts.privateKeyToAccount(privKey);
    retReceipts.push({ receipt: receipt, deployerAddr: account.address });
  });
  currInterval = setInterval(() => {
    if (retReceipts.length == allDocs.length) {
      res.json({ status: true, receipts: retReceipts });
      clearInterval(currInterval);
    }
  }, 1000);
  // res.json({ status: true, receipts: retReceipts });
};

exports.deployMultiDocContract = async (req, res) => {
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
    const passKey = req.body.passKey;
    if (
      // _.isEmpty(ipfsHash) ||
      _.isEmpty(instrumentType) ||
      _.isEmpty(amount) ||
      _.isEmpty(currencySupported) ||
      _.isEmpty(maturityDate) ||
      _.isEmpty(docRef) ||
      _.isEmpty(country) ||
      _.isEmpty(contractType) ||
      _.isEmpty(passKey)
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
    const cryptr = new Cryptr(passKey);
    for (let i = 0; i < ipfsHash.length; i++) {
      const encryptedString = cryptr.encrypt(ipfsHash[i]);
      contractTemplate = contractTemplate.replace(
        "_ipfsHash_",
        encryptedString
      );
    }
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
      nonceAdder,
      (deployed, error, receipt, deployerAddr) => {
        if (deployed !== true) {
          return res.json({ error: error, status: false, receipt: null });
        } else {
          return res.json({
            error: null,
            status: true,
            receipt: receipt,
            deployerAddr: deployerAddr
          });
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
    _.isEmpty(req.body.passKey) ||
    _.isEmpty(req.body.contractType)
  ) {
    logger.error("missing parameters at service.getDochash");
    console.error("missing parameters at service.getDocHash");
    return res.json({ status: false, error: "missing parameters" });
  }
  const passKey = req.body.passKey;
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
    "0x" + req.body.contractAddr.slice(3).toLowerCase()
  );
  contractInst.methods
    .getDocHash()
    .call()
    .then(resp => {
      logger.info("got the doc hash");
      logger.info(resp.toString());
      console.log(resp);
      const cryptr = new Cryptr(passKey);
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

exports.getMultiDocHash = async (req, res) => {
  console.log("called getDocHash");
  if (
    _.isEmpty(req.body) ||
    _.isEmpty(req.body.contractAddr) ||
    _.isEmpty(req.body.passKey) ||
    _.isEmpty(req.body.contractType)
  ) {
    logger.error("missing parameters at service.getDochash");
    console.error("missing parameters at service.getDocHash");
    return res.json({ status: false, error: "missing parameters" });
  }
  const passKey = req.body.passKey;
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
    "0x" + req.body.contractAddr.slice(3).toLowerCase()
  );
  contractInst.methods
    .getDocHash()
    .call()
    .then(resp => {
      logger.info("got the doc hash");
      logger.info(resp.toString());
      console.log(resp);
      const cryptr = new Cryptr(passKey);
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

exports.makePayment = async (req, res) => {
  logger.info("called makePayment");
  const privKey = req.body.privKey;
  const abi = req.body.abi;
  let addr = req.body.addr;
  const merchantId = req.body.merchantId;
  const purpose = req.body.purpose;
  const chainId = req.body.chainId;
  const value = req.body.value;
  if (
    _.isEmpty(privKey) ||
    _.isEmpty(abi) ||
    _.isEmpty(addr) ||
    _.isEmpty(merchantId) ||
    _.isEmpty(purpose) ||
    _.isEmpty(chainId) ||
    isNaN(value)
  ) {
    logger.error("bad request, missing parameters");
    return res
      .status(400)
      .json({ status: false, error: "bad request; missing parameters" });
  }

  try {
    addr = addr.toString().startsWith("xdc") ? "0x" + addr.slice(3) : addr;
    const contractInst = new web3.eth.Contract(abi, addr);
    const encodedData = contractInst.methods
      .makePayment(merchantId, purpose)
      .encodeABI();

    const signed = await signTx(encodedData, addr, privKey, chainId, value);
    logger.info("after signed");
    xdc3.eth
      .sendSignedTransaction(signed.rawTransaction)
      .then(receipt => {
        logger.info(`receipt:${JSON.stringify(receipt)}`);
        if (receipt.status == true) {
          logger.verbose("receipt received at service.makePayment");
          return res.status(500).json({ status: true, receipt: receipt });
        } else {
          logger.verbose("receipt received at service.makePayment");
          return res.status(500).json({
            status: false,
            receipt: receipt,
            error: "receipt status false"
          });
        }
      })
      .catch(e => {
        logger.error(
          `error while executing the transaction at service.makePayment: ${e.toString()}`
        );
        return res.status(500).json({ status: false, error: "internal error" });
      });
  } catch (e) {
    logger.error(`exception at service.makePayment: ${e.toString()}`);
    return res.status(500).json({ error: "internal error", status: false });
  }
};

async function deploy(abi, bin, privKey, nonceAdder, callback) {
  try {
    logger.info("called service.deploy");
    const abiJSON = JSON.parse(abi.trim());
    let contract = new xdc3.eth.Contract(abiJSON);
    let deploy = contract.deploy({ data: "0x" + bin }).encodeABI();
    const account = xdc3.eth.accounts.privateKeyToAccount(privKey);
    const nonce = await xdc3.eth.getTransactionCount(account.address,"pending");
    const gasPrice = await xdc3.eth.getGasPrice();
    const estimateGas = await xdc3.eth.estimateGas({ data: deploy, from: account.address });
    let rawTx = {
      from: account.address,
      data: deploy,
      gasLimit: estimateGas,
      gasPrice: gasPrice,
      nonce: nonce + nonceAdder,
      chainId: networkId
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
          callback(true, null, receipt, account.address);
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

async function deploySync(abi, bin, privKey, nonceAdder) {
  console.log("called deploySync");
  const abiJSON = JSON.parse(abi.trim());
  let contract = new xdc3.eth.Contract(abiJSON);
  let deploy = contract.deploy({ data: "0x" + bin }).encodeABI();
  const account = xdc3.eth.accounts.privateKeyToAccount(privKey);
  const nonce = await xdc3.eth.getTransactionCount(account.address, "pending")+nonceAdder;
  const gasPrice = await xdc3.eth.getGasPrice();
  const estimateGas = await xdc3.eth.estimateGas({ data: deploy });
  let rawTx = {
    from: account.address,
    data: deploy,
    gas: estimateGas,
    gasPrice: gasPrice,
    nonce: nonce,
    chainId: networkId
  };
  let signedTransaction = await xdc3.eth.accounts.signTransaction(
    rawTx,
    privKey
  );
  const receipt = await xdc3.eth.sendSignedTransaction(
    signedTransaction.rawTransaction
  );
  return receipt;
}

async function signTx(encodedData, toAddr, privKey, chainId, value) {
  console.log(encodedData, toAddr, privKey, chainId, value);
  // const estimateGas = await web3.eth.estimateGas({ data: encodedData }); //  this throws an error 'tx will always fail or gas will exceed allowance'
  const account = web3.eth.accounts.privateKeyToAccount(privKey);
  console.log("Account: ", account);
  const rawTx = {
    to: toAddr,
    from: account.address,
    gas: 2000000,
    gasPrice: await web3.eth.getGasPrice(),
    nonce: await web3.eth.getTransactionCount(account.address),
    data: encodedData,
    chainId: chainId + "",
    value: value
  };
  const signed = await web3.eth.accounts.signTransaction(rawTx, privKey);
  return signed;
}

function genRandomKey() {
  return crypto.randomBytes(64).toString("hex");
}
