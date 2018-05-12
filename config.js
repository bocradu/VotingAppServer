module.exports = {
	// needs to be set to mongo when deployed on azure
	mongoServer: process.env.mongoServer || "localhost",
	mongoPort: process.env.mongoPort || "27017"
  };
  