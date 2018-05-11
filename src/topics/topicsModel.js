const mongoose = require("mongoose");
const topicsSchema = mongoose.Schema({
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
const Topics = mongoose.model("Topics", topicsSchema);
module.exports = { Topics };
