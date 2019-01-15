//Define a request router
var _data = require('./data');
var _helpers = require('./helpers')
var config = require('./config');
var handlers = {}

handlers.ping = function(data,callback){
 callback(200);
}

handlers.not_found = function(data,callback){
 callback(404, {'name' :'Method Not Found'})
};

handlers.users = function(data,callback){
 var acceptableMethods = ['post','get','put','delete'];
 console.log('users')
 console.log(acceptableMethods.indexOf(data.method));
 if(acceptableMethods.indexOf(data.method) > -1){
 	handlers._users[data.method](data,callback);
 }
 else{
  callback(405);
 }
};

handlers._users = {}
//Required fields firstName, lastName, phone, password, tosAgreement
handlers._users.post = function(data,callback){
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;
  if(firstName && lastName && phone && password && tosAgreement){
  	_data.read('users',phone, function(err,data){
  		if(err){
  			var hashedPassword = _helpers.hash(password);
  			if(hashedPassword){
  				var userObject = {
          'firstName' : firstName,
          'lastName' : lastName,
          'phone' : phone,
          'hashedPassword' : hashedPassword,
          'tosAgreement' : true
        };
	       _data.create('users',phone,userObject,function(err){
	       	if(!err){
	       		callback(200);
	       	}
	     		else{
	     			console.log(err);
	     			callback(500,{'Error' :'Could not create new user'});
	     		}
	       }) 
	  	  }
	  	  else{
          callback(500,{'Error' :'Could not use the given password'});
	  	  }
  		}
  		else{
  			callback(400,{'Error' : 'A user with that phone number aready exist'});
  		}
  	});
  }
  else{
  	callback(400,{'Error' : 'Missing required fields'});
  }
};

// Required data: phone
// Optional data: none
handlers._users.get = function(data,callback){
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  	handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
     if(tokenIsValid){
	     	_data.read('users',phone,function(err,data){
	  		if(!err && data){
	  			delete data.hashedPassword;
	        callback(200, data);
	  		}else{
	  			callback(400,{'Error' : 'Data Not Found'});
	  		}
	  	  })
     }else{
     	callback(400,{'Error' : 'Invalid Token'});
     }
  	})

  }else{
  	callback(400,{'Error' : 'Missing valid phone number'});
  }
};

// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data,callback){
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(phone){
    if(firstName || lastName || password){
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
        if(tokenIsValid){

          _data.read('users',phone,function(err,userData){
            if(!err && userData){
              if(firstName){
                userData.firstName = firstName;
              }
              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              _data.update('users',phone,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error' : 'Specified user does not exist.'});
            }
          });
        } else {
          callback(403,{"Error" : "Missing required token in header, or token is invalid."});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }

};

// Required data: phone
// Cleanup old checks associated with the user
handlers._users.delete = function(data,callback){
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        _data.read('users',phone,function(err,data){
          if(!err && data){
            _data.delete('users',phone,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};


handlers.tokens = function(data,callback){
 var acceptableMethods = ['post','get','put','delete'];
 console.log('users')
 console.log(acceptableMethods.indexOf(data.method));
 if(acceptableMethods.indexOf(data.method) > -1){
 	handlers._tokens[data.method](data,callback);
 }
 else{
  callback(405);
 }
};

handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback){
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  if (phone && password){
  	_data.read('users',phone, function(err,userData){
  		if(!err && userData){
        var hashedPassword = _helpers.hash(password);
        if(hashedPassword == userData.hashedPassword){
          var tokenId = _helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
          	'phone' : phone,
          	'tokenId' : tokenId,
          	'expires' : expires
          }
          _data.create('tokens',tokenId,tokenObject,function(err){
		       	if(!err){
		       		callback(200);
		       	}
		     		else{
		     			console.log(err);
		     			callback(500,{'Error' :'Could not create new token'});
		     		}
		       }) 
        }else{
        	callback(500, {'Error' : 'password not correct'})
        }
  		}else{
  			callback(500, {'Error' : 'Could not find user data'})
  		}
  	})

  }else{
  	callback(400, {'Error' : 'Missing Required Fields'})
  }
}
// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data,callback){
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        callback(200,tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field, or field invalid'})
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data,callback){
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if(id && extend){
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        if(tokenData.expires > Date.now()){
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          _data.update('tokens',id,tokenData,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error' : 'Could not update the token\'s expiration.'});
            }
          });
        } else {
          callback(400,{"Error" : "The token has already expired, and cannot be extended."});
        }
      } else {
        callback(400,{'Error' : 'Specified user does not exist.'});
      }
    });
  } else {
    callback(400,{"Error": "Missing required field(s) or field(s) are invalid."});
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data,callback){
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        _data.delete('tokens',id,function(err){
          if(!err){
            callback(200);
          } else {
            callback(500,{'Error' : 'Could not delete the specified token'});
          }
        });
      } else {
        callback(400,{'Error' : 'Could not find the specified token.'});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phone,callback){
  _data.read('tokens',id,function(err,tokenData){
  	console.log(err);
  	console.log(id);
  	console.log(phone);
    console.log(tokenData.phone)
    console.log(tokenData.expires)
    if(!err && tokenData){
      if(tokenData.phone == phone && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

handlers.checks = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  console.log('users')
  console.log(acceptableMethods.indexOf(data.method));
  if(acceptableMethods.indexOf(data.method) > -1){
 	  handlers._checks[data.method](data,callback);
  }
  else{
    callback(405);
  }
 };

 handlers._checks = {}

// Checks - post
// Required data: protocol,url,method,successCodes,timeoutSeconds
// Optional data: none
 handlers._checks.post = function(data,callback){
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  if(protocol && url && method && successCodes && timeoutSeconds){
  	var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
  	_data.read('tokens', token, function(err,tokenData){
  		if(!err && tokenData){
        var userPhone = tokenData.phone;
        _data.read('users',userPhone,function(err,userData){
        	if(!err && userData){
            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
            if(userChecks.length < config.maxChecks){
               var checkId = _helpers.createRandomString(20);
               var checkObject = {
               	'id' : checkId,
               	'userPhone' : userPhone,
               	'protocol' : protocol,
               	'url' : url,
               	'method' : method,
               	'successCodes' : successCodes,
               	'timeoutSeconds' : timeoutSeconds
               }
               _data.create('checks',checkId,checkObject,function(err){
               	if(!err){
                  userData.checks = userChecks
                  userData.checks.push(checkId);
                  _data.update('users',userPhone,userData,function(err){
                  	if(!err){
                      callback(200,checkObject);
                  	}else{
                  		callback(500,{'Error':'Could not update users'})
                  	}
                  })
               	}else{
                  callback(500,{'Error':'Could not create checks' +err });
               	}
               })
            }else{
            	callback(400,{'Error':'User exceeded the checks'})
            }    	
          }else{
        		callback(503);
        	}
        })
  		}else{
  			callback(403)
  		}
  	})

  }else{
  	callback(400,{'Error':'Missing Parameter Data'})
  }
 }

// Checks - get
// Required data: id
// Optional data: none
 handlers._checks.get = function(data,callback){
 	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
  	_data.read('checks',id,function(err,checksData){
  		if(!err && checksData){
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
	  	  handlers._tokens.verifyToken(token,checksData.userPhone,function(tokenIsValid){
          console.log('tokenIsValid'+tokenIsValid)
		    if(tokenIsValid){
			    callback(200, checksData)
		     }else{
		     	callback(403);
		     }
		  	})
  		}else{
        callback(404)
  		}
  	})
  }else{
  	callback(400,{'Error' : 'Missing valid id'});
  }
};

// Checks - put
// Required data: id
// Optional data: protocol,url,method,successCodes,timeoutSeconds (one must be sent)
handlers._checks.put = function(data,callback){
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if(id){
    if(protocol || url || method || successCodes || timeoutSeconds){
      _data.read('checks',id,function(err,checkData){
        if(!err && checkData){
          var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
            if(tokenIsValid){
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }
              _data.update('checks',id,checkData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the check.'});
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400,{'Error' : 'Check ID did not exist.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }
};




module.exports = handlers;