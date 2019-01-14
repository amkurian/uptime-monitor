var fs = require('fs');
var path = require('path');
var helpers = require('./helpers')

var lib = {}

lib.baseDir = path.join(__dirname,'../.data/')

lib.create = function(dir,file,data,callback){
	console.log(lib.baseDir+dir+'/'+file+'.json');
	fs.open(lib.baseDir+'/'+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){
		if(!err && fileDescriptor){
      var stringData = JSON.stringify(data);
      fs.writeFile(fileDescriptor, stringData, function(err){
      	if(!err){
          fs.close(fileDescriptor, function(err){
          	if(err){
          		callback('error closing the file');
          	}
          	else{
          		callback(false);
          	}
          })
      	}
      	else{
      		callback('error writing the file');
      	}
      });
		}
		else{
			callback('could not open file' +err);
		}
	})
}

lib.read = function(dir,file,callback){
	fs.readFile(lib.baseDir+'/'+dir+'/'+file+'.json', 'utf-8', function(err,data){
		if(!err && data){
      var parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
		}else{
    callback(err,data);
    }
	})
}

// Update data in a file
lib.update = function(dir,file,data,callback){

  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // Convert data to string
      var stringData = JSON.stringify(data);

      // Truncate the file
      fs.truncate(fileDescriptor,function(err){
        if(!err){
          // Write to file and close it
          fs.writeFile(fileDescriptor, stringData,function(err){
            if(!err){
              fs.close(fileDescriptor,function(err){
                if(!err){
                  callback(false);
                } else {
                  callback('Error closing existing file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open file for updating, it may not exist yet');
    }
  });

};

// Delete a file
lib.delete = function(dir,file,callback){

  // Unlink the file from the filesystem
  fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(err){
    callback(err);
  });

};




module.exports = lib;