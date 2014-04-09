//
//  sosumi.js
//  node-sosumi
//
//  Created by Nicholas Penree on 8/21/10.
//  Copyright 2010 Conceited Software. All rights reserved.
//

var sys = require('sys'),
events = require('events'),
http = require('https'),
Buffer = require('buffer').Buffer,
Sosumi = exports = module.exports = 

function Sosumi (mobileMeUsername, mobileMeUserPassword) {
    var self = this;
    events.EventEmitter.call(this);
    this.devices = [];
    
    this.host = 'fmipmobile.icloud.com';
    this.username = mobileMeUsername;
    this.password = mobileMeUserPassword;
    
    self.getHost(function () {
        self.getDevices(function (devices) {
            self.devices = devices;
            self.emit('devices', self.devices);
        });
    });
}

sys.inherits(Sosumi, events.EventEmitter);

Sosumi.prototype.locate = function (deviceIndex, timeout) {    
    var self = this;

    self.getDevices(function (devices) {
        self.devices = devices;
        var seekedDevice = self.devices[deviceIndex];
        if (seekedDevice.locationFinished) {
            self.emit('located', {
                latitude: seekedDevice.location.latitude, 
                longitude: seekedDevice.location.longitude,
                accuracy: seekedDevice.location.horizontalAccuracy,
                timestamp: seekedDevice.location.timeStamp,
                type: seekedDevice.location.positionType 
            });
        } else {
            setTimeout(function(){ 
                self.locate(deviceIndex, timeout);
            },
            timeout);
        }
    });   

}

Sosumi.prototype.sendMessage = function(msg, alarm, deviceIndex, subject)
{
    if (deviceIndex >= this.devices.length) return;

    var self = this,
    body = JSON.stringify({
        "clientContext" : {
            "appName" : "FindMyiPhone",
            "appVersion" : "1.0",
            "buildVersion" : "57",
            "deviceUDID" : "0000000000000000000000000000000000000000",
            "inactiveTime" : 5911,
            "osVersion" : "3.2",
            "productType" : "iPad1,1",
            "selectedDevice" : this.devices[deviceIndex].id,
            "shouldLocate":false
        },
        "device" : this.devices[deviceIndex].id,
        "serverContext" : {
            "callbackIntervalInMS": 3000,
            "clientId" : "0000000000000000000000000000000000000000",
            "deviceLoadStatus" : "203",
            "hasDevices" : true,
            "lastSessionExtensionTime" : null,
            "maxDeviceLoadTime" : 60000,
            "maxLocatingTime" : 90000,
            "preferredLanguage" : "en",
            "prefsUpdateTime" : 1276872996660,
            "sessionLifespan" : 900000,
            "timezone" : {
                "currentOffset" : -25200000,
                "previousOffset" : -28800000,
                "previousTransition" : 1268560799999,
                "tzCurrentName" : "Pacific Daylight Time",
                "tzName" : "America/Los_Angeles"
            },
            "validRegion" : true
        },
        "sound" : (alarm) ? 'true' : 'false',
        "subject" : subject,
        "text" : msg
    });

    this.postAPICall('/fmipservice/device/' + this.username + '/sendMessage', body, function (content) {
        self.emit('messageSent', { subject: subject, message: msg, alarm: alarm, deviceIndex: deviceIndex });
    });
}

Sosumi.prototype.remoteLock = function(passcode, deviceIndex)
{
    if (deviceIndex >= this.devices.length) return;

    var self = this,
    body = JSON.stringify({
        "clientContext" : {
            "appName" : "FindMyiPhone",
            "appVersion" : "1.0",
            "buildVersion" : "57",
            "deviceUDID" : "0000000000000000000000000000000000000000",
            "inactiveTime" : 5911,
            "osVersion" : "3.2",
            "productType" : "iPad1,1",
            "selectedDevice" : this.devices[deviceIndex].id,
            "shouldLocate":false
        },
        "device" : this.devices[deviceIndex].id,
        "serverContext" : {
            "callbackIntervalInMS": 3000,
            "clientId" : "0000000000000000000000000000000000000000",
            "deviceLoadStatus" : "203",
            "hasDevices" : true,
            "lastSessionExtensionTime" : null,
            "maxDeviceLoadTime" : 60000,
            "maxLocatingTime" : 90000,
            "preferredLanguage" : "en",
            "prefsUpdateTime" : 1276872996660,
            "sessionLifespan" : 900000,
            "timezone" : {
                "currentOffset" : -25200000,
                "previousOffset" : -28800000,
                "previousTransition" : 1268560799999,
                "tzCurrentName" : "Pacific Daylight Time",
                "tzName" : "America/Los_Angeles"
            },
            "validRegion" : true
        },
        "oldPasscode" : "",
        "passcode" : passcode
    });

    this.postAPICall('/fmipservice/device/' + this.username + '/remoteLock', body, function (content) {
        self.emit('locked', { passcode: passcode, deviceIndex: deviceIndex });
    });
}

Sosumi.prototype.getHost = function (callback) {
    var self = this,
        body = this.getStubRequestBody();

    this.postAPICall(
        '/fmipservice/device/' + this.username + '/initClient', 
        body,
        callback
    );
}

Sosumi.prototype.getDevices = function(callback) {
    var self = this,
        body = this.getStubRequestBody();

    this.postAPICall(
        '/fmipservice/device/' + this.username + '/initClient', 
        body, 
        callback
    );
}


// helpers
Sosumi.prototype.getStubRequestBody = function() {
    return JSON.stringify({
        "clientContext": {
            "appName":"FindMyiPhone",
            "appVersion":"1.4",
            "buildVersion":"145",
            "deviceUDID":"0000000000000000000000000000000000000000",
            "inactiveTime":2147483647,
            "osVersion":"4.2.1",
            "personID":0,
            "productType":"iPad1,1"
        }
    });

};

Sosumi.prototype.postAPICall = function (url, body, callback) {
    console.info(this.host+url);

    var self = this;
    var headers = {
        'Authorization' : 'Basic ' + new Buffer(this.username + ':' + this.password, 'utf8').toString('base64'),
        'X-Apple-Find-Api-Ver': '2.0',
        'X-Apple-Authscheme': 'UserIdGuest',
        'X-Apple-Realm-Support': '1.0',
        'User-agent': 'Find iPhone/1.4 MeKit (iPad: iPhone OS/4.2.1)',
        'X-Client-Name': 'iPad',
        'X-Client-UUID': '0cf3dc501ff812adb0b202baed4f37274b210853',
        'Accept-Language': 'en-us',
        'Connection': 'keep-alive'
    };

    options = {
        host: this.host,
        path: url,
        headers: headers,
        port: 443,
        method: 'POST'
    }

    var requestCallback = function(response) {
       
        var result = '';
        
        response.setEncoding('utf8');
        
        if (response.statusCode == 330 
            && response.headers.hasOwnProperty('x-apple-mme-host')) 
        {
            self.host = response.headers['x-apple-mme-host'];
        }

        if (response.statusCode == 401 || response.statusCode == 403) {
            self.emit(
                'error', 
                new Error(
                    'Invalid credentials passed for MobileMe account: ' + self.username
                )
            );
        } else if (response.statusCode != 330 && response.statusCode != 200) {
            self.emit(
                'error', 
                new Error(
                    'HTTP Status returned non-successful: ' + response.statusCode
                )
            );
        }


        response.on('error',function( err ) {
            console.info(err);
        });
        response.on('data', function (chunk) {
            result += chunk;
        });

        response.on('end', function () {
            if (result !== '') {
                var json = JSON.parse(result);
                callback(json.content);
            } else {
                callback(null);
            }

        });
    }

    var request = http.request(options, requestCallback);
    request.on('error', function(err) {
        self.emit('error', err);
    });
    request.end(body,'utf8');
}
