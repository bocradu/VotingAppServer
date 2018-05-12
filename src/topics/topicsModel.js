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
}, { collection: 'Voting' });

const Topics = mongoose.model("Voting", topicsSchema);
module.exports = { Topics };
