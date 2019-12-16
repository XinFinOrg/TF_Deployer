exports.getConfig = netName => {
  switch (netName) {
    case "xinfin": {
      return {
        host: "ipfs.xinfin.network",
        port: 443,
        protocol: "https"
      };
    }
    case "local": {
      return "/ip4/127.0.0.1/tcp/5001";
    }
  }
};
