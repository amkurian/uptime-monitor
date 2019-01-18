var path = require('path');
var fs = require('fs');
var _data = require('./data');
var http = require('http');
var https = require('https');
var url = require('url');
var helpers = require('./helpers');
var _logs = require('./logs');

workers = {}

workers.loop =function(){
	setInterval(function(){
		workers.gatherAllChecks();
	}, 1000*5)
};

workers.gatherAllChecks = function(){
	_data.list('checks',function(err,checks){
		if(!err && checks && checks.length > 0){
			checks.forEach(function(check){
				_data.read('checks',check,function(err,originalCheckData){
					if(!err && originalCheckData){
            workers.validateCheckData(originalCheckData);
					}else{
						console.log('Error: Reading the Data')
					}
				})
			})
		}else{
			console.log('Error or No checks');
		}
	})
};

// Sanity-check the check-data,
workers.validateCheckData = function(originalCheckData){
  originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) == 'string' &&  ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
  // Set the keys that may not be set (if the workerss have never seen this check before)
  originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all checks pass, pass the data along to the next step in the process
  if(originalCheckData.id &&
  originalCheckData.userPhone &&
  originalCheckData.protocol &&
  originalCheckData.url &&
  originalCheckData.method &&
  originalCheckData.successCodes &&
  originalCheckData.timeoutSeconds){
    workers.performCheck(originalCheckData);
  } else {
    // If checks fail, log the error and fail silently
    console.log("Error: one of the checks is not properly formatted. Skipping.");
  }
};

//perform the check send the originalCheckData and the outcome to the next

workers.performCheck = function(originalCheckData){
	//prepare the initial check out come
 var checkOutcome = {
 	'error' : false,
 	'responseCode' : false 
 }

 var outcomeSent = false;

 var parsedUrl = url.parse(originalCheckData.protocol+'//'+originalCheckData.url,false);
 var hostName = parsedUrl.hostName;
 var path = parsedUrl.path;

 var requestDetails = {
 	'protocol' : originalCheckData.protocol+':',
 	'hostname' : hostName,
 	'method' : originalCheckData.method.toUpperCase(),
 	'path' : originalCheckData.timeoutSeconds*1000
 };

 //instantiate request details using http or https
 var _moduleToUse = originalCheckData.protocol == 'http' ? http : https
 var req = _moduleToUse.request(requestDetails,function(res){
 	  var status = res.statusCode;
 	  checkOutcome.responseCode = status;
 	  if(!outcomeSent){
       workers.processCheckOutcome(originalCheckData,checkOutcome);
       outcomeSent = true;
    }
 });

   // Bind to the error event so it doesn't get thrown
  req.on('error',function(e){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : e};
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout',function(e){
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {'error' : true, 'value' : 'timeout'};
    if(!outcomeSent){
      workers.processCheckOutcome(originalCheckData,checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
}


// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function(originalCheckData,checkOutcome){

  // Decide if the check is considered up or down
  var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Decide if an alert is warranted
  var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
  
  var timeOfCheck = Date.now();
  workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);
  // Update the check data
  var newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update('checks',newCheckData.id,newCheckData,function(err){
    if(!err){
      // Send the new check data to the next phase in the process if needed
      if(alertWarranted){
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Check outcome has not changed, no alert needed");
      }
    } else {
      console.log("Error trying to save updates to one of the checks");
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData){
  var msg = 'Alert: Your check for '+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
  helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
    if(!err){
      console.log("Success: User was alerted to a status change in their check, via sms: ",msg);
    } else {
      console.log("Error: Could not send sms alert to user who had a state change in their check",err);
    }
  });
};

workers.init = function(){
 //Execute all checks immediately
 workers.gatherAllChecks();
 //call the so the checks will execute later on
 workers.loop();
 workers.rotateLogs();
 workers.logRotationLoop();
};


// Rotate (compress) the log files
workers.rotateLogs = function(){
  // List all the (non compressed) log files
  _logs.list(false,function(err,logs){
    if(!err && logs && logs.length > 0){
      logs.forEach(function(logName){
        // Compress the data to a different file
        var logId = logName.replace('.log','');
        var newFileId = logId+'-'+Date.now();
        _logs.compress(logId,newFileId,function(err){
          if(!err){
            // Truncate the log
            _logs.truncate(logId,function(err){
              if(!err){
                console.log("Success truncating logfile");
              } else {
                console.log("Error truncating logfile");
              }
            });
          } else {
            console.log("Error compressing one of the log files.",err);
          }
        });
      });
    } else {
      console.log('Error: Could not find any logs to rotate');
    }
  });
}; 

//timer to perform log rotation once per day
workers.logRotationLoop = function(){
  setInterval(function(){
    workers.rotateLogs();
  }, 1000*60*60*24)
}


workers.log = function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck){
  // Form the log data
  var logData = {
    'check' : originalCheckData,
    'outcome' : checkOutcome,
    'state' : state,
    'alert' : alertWarranted,
    'time' : timeOfCheck
  };

  // Convert the data to a string
  var logString = JSON.stringify(logData);

  // Determine the name of the log file
  var logFileName = originalCheckData.id;

  // Append the log string to the file
  _logs.append(logFileName,logString,function(err){
    if(!err){
      console.log("Logging to file succeeded");
    } else {
      console.log("Logging to file failed"+err);
    }
  });

};


module.exports = workers;
