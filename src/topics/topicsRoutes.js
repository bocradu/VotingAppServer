const { Router } = require("express");
const { Topics } = require("./topicsModel");
const { check } = require("../../auth-openid");
const topicsRouter = Router();

topicsRouter.get("/", (req, res) => {
  Topics.find({}).then(topics => res.json(topics));
});
topicsRouter.post("/", check, (req, res) => {
  const topic = new Topics({
    name: req.body.name,
    id: req.body.id,
    options: req.body.options,
    startDate: new Date(),
    endDate: req.body.endDate
  });
  topic.save(function(err) {
    if (err) {
      res.status(500).send("Server Error");
    }
    res.send(topic);
  });
});

module.exports = { topicsRouter };
