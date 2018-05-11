const { Router } = require("express");
const { Topics } = require("./topicsModel");
const topicsRouter = Router();

topicsRouter.get("/", (req, res) => {
  Topics.find({}, topics => res.json(topics));
});
topicsRouter.post("/", (req, res) => {
  const topic = new Topics({
    name: req.body.name,
    id: req.body.id,
    options: req.body.options,
    startDate: new Date(),
    endDate: new Date()
  });
  newUser.save(function(err) {
    if (err) {
      res.status(500).send("Server Error");
    }
    res.send(topic);
  });
  
});

module.exports = { topicsRouter };
