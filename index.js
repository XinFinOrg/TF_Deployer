"use strict";
const express = require("express");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: "5MB" }));

require("./routes/route")(app);

app.listen(3110, () => {
  console.log("[*] server started");
});
