var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers =require('./handlers');
var helpers = require('./helpers');
var path = require('path');

// Instantiate the server module object
var server = {};

 // Instantiate the HTTP server
server.httpServer = http.createServer(function(req,res){
   server.unifiedServer(req,res);
 });

 // Instantiate the HTTPS server
server.httpsServerOptions = {
   'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
   'cert': fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
 };
 server.httpsServer = https.createServer(server.httpsServerOptions,function(req,res){
   server.unifiedServer(req,res);
 });

server.unifiedServer = function(req, res){
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
    var chosenHandler = typeof(server.router[trimmedPath]) != 'undefined' ? server.router[trimmedPath] : handlers.not_found
    //Construct data object that send to handler
    var data = {
    	'trimmedPath' : trimmedPath,
    	'queryStringObject' : queryStringObject,
    	'method' : method,
    	'headers' : headers,
      'payload' : helpers.parseJsonToObject(buffer)
    }

    //route the request to handler
    chosenHandler(data, function(statusCode, payload){
    	statusCode = typeof(statusCode) == 'number' ? statusCode : 200
    	payload = typeof(payload) == 'object' ? payload : {}

    	payloadString = JSON.stringify(payload);
    	//Send the response
    	res.writeHead(statusCode);
    	res.end(payloadString);
    	//log the request path
		  console.log(`The Request is received on ${trimmedPath}  ${buffer}`);
    });
		
	})
}
var parseJsonToObject = function(str){
  try{
    var obj = JSON.parse(str);
    return obj;
  } catch(e){
    return {};
  }
};

server.router = {
  '' : handlers.index,
  'account/create' : handlers.accountCreate,
  'account/edit' : handlers.accountEdit,
  'account/deleted' : handlers.accountDeleted,
  'session/create' : handlers.sessionCreate,
  'session/deleted' : handlers.sessionDeleted.
  'checks/all' : handlers.checkList,
  'checks/create' : handlers.checkCreate,
  'checks/edit' : handlers.checkEdit,
	'ping' : handlers.ping,
	'api/users' : handlers.users,
	'api/tokens' : handlers.tokens,
	'api/checks' :handlers.checks
}

// Init script
server.init = function(){
  // Start the HTTP server
  server.httpServer.listen(config.httpPort,function(){
    console.log('The HTTP server is running on port '+config.httpPort);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort,function(){
   console.log('The HTTPS server is running on port '+config.httpsPort);
  });
};

module.exports = server;