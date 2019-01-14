
//dependencies
var http = require('http');
var url = require('url');


//server should respond to request with a string

var server = http.createServer(function(req, res){
	//Get the url and parse it
	console.log(req.url);
  var parsedUrl = url.parse(req.url, true);
	//Get the path
	var path = parsedUrl.pathname
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');
	//Send the response
  res.end('test');
	//log the request path
	console.log(`The Request is received on ${trimmedPath}`)
});

server.listen(3000, function(){
  console.log('Server is listening on 3000');
});
