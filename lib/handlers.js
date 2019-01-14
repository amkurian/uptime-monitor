//Define a request router
var _data = require('./data');
var _helpers = require('./helpers')
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

handlers._users.get = function(data,callback){
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
  	_data.read('users',phone,function(err,data){
  		if(!err && data){
  			delete data.hashedPassword;
        callback(200, data);
  		}else{
  			callback(400,{'Error' : 'Data Not Found'});
  		}
  	})

  }else{
  	callback(400,{'Error' : 'Missing valid phone number'});
  }
};

handlers._users.put = function(data,callback){
	var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  
  if(phone){
  	if(firstName || lastName || password){
  		_data.read('users',phone,function(err,userData){
  		if(!err && userData){
  			if(firstName){
  				userData.firstName = firstName;
  			}
  			if(lastName){
  				userData.lastName = lastName;
  			}
  			if(password){
  				userData.hashedPassword = _helpers.hash(password);
  			}
  			_data.update('users',phone,userData,function(err){
  				if(!err){
  					callback(200);
  				}else{
  					console.log(err);
	     			callback(500,{'Error' :'Could not update the user'});
  				}
  			})
        callback(200, data);
  		}else{
  			callback(400,{'Error' : 'Data Not Found'});
  		}
  	})
  	}else{
      callback(400,{'Error' : 'Missing params to update'});
  	}
  }else{
  	callback(400,{'Error' : 'Missing valid phone number'});
  }
};

handlers._users.delete = function(data,callback){
  // Check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
    // Lookup the user
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
    callback(400,{'Error' : 'Missing required field'})
  }
};

module.exports = handlers;