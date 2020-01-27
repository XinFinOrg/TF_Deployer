const service = require("../services/service");

module.exports = app => {
  app.post("/api/generateContract", service.generateContract);
  app.post("/api/generateMultiDocContract", service.generateMultiDocContract);
  app.post("/api/deployContract", service.deployContract);
  app.post("/api/deployMultiDocContract", service.deployMultiDocContract);
  app.post("/api/uploadDoc", service.uploadDoc);
  app.post("/api/uploadMultiDoc", service.uploadMultiDoc);
  app.post("/api/getDocHash",service.getDocHash);
  app.post("/api/makePayment",service.makePayment);
};
