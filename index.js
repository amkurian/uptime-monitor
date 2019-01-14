
//dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

var httpsServerOptions = {
	'key' : fs.readFileSync('./https/key.pem'),
	'cert' : fs.readFileSync('./https/cert.pem')
}

var http_server = http.createServer(function(req, res){
	unifiedServer(req, res);
});


http_server.listen(config.httpPort, function(){
  console.log(`Server is listening on ${config.httpPort} in ${config.envName}`);
});

var https_server = https.createServer(httpsServerOptions, function(req, res){
	unifiedServer(req, res);
});


https_server.listen(config.httpsPort, function(){
  console.log(`Server is listening on ${config.httpsPort} in ${config.envName}`);
});

var unifiedServer = function(req, res){
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
    console.log(trimmedPath);
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
}

//Define a request router
var handlers = {}

handlers.ping = function(data,callback){
 callback(200);
}

handlers.not_found = function(data,callback){
 callback(404, {'name' :'Method Not Found'})
};

var router = {
	'ping' : handlers.ping
}