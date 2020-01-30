const argv = require("yargs").argv;
const _ = require("lodash");
const { logger } = require("../services/logger");

let network = "apothem";
const apothemRpc = "https://rpc.apothem.network";
const apothemId = "51";
const mainnetRpc = "https://rpc.xinfin.network";
const mainnetId = "50";
const networkLevels = ["apothem", "mainnet"];

if (_.isEmpty(argv) || _.isEmpty(argv["network"])) {
  logger.info('[*] no network specified, using "apothem" as default');
} else {
  if (networkLevels.includes(argv["network"])) {
    network = argv["network"];
    logger.info(`[*] switched to network ${argv["network"]}`);
  } else {
    logger.info('[*] unknown network, using "apothem" as default');
  }
}

switch (network) {
  case "apothem": {
    exports.networkRpc = apothemRpc;
    exports.networkId = apothemId;
    break;
  }

  case "mainnet": {
    exports.networkRpc = mainnetRpc;
    exports.networkId = mainnetId;
    break;
  }
  default: {
    logger.error(`[*] unrecognized network: ${argv["network"]}`);
    break;
  }
}
