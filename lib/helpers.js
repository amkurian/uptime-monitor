
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');
var helpers = {};
var path = require('path');
var fs = require('fs');


helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if (strLength) {
  	var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var str = '';
    for(i = 1; i <= strLength; i++) {
        var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
        str+=randomCharacter;
    }
    return str;
  }
  else{
    return false;
  }
};

helpers.sendTwilioSms = function(phone,msg,callback){
	var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
	var msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false
	if(phone && msg){
   var payload = {
   	'From' : config.twilio.fromPhone,
   	'To' : '91'+phone,
    'msg' : msg
   }

    var stringPayload = querystring.stringify(payload);


    // Configure the request details
    var requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    console.log(requestDetails);
    var req = https.request(requestDetails,function(res){
    	var status = res.statusCode;
    	if(status == 200 || status == 201){
    		callback(false)
    	}else{
    		callback('Status Code Returned was'+status);
    	}
    })

    req.on('error',function(e){
      callback(e);
    });

    req.write(stringPayload);

    req.end();

	}else{
		callback(400,{'Error' : 'Message Parameter Invalid'});
	}

}

helpers.getTemplate = function(templateName,data,callback){
  templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
  data = typeof(data) == 'object' && data !== null ? data : {};
  if(templateName){
    var templateDir = path.join(__dirname,'/../templates/');
    fs.readFile(templateDir+templateName+'.html','utf-8',function(err,str){
      if(!err && str && str.length > 0){
        var finalString = helpers.interpolate(str,data);
        callback(false,finalString);
      }else{
        callback('Template Not found');
      }
    })
  }else{
    callback('A valid template name was not found')
  }
}

helpers.addUniversalTemplates = function(str,data,callback){
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};
  // Get the header
  helpers.getTemplate('_header',data,function(err,headerString){
    if(!err && headerString){
      // Get the footer
      helpers.getTemplate('_footer',data,function(err,footerString){
        if(!err && headerString){
          // Add them all together
          var fullString = headerString+str+footerString;
          callback(false,fullString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  });
};


// Take a given string and data object, and find/replace all the keys within it
helpers.interpolate = function(str,data){
  str = typeof(str) == 'string' && str.length > 0 ? str : '';
  data = typeof(data) == 'object' && data !== null ? data : {};

  for(var keyName in config.templateGlobals){
     if(config.templateGlobals.hasOwnProperty(keyName)){
       data['global.'+keyName] = config.templateGlobals[keyName]
     }
  }
  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for(var key in data){
     if(data.hasOwnProperty(key) && typeof(data[key] == 'string')){
        var replace = data[key];
        var find = '{'+key+'}';
        str = str.replace(find,replace);
     }
  }
  return str;
};


module.exports = helpers;

