const { Router } = require("express");
const { Topics } = require("./topicsModel");
const topicsRouter = Router();

topicsRouter.get("/", (req, res) => {
  Topics.find({}).then(topics => res.json(topics));
});
topicsRouter.post("/", (req, res) => {
  const topic = new Topics({
    name: req.body.name,
    id: req.body.id,
    options: req.body.options,
    startDate: new Date(),
    endDate: new Date()
  });
  topic.save();
});

module.exports = { topicsRouter };
