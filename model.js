const blockModel = {
  topicId: String,
  userId: String,
  option: String
};

const mongoModel = {
  topics: [
    {
      name: String,
      id: String,
      options: [String],
      startDate: Date,
      endDate: Date
    }
  ]
  //   votes: [
  //     {
  //       topicId: String,
  //       selectedOption: {
  //         name: String
  //       }
  //     }
  //   ]
  //   users: [{

  //   }]
};
