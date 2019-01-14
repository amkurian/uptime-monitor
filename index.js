
//dependencies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config')

//server should respond to request with a string

var server = http.createServer(function(req, res){
	//Get the url and parse it
	console.log(req.url);
  var parsedUrl = url.parse(req.url, true);
	//Get the path
	var path = parsedUrl.pathname
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');
  //Get Query string as an object
  var queryStringObject = parsedUrl.query;
	//Get http method
	var method = req.method.toLowerCase()
	//Get headers as an object
	var headers =  req.headers;
	//Get the payloads
	var decoder = new StringDecoder('utf-8');
	var buffer =''
	req.on('data', function(data){
    buffer += decoder.write(data);
	})

	req.on('end', function(){
    buffer += decoder.end();
    //Choose handler
    var chosenHandler = typeof(router[trimmedPath]) != 'undefined' ? router[trimmedPath] : handlers.not_found
    //Construct data object that send to handler
    var data = {
    	'trimmedPath' : trimmedPath,
    	'queryStringObject' : queryStringObject,
    	'method' : method,
    	'headers' : headers,
      'payload' : buffer
    }

    //route the request to handler
    chosenHandler(data, function(statusCode, payload){
    	statusCode = typeof(statusCode) == 'number' ? statusCode : 200
    	payload = typeof(payload) == 'object' ? payload : {}

    	payloadString = JSON.stringify(payload);
    	//Send the response
    	res.setHeader('Content-Type','application/json');
    	res.writeHead(statusCode);
    	res.end(payloadString);
    	//log the request path
		  console.log(`The Request is received on ${trimmedPath}  ${buffer}`);
    });
		
	})
});

server.listen(config.port, function(){
  console.log(`Server is listening on ${config.port} in ${config.envName}`);
});

//Define a request router
var handlers = {}

handlers.sample = function(data, callback){
	//callback a http status code and a payload object
	callback(406, {'name' :'my name is sample'})
};
handlers.not_found = function(data,callback){
 callback(404, {'name' :'Method Not Found'})
};

var router = {
	'sample' : handlers.sample
}