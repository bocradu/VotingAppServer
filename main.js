"use strict";
var CryptoJS = require("crypto-js");
var express = require("express");
var bodyParser = require("body-parser");
var WebSocket = require("ws");
var moment = require("moment");

const { topicsRouter } = require("./src/topics/topicsRoutes");
const { Topics } = require("./src/topics/topicsModel");

var db = require("./db");

var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(",") : [];

class Block {
  constructor(index, previousHash, timestamp, data, hash) {
    this.index = index;
    this.previousHash = previousHash.toString();
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash.toString();
  }
}

var sockets = [];
var MessageType = {
  QUERY_LATEST: 0,
  QUERY_ALL: 1,
  RESPONSE_BLOCKCHAIN: 2
};

var getGenesisBlock = () => {
  return new Block(
    0,
    "0",
    1465154705,
    "my genesis block!!",
    "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7"
  );
};

var blockchain = [getGenesisBlock()];

var initHttpServer = () => {
  var app = express();
  app.use(bodyParser.json());
  app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST,GET,OPTIONS,PUT,DELETE"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Allow-Headers, Access-Control-Allow-Origin"
    );
    next();
  });

  app.get("/voting/check/:topicId/:userId", (req, res) => {
	const filtered = blockchain.filter(item => 
		item.data.userId === req.params.userId && item.data.topicId === req.params.topicId)

	res.send(JSON.stringify(filtered))
});

app.post("/voting/:cnp", (req, res) => {
	const infoCNP = getInfoCNP(req.params.cnp)

	const newBlock = generateNextBlock({...req.body.data, ...infoCNP});

	addBlock(newBlock);
	broadcast(responseLatestMsg());

	console.log("block added: " + JSON.stringify(newBlock));

	res.send();
});

app.get("/results/:topicId", (req, res) => {
	const filtered = blockchain.filter(item => item.data.topicId === req.params.topicId)
	let results = []

	const votingData = filtered.map(item => item.data)
	const possibleOptions = [...new Set(votingData.map(item => item.option))];

	for (const option of possibleOptions) {
		let count = 0

		for (const vote of votingData) {
			if (option === vote.option) {
				count++
			}
		}

		results.push({
			name: option,
			count
		})
	}

	Topics.find({ id: req.params.topicId }, function(err, voting) {
		if (err)
			res.send(err);

		res.send(JSON.stringify({
			topicId: req.params.topicId,
			topicName: voting[0].name,
			options: results
		}))
	});
});

  app.get("/blocks", (req, res) => res.send(JSON.stringify(blockchain)));
  app.post("/mineBlock", (req, res) => {
    var newBlock = generateNextBlock(req.body.data);
    addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log("block added: " + JSON.stringify(newBlock));
    res.send();
  });
  app.get("/peers", (req, res) => {
    res.send(
      sockets.map(s => s._socket.remoteAddress + ":" + s._socket.remotePort)
    );
  });
  app.post("/addPeer", (req, res) => {
    connectToPeers([req.body.peer]);
    res.send();
  });
  app.use("/topics", topicsRouter);
  app.listen(http_port, () =>
    console.log("Listening http on port: " + http_port)
  );
};

var initP2PServer = () => {
  var server = new WebSocket.Server({ port: p2p_port });
  server.on("connection", ws => initConnection(ws));
  console.log("listening websocket p2p port on: " + p2p_port);
};

var initConnection = ws => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

var initMessageHandler = ws => {
  ws.on("message", data => {
    var message = JSON.parse(data);
    console.log("Received message" + JSON.stringify(message));
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        handleBlockchainResponse(message);
        break;
    }
  });
};

var initErrorHandler = ws => {
  var closeConnection = ws => {
    console.log("connection failed to peer: " + ws.url);
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on("close", () => closeConnection(ws));
  ws.on("error", () => closeConnection(ws));
};

var generateNextBlock = blockData => {
  var previousBlock = getLatestBlock();
  var nextIndex = previousBlock.index + 1;
  var nextTimestamp = new Date().getTime() / 1000;
  var nextHash = calculateHash(
    nextIndex,
    previousBlock.hash,
    nextTimestamp,
    blockData
  );
  return new Block(
    nextIndex,
    previousBlock.hash,
    nextTimestamp,
    blockData,
    nextHash
  );
};

var calculateHashForBlock = block => {
  return calculateHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data
  );
};

var calculateHash = (index, previousHash, timestamp, data) => {
  return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

var addBlock = newBlock => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
  }
};

var isValidNewBlock = (newBlock, previousBlock) => {
  if (previousBlock.index + 1 !== newBlock.index) {
    console.log("invalid index");
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log("invalid previoushash");
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    console.log(
      typeof newBlock.hash + " " + typeof calculateHashForBlock(newBlock)
    );
    console.log(
      "invalid hash: " + calculateHashForBlock(newBlock) + " " + newBlock.hash
    );
    return false;
  }
  return true;
};

var connectToPeers = newPeers => {
  newPeers.forEach(peer => {
    var ws = new WebSocket(peer);
    ws.on("open", () => initConnection(ws));
    ws.on("error", () => {
      console.log("connection failed");
    });
  });
};

var handleBlockchainResponse = message => {
  var receivedBlocks = JSON.parse(message.data).sort(
    (b1, b2) => b1.index - b2.index
  );
  var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  var latestBlockHeld = getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log(
      "blockchain possibly behind. We got: " +
        latestBlockHeld.index +
        " Peer got: " +
        latestBlockReceived.index
    );
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      console.log("We can append the received block to our chain");
      blockchain.push(latestBlockReceived);
      broadcast(responseLatestMsg());
    } else if (receivedBlocks.length === 1) {
      console.log("We have to query the chain from our peer");
      broadcast(queryAllMsg());
    } else {
      console.log("Received blockchain is longer than current blockchain");
      replaceChain(receivedBlocks);
    }
  } else {
    console.log(
      "received blockchain is not longer than current blockchain. Do nothing"
    );
  }
};

var replaceChain = newBlocks => {
  if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
    console.log(
      "Received blockchain is valid. Replacing current blockchain with received blockchain"
    );
    blockchain = newBlocks;
    broadcast(responseLatestMsg());
  } else {
    console.log("Received blockchain invalid");
  }
};

var isValidChain = blockchainToValidate => {
  if (
    JSON.stringify(blockchainToValidate[0]) !==
    JSON.stringify(getGenesisBlock())
  ) {
    return false;
  }
  var tempBlocks = [blockchainToValidate[0]];
  for (var i = 1; i < blockchainToValidate.length; i++) {
    if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
      tempBlocks.push(blockchainToValidate[i]);
    } else {
      return false;
    }
  }
  return true;
};

var getLatestBlock = () => blockchain[blockchain.length - 1];
var queryChainLengthMsg = () => ({ type: MessageType.QUERY_LATEST });
var queryAllMsg = () => ({ type: MessageType.QUERY_ALL });
var responseChainMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify(blockchain)
});
var responseLatestMsg = () => ({
  type: MessageType.RESPONSE_BLOCKCHAIN,
  data: JSON.stringify([getLatestBlock()])
});

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = message => sockets.forEach(socket => write(socket, message));

const getInfoCNP = (cnp) => {
	let year = 0;
	const countyCodes = {
		'01': 'Alba',
        '02': 'Arad',
        '03': 'Arges',
        '04': 'Bacau',
        '05': 'Bihor',
        '06': 'Bistrita-Nasaud',
        '07': 'Botosani',
        '08': 'Brasov',
        '09': 'Braila',
        '10': 'Buzau',
        '11': 'Caras-Severin',
        '12': 'Cluj',
        '13': 'Constanta',
        '14': 'Covasna',
        '15': 'Dambovita',
        '16': 'Dolj',
        '17': 'Galati',
        '18': 'Gorj',
        '19': 'Harghita',
        '20': 'Hunedoara',
        '21': 'Ialomita',
        '22': 'Iasi',
        '23': 'Ilfov',
        '24': 'Maramures',
        '25': 'Mehedinti',
        '26': 'Mures',
        '27': 'Neamt',
        '28': 'Olt',
        '29': 'Prahova',
        '30': 'Satu Mare',
        '31': 'Salaj',
        '32': 'Sibiu',
        '33': 'Suceava',
        '34': 'Teleorman',
        '35': 'Timis',
        '36': 'Tulcea',
        '37': 'Vaslui',
        '38': 'Valcea',
        '39': 'Vrancea',
        '40': 'Bucuresti',
        '41': 'Bucuresti S.1',
        '42': 'Bucuresti S.2',
        '43': 'Bucuresti S.3',
        '44': 'Bucuresti S.4',
        '45': 'Bucuresti S.5',
        '46': 'Bucuresti S.6',
        '51': 'Calarasi',
        '52': 'Giurgiu'
	}

	const gender = cnp.slice(0, 1) % 2 === 0 ? 'female' : 'male'
	const isForeign = cnp.slice(0, 1) === 7 && cnp.slice(0, 1) === 8 ? true : false
	
	switch(Number(cnp.slice(0, 1))) {
		case 0 : case 1 :
			year = 1900 + Number(cnp.slice(1, 3))
		case 3 : case 4 :
			year = 1800 + Number(cnp.slice(1, 3))
		case 5 : case 6 :
			year = 2000 + Number(cnp.slice(1, 3))
		case 7 : case 8 : case 9 :
			year = 1900 + Number(cnp.slice(1, 3)) //assuming
	}

	const countyCode = countyCodes[cnp.slice(7, 9)]

	const dateOfBirth = moment(`${cnp.slice(5, 7)}-${cnp.slice(3, 5)}-${year}`, 'DD-MM-YYYY')
	const a = `${cnp.slice(5, 7)}-${cnp.slice(3, 5)}-${year}`
	
	return({
		hashedCNP: CryptoJS.SHA256(cnp).toString(),
		gender,
		isForeign,
		countyCode,
		dateOfBirth
	})
}

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();
