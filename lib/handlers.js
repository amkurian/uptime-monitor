//Define a request router
var handlers = {}

handlers.ping = function(data,callback){
 callback(200);
}

handlers.not_found = function(data,callback){
 callback(404, {'name' :'Method Not Found'})
};


module.exports = handlers;