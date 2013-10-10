socker
======

express like API for websockets over engine.io

## with socker you can

* use middlewares to process incoming data
* give a response on incoming "requests"
* use routing to structure your apps
* handle errors in the same way as in express

## how

#### setup
backend:
```javascript
var engine = require('engine.io');
var socker = require('socker');

var app = require('express')();
var server = http.createServer(app);
server.listen(nconf.get('server:port'));
server = engine.attach(server);
socker(server);
server.on('connection', function(socket){
  socker.attach(socket);
});

```
frontend:
```javascript
var socket = require('engine.io')('ws://localhost');
var sockerClient = require('socker-client');
sockerClient(socket);
socket.serve('CREATE /api/rooms', {name:"testName"}, function(err, data){
  // err contains error object if it was thrown
  // data is a response data
})
```
#### add middlewares
```javascript
server.sock.use(logger);
function logger(socket, data, next){
  // socket is a socket object
  // socket object have .json method to send a response
  // data - the data object sent with `request`
  console.log(data);
  next()
}
```
#### add routes
With routings you can create meaningful websocket based API
```javascript
server.sock.when('CREATE /api/rooms', checkRoom, createRoom);
server.sock.when('READ /api/room/:id', getRoom);
function getRoom(socket, data, next){
  // sicket.params['id'] contains id from the route
  // data is a data sent
  socket.json({room:"name", id: 100});
}
```
#### handle errors
```javascript
server.sock.use(function(err, socket, data, next){
  if(err){
    socket.json({err:err, code: 500})
  }
})
```

## mantainers 

[Eldar Djafarov](http://twitter.com/edjafarov)

## MIT
