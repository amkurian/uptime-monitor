
//dependencies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder


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
    //Send the response
	  res.end('hello');
		//log the request path
		console.log(`The Request is received on ${trimmedPath}  ${buffer}` );
	})
});

server.listen(3000, function(){
  console.log('Server is listening on 3000');
});
