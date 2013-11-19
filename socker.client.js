;(function(){
  
var cbStack = {};

//socker-client
var sockerClient = function(socket){
  socket.addEventListener('message', function(data){
    try{
      data = JSON.parse(data);
    }catch(e){
      //throw new Error("data is not an object " + data);
      //ignore?
    }
    if(data.__cbid){
      var callback = cbStack[data.__cbid];
      if(!callback) throw new Error("cbid " + data.__cbid + "is not available");
      if(data.type === "ERROR"){
        callback.call(this, data.__raw);
      } else {
        callback.call(this, null, data.__raw);
      }
    }

  });
  socket.serve = function(path, data, callback){
    if(typeOfArgument(data) === "[object Function]"){
      callback = data;
      if(typeOfArgument(path) === "[object String]"){
        data = {};
      }
    }
    if(typeOfArgument(path) === "[object Object]") {
      data = path;
    }
    var packet = packetBuild(path, data);
    cbStack[packet.__cbid] = callback;
    socket.send(JSON.stringify(packet));
  }
  return socket;
}

function packetBuild(path, data){
  var clone = JSON.parse(JSON.stringify(data));
  clone.path = path;
  clone.__cbid = Math.ceil(Math.random()*Math.pow(10,16));
  return clone;
}

function typeOfArgument(arg){
  return Object.prototype.toString.call(arg);
}


if (typeof exports == "object") {
  module.exports = sockerClient;
} else if (typeof define == "function" && define.amd) {
  define(function(){ return sockerClient; });
} else {
  this["sockerClient"] = sockerClient;
}

})();
