const { Schema, model } = require("mongoose");
var topicsSchema = mongoose.Schema({
  name: String,
  id: String,
  options: [
    {
      type: String
    }
  ],
  startDate: Date,
  endDate: Date
});
var Topics = mongoose.model("Topics", topicsSchema);
module.exports = { Topics };
