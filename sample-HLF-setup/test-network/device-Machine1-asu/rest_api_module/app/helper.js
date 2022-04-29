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
var logger = log4js.getLogger('Helper');
logger.level ='DEBUG'

var path = require('path');
var util = require('util');

var hfc = require('fabric-client');
hfc.setLogger(logger);

var md5 = require('md5')

async function getClientForOrg (userorg, username) {
	logger.debug('getClientForOrg - ****** START %s %s', userorg, username)
	let config = '-connection-profile-path';
	let client = hfc.loadFromConfig(hfc.getConfigSetting('network'+config));
	client.loadFromConfig(hfc.getConfigSetting(userorg+config));
	await client.initCredentialStores();
	if(username) {
		let user = await client.getUserContext(username, true);
		if(!user) {
			throw new Error(util.format('User was not found :', username));
		} else {
			logger.debug('User %s was found to be registered and enrolled', username);
		}
	}
	logger.debug('getClientForOrg - ****** END %s %s \n\n', userorg, username)

	return client;
}

var checkSecret = async function(userorg, secret1) {
	let config = '-connection-profile-path';
	let client = hfc.loadFromConfig(hfc.getConfigSetting('network'+config));
	let orgs = client._network_config._network_config.organizations
	return orgs[`${userorg}`]['secret']

}

var findLocalCert = async function(username, userOrg) {
	const secret = md5((username))
	var client = await getClientForOrg(userOrg);
	logger.debug('Successfully initialized the credential stores');
	var user = await client.getUserContext(username, true);
	let response = {}
	if (user && user.isEnrolled()) {
		logger.debug('User %s found on this machine. Returning based on existing local cert.',username);
		response = { 
				success: true,
				message: 'Successfully loaded member from persistence'
		}
	} else {
		response = { 
			success: false
		}
	}
	return response
}

var tryEnroll = async function(username, userOrg) {
	try{
		const secret = md5((username))
		var client = await getClientForOrg(userOrg);
		logger.debug('Successfully initialized the credential stores');
		let caClient = client.getCertificateAuthority();
		let enrollment = await caClient.enroll({enrollmentID: username, enrollmentSecret: secret})
		logger.debug('Successfully enrolled member user %s', username);
		let userObj = {
			username: username,
			mspid: `${userOrg}MSP`,
			cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate}        
		}
		let member_user = await client.setUserContext({username:username, password:secret});
		logger.debug('Successfully created user %s', JSON.stringify(userObj));
	
		if(member_user && member_user.isEnrolled) {
			let response = {
				success: true,
				secret: secret,
				message: username + ' enrolled successfully.'
			};
			return response;
		}
	} catch (error){
		let response = {
			success: false,
			message: error.toString()
		}
		return response;
	}
	

}

var tryRegister = async function(username, userOrg, role, attrs) {
	try {
		const secret = md5((username))
		var client = await getClientForOrg(userOrg);
		var user = await client.getUserContext(username, true);
		var admins = hfc.getConfigSetting('admins');
		let adminUserObj = await client.setUserContext({username: admins[0].username, password: admins[0].secret});
		let caClient = client.getCertificateAuthority();

		let registerObj = {
			enrollmentID: username,
			affiliation: userOrg.toLowerCase() + '.department1',
			role: role,
			attrs: attrs,
			maxEnrollments: -1,
			enrollmentSecret: secret
		}					
		await caClient.register(registerObj, adminUserObj);
		var response = {
			success: true,
		}
	} catch (error){
		var response = {
			success: false,
		}
	}
	return response
}


var getLogger = function(moduleName) {
	var logger = log4js.getLogger(moduleName);
	logger.level = 'DEBUG'
	return logger;
};

exports.getClientForOrg = getClientForOrg;
exports.getLogger = getLogger;
exports.tryEnroll = tryEnroll;
exports.tryRegister = tryRegister;
exports.findLocalCert = findLocalCert;
exports.checkSecret = checkSecret;