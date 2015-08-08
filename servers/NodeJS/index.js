var express = require('express');
var multifetch = require('multifetch');

var app = express();

app.get('/', function(req, res) {
	res.send('Try /foo or /bar.');
});

app.get('/batch', multifetch({
	headers: {
		'dsds': 'sdsd'
	}
}));

app.get('/foo', function(req, res) {
	res.send({message:'Foo!'});
});

app.get('/bar', function(req, res) {
	res.send({message:'Bar!', query: req.query});
});

app.get('/fail', function(req, res) {
	res.sendStatus(500);
});

app.listen(8080);

console.log('Listening on port 8080');