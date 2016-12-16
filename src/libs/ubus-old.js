/*

This code was taken from "sudowrt-web-ui" and was written by Marc Juul and Maxb.
It is licensed AGPL-3.0. 

*/

var rpc = require('node-json-rpc');
var moment = require('moment');

module.exports = function(opts) {
  opts = opts || {};
  this.ubusProtocol = opts.ubusProtocol || global.location.protocol + '//';
  this.ubusPath = opts.ubusPath || '/ubus';
  var port;
  if (global.location.port.trim() === '') {
    if (this.ubusProtocol === 'https://') {
      port = '443';
    } else {
      port = '80';
    }
  } else {
    port = global.location.port;
  }
  this.ubusPort = opts.ubusPort || port;
  this.ubusHost = opts.ubusHost || global.location.hostname;

  this.sessionID = null;

  var rpcOptions = {
    port: this.ubusPort,
    host: this.ubusHost,
    path: this.ubusPath,
    strict: false
  };

  var rpcClient = new rpc.Client(rpcOptions);

  this._call = function(obj, method, args, callback) {

    var sessionID;
    if((obj == 'session') && (method == 'login')) {
      this.sessionID = null;
      // The string of zeroes is a null session which can only call login
      sessionID = '00000000000000000000000000000000';
    } else {
      sessionID = this.sessionID;
    }

    if(!sessionID) {
      if(callback) {
        callback("Not logged in");
      }
      return;
    }

    console.log([sessionID, obj, method, args]);

    rpcClient.call({
      method: 'call', 
      jsonrpc: '2.0',
      id: 1,
      params: [sessionID, obj, method, args]
    }, function (err, res) {
      if (err || 
          (typeof res === 'object' && res.error)) { 
        console.log(err); 
        if(callback) {
          callback(err);
        }
      } else { 
        console.log(res);
        if (callback) {
          var result = res.result;
          if (result[0] === 0) {
            callback(null, result[1]);
          } else if(result[0] === 6) {
            callback("ubus: permission denied");
          } else if(result[0] === 5) {
            callback("ubus: no output");
          } else {
            callback("ubus: unknown error code: " + result[0]);
          }
        }
      }
    });
  };

  // ubus.call('myobject.mymethod', [args], [callback])
  this.call = function(methodPath, args, callback) {

    var methodPathParts = methodPath.split('.');
    var obj = methodPathParts[0];
    var method = methodPathParts.slice(1).join('.');

    return this._call(obj, method, args, callback);
  };

  this.logout = function(callback) {
    return this._call('session', 'destroy', { session: this.sessionID }, callback);
  };

  this.login = function(username, password, callback) {
    if(!username || !password) {
      if(callback) {
        callback("username or password missing");
      }
      return;
    }

    return this._call('session', 'login', {
      username: username,
           password: password
    }, function(err, res) {
      if(err) {
        return callback(err, res);
      }
      if(!res.ubus_rpc_session) {
        return callback("login failed: ubus server did not return session id", res);
      }
      this.sessionID = res.ubus_rpc_session;
      this.sessionExpiration = moment().add(res.expires, 'seconds').toISOString();

      callback(null, res);
    }.bind(this));
  };

};
