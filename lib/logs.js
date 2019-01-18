var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

// Container for module (to be exported)
var lib = {};

lib.baseDir = path.join(__dirname,'/../.logs/');

lib.append = function(file,str,callback){
	fs.open(lib.baseDir+file+'.log', 'a', function(err, fileDescriptor){
		if(!err && fileDescriptor){
			fs.appendFile(fileDescriptor, str+'\n',function(err){
				if(!err){
					fs.close(fileDescriptor,function(err){
						if(!err){
							callback(false);
						}else{
							callback('Error closing the file');
						}
					});
				}else{
					callback('Error opening the file');
				}
			})
		}else{
			callback('Error opening the file'+err);
		}
	});
}

// Export the module
module.exports = lib;