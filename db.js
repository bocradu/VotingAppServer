const mongoose = require("mongoose");
const { mongoPort, mongoServer } = require("./config");

// mongoose.connect(`mongodb://${mongoServer}:${mongoPort}/Voting`);
// var db = mongoose.connection;

// db.on("error", console.error.bind(console, "connection error:"));

// db.once("open", function() {
// 	console.log("we're connected!");
// });

// connect to DB
let mongoDB = `mongodb://${mongoServer}:${mongoPort}`;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once("open", function() {
	console.log("we're connected!");
});

module.exports = { db };
