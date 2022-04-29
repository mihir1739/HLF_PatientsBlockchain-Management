/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');
require('./config.js');
var hfc = require('fabric-client');
var helper = require('./app/helper.js');
var createChannel = require('./app/create-channel.js');
var join = require('./app/join-channel.js');
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');
var osutils = require("os-utils");

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.set('secret', 'thisismysecret');
app.use(expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: ['/users/register']
}));

app.use(bearerToken());

app.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s', req.originalUrl);

	if (req.originalUrl.indexOf('/users/register') >= 0) {
		return next();
	}

	if(req.name === 'UnauthorizedError') {
		res.status(error.status).send({message:error.message});
		logger.error(error);
	}


	var token = req.token;
	jwt.verify(token, app.get('secret'), function(err, decoded) {
		if (err) {
			res.status(403).send({
				success: false,
				message: 'Failed to authenticate token.'
			});
			return;
		} else {
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////

// Register and enrol user 
app.post('/users/register', async function(req, res) {
	var username = req.body.username;
	var orgName = req.body.orgName;
	var role = req.body.role;
	var attrs = req.body.attrs;
	var secret = req.body.secret;

	logger.debug('User name : ' + username);
	logger.debug('Org name  : ' + orgName);
	logger.debug('Role  : ' + role);
	logger.debug('Attrs  : ' + attrs);
	logger.debug('Secret  : ' + secret);

	if (!username) {
		res.status(400).json(getErrorMessage('\'username\''));
		return;
	}
	if (!orgName) {
		res.status(400).json(getErrorMessage('\'orgName\''));
		return;
	}
	if (!secret) {
		res.status(400).json(getErrorMessage('\'secret\''));
		return;
	}
	let secret2 = await helper.checkSecret(orgName, secret)
	if (secret === secret2){
		var token = jwt.sign({
			exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
			username: username,
			orgName: orgName,
		}, app.get('secret'));
		let responseLocalCert = await helper.findLocalCert(username, orgName);
		if (!responseLocalCert.success){
			let responseTryEnroll = await helper.tryEnroll(username, orgName);
			if (!responseTryEnroll.success){
				let responseTryRegister = await helper.tryRegister(username, orgName,role, attrs);
				if (!responseTryRegister.success){
					res.status(400).json({success: false, message: 'Failed to register user.'});
					return;
				}
				let responseTryEnroll = await helper.tryEnroll(username, orgName);
				if (!responseTryEnroll.success){
					res.status(400).json({success: false, message: 'Failed to enroll user after registration.'});
					return;
				}
			}
		}
		let response = {}
		response.username = username
		response.token = token;
		response.success = true
		res.status(200).json(response);
		return;
	}
	else
	{
		res.status(400).json({success: false, message: 'Invalid organization secret'});
	}
	
});

//Upload smart contract on machine 
app.post('/smartcontract/upload', async (req, res) => {
    try {
        let archive = req.files.archive;

        logger.debug('archive : ' + archive.name);

        if (!archive) {
            res.status(400).json(getErrorMessage('\'archive\''));
            return;
        }
        const execSync = require('child_process').execSync;
        const uniqueId = md5(rndId(32, 'abcdefgh0'))
        let archiveName = uniqueId+'.tar.gz'
        execSync(`mkdir -p ${require('os').homedir()}/uploads/${uniqueId}/`);
        archive.mv(`${require('os').homedir()}/uploads/${uniqueId}/${archiveName}`);
        let pathToArchive = `${require('os').homedir()}/uploads/${uniqueId}/${archiveName}`
        targz.decompress({
            src: `${pathToArchive}`,
            dest: `${require('os').homedir()}/uploads/${uniqueId}`
        }, function(err){
            if(err) {
                console.log(err);
            } else {
				console.log("Done!");
				execSync(`rm ${pathToArchive}`);
				res.status(200).send({path: `${require('os').homedir()}/uploads/${uniqueId}`})
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

//Upload smart contract on machine 
app.post('/smartcontract/download', async (req, res) => {
    try {
        let link = req.body.link;

        logger.debug('link : ' + link);

        if (!link) {
            res.status(400).json(getErrorMessage('\'link\''));
            return;
		}
		execSync(`mkdir -p ${require('os').homedir()}/uploads/${uniqueId}/`);
		const uniqueId = md5(rndId(32, 'abcdefgh0'))
		const file = fs.createWriteStream(`${require('os').homedir()}/uploads/${uniqueId}/${uniqueId}.tar.gz`);
		const request = http.get(link, function(response) {
			response.pipe(file);
		}).then ( result => {
			archive.mv(`${require('os').homedir()}/uploads/${uniqueId}/${uniqueId}.tar.gz`);
			let pathToArchive = `${require('os').homedir()}/uploads/${uniqueId}/${uniqueId}.tar.gz`
			targz.decompress({
				src: `${pathToArchive}`,
				dest: `${require('os').homedir()}/uploads/${uniqueId}`
			}, function(err){
				if(err) {
					console.log(err);
				} else {
					console.log("Done!");
					execSync(`rm ${pathToArchive}`);
					res.status(200).send({path: `${require('os').homedir()}/uploads/${uniqueId}`})
				}
			});
		})
      
    } catch (err) {
        res.status(500).send(err);
    }
});


// Create Channel
app.post('/channels', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.debug('End point : /channels');
	var channelName = req.body.channelName;
	var channelConfigPath = req.body.channelConfigPath;
	logger.debug('Channel name : ' + channelName);
	logger.debug('channelConfigPath : ' + channelConfigPath);
	if (!channelName) {
		res.status(400).json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!channelConfigPath) {
		res.status(400).json(getErrorMessage('\'channelConfigPath\''));
		return;
	}

	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgname);
	res.status(200).send(message);
});

// Join Channel
app.post('/channels/:channelName/peers', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	var channelName = req.params.channelName;
	var peers = req.body.peers;
	logger.debug('channelName : ' + channelName);
	logger.debug('peers : ' + peers);
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);

	if (!channelName) {
		res.status(400).json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.status(400).json(getErrorMessage('\'peers\''));
		return;
	}

	let message =  await join.joinChannel(channelName, peers, req.username, req.orgname);
	res.status(200).send(message);
});

// Install chaincode on target peers
app.post('/chaincodes', async function(req, res) {
	logger.debug('==================== INSTALL CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodePath = req.body.chaincodePath;
	var chaincodeVersion = req.body.chaincodeVersion;
	var chaincodeType = req.body.chaincodeType;
	var metadataPath = req.body.metadataPath;

	logger.debug('peers : ' + peers); // target peers list
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodePath  : ' + chaincodePath);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('metadataPath  : ' + metadataPath);

	if (!peers || peers.length == 0) {
		res.status(400).json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.status(400).json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.status(400).json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.status(400).json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!chaincodeType) {
		res.status(400).json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname, metadataPath)
	res.status(200).send(message);
});

// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('==================== INSTANTIATE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	var policy = req.body.policy;

	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	logger.debug('policy  : ' + policy);

	if (!chaincodeName) {
		res.status(400).json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.status(400).json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.status(400).json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.status(400).json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.status(400).json(getErrorMessage('\'args\''));
		return;
	}
	if (!policy) {
		res.status(400).json(getErrorMessage('\'policy\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname, policy);
	res.status(200).send(message);
});

// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== INVOKE ON CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.params.chaincodeName;
	var channelName = req.params.channelName;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.status(400).json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.status(400).json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.status(400).json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.status(400).json(getErrorMessage('\'args\''));
		return;
	}

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgname);
	res.status(200).send(message);

});

// Query on chaincode on target peers
app.get('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== QUERY BY CHAINCODE ==================');
	var channelName = req.params.channelName;
	var chaincodeName = req.params.chaincodeName;
	let args = req.query.args;
	let fcn = req.query.fcn;
	let peer = req.query.peer;

	logger.debug('channelName : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn : ' + fcn);
	logger.debug('args : ' + args);

	if (!chaincodeName) {
		res.status(400).json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.status(400).json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.status(400).json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.status(400).json(getErrorMessage('\'args\''));
		return;
	}
	args = args.replace(/'/g, '"');
	args = JSON.parse(args);
	logger.debug(args);

	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	res.status(200).send(message);

});

//  Query Get Block by BlockNumber
app.get('/channels/:channelName/blocks/:blockId', async function(req, res) {
	logger.debug('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = req.query.peer;
	logger.debug('channelName : ' + req.params.channelName);
	logger.debug('BlockID : ' + blockId);
	logger.debug('Peer : ' + peer);
	if (!blockId) {
		res.status(400).json(getErrorMessage('\'blockId\''));
		return;
	}

	let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgname);
	res.status(200).send(message);
});

// Query Get Transaction by Transaction ID
app.get('/channels/:channelName/transactions/:trxnId', async function(req, res) {
	logger.debug('================ GET TRANSACTION BY TRANSACTION_ID ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let trxnId = req.params.trxnId;
	let peer = req.query.peer;
	if (!trxnId) {
		res.status(400).json(getErrorMessage('\'trxnId\''));
		return;
	}

	let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, req.username, req.orgname);
	res.status(200).send(message);
});

// Query Get Block by Hash
app.get('/channels/:channelName/blocks', async function(req, res) {
	logger.debug('================ GET BLOCK BY HASH ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let hash = req.query.hash;
	let peer = req.query.peer;
	if (!hash) {
		res.status(400).json(getErrorMessage('\'hash\''));
		return;
	}

	let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgname);
	res.status(200).send(message);
});

//Query for Channel Information
app.get('/channels/:channelName', async function(req, res) {
	logger.debug('================ GET CHANNEL INFORMATION ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgname);
	res.status(200).send(message);
});

//Query for Channel instantiated chaincodes
app.get('/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('================ GET INSTANTIATED CHAINCODES ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgname);
	res.status(200).send(message);
});

// Query to fetch all Installed/instantiated chaincodes
app.get('/chaincodes', async function(req, res) {
	var peer = req.query.peer;
	var installType = req.query.type;
	logger.debug('================ GET INSTALLED CHAINCODES ======================');

	let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgname)
	res.status(200).send(message);
});

// Query to fetch channels
app.get('/channels', async function(req, res) {
	logger.debug('================ GET CHANNELS ======================');
	logger.debug('peer: ' + req.query.peer);
	logger.debug('username: ' + 	req.username);
	logger.debug('orgname: ' + 	req.orgname);

	var peer = req.query.peer;
	if (!peer) {
		res.status(400).json(getErrorMessage('\'peer\''));
		return;
	}

	let message = await query.getChannels(peer, req.username, req.orgname);
	res.status(200).send(message);
});


// Query to fetch peer status
app.get('/status', async function(req, res) {
	logger.debug('================ GET PEER STATUS ======================');
	logger.debug('peer: ' + req.query.peer);
	logger.debug('username: ' + 	req.username);
	logger.debug('orgname: ' + 	req.orgname);

	var peer = req.query.peer;
	if (!peer) {
		res.status(400).json(getErrorMessage('\'peer\''));
		return;
	}
	const curl = new (require( 'curl-request' ))();

	curl.setHeaders([
		'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36'
	])
	.get(`${peer}:8125/healthz`)
	.then(({statusCode, body, headers}) => {
		res.status(200).send(body);
	})
	.catch((e) => {
		logger.error(e);
		res.status(400).json({error:e})
	});
});

// Query to fetch machine states
app.get('/state', async function(req, res) {
	logger.debug('================ GET CHANNELS ======================');
	logger.debug('username: ' + 	req.username);
	logger.debug('orgname: ' + 	req.orgname);

	osutils.cpuUsage(function(v) {
		let statusObj = {}
		statusObj.cpuUsage = parseInt(v*100) + ' %'
		if (statusObj.cpuUsage==0) statusObj.cpuUsage =1
		statusObj.platform = osutils.platform()
		statusObj.cpuCount = osutils.cpuCount()
		statusObj.freeeMem = parseInt(100 - osutils.freememPercentage()) + ' %'
		statusObj.uptime = parseInt(osutils.sysUptime()/60) + ' minutes'
		res.status(200).send(statusObj);
	});
});
