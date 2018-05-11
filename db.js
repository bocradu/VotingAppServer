const mongoose = require("mongoose");
const { mongoPort, mongoServer } = require("./config");

mongoose.connect(`mongodb://${mongoServer}:${mongoPort}/voting`);
var db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", function() {
	console.log("we're connected!");
});
