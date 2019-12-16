const service = require("../services/service");

module.exports = app => {
  app.post("/api/generateContract", service.generateContract);
  app.post("/api/deployContract", service.deployContract);
  app.post("/api/uploadDoc", service.uploadDoc);
  app.post("/api/getDocHash",service.getDocHash);
};
