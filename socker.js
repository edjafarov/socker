//CRUD over engine io
var async = require('async');



module.exports = function(server){
  server.sock = {
    use : function(middleware){
      if(argsNumber(middleware) > 3){ // err at the beginning
        errMiddlewares.splice(errMiddlewares.length - 1, 0, middleware);
      }else{
        //preLast, instead of last
        //last will be routing if wasnt called befoew
        //socketMiddlewares.push(middleware);
        socketMiddlewares.splice(socketMiddlewares.length - 1, 0, middleware);
      }
    },
    when : function(){
      var argum = Array.prototype.slice.call(arguments);
      var path = argum.shift();
      var args = [];
      var matcher = pathRegexp(path, args);
      var route = {
        path : path,
        matcher : matcher,
        args : args,
        middlewares : argum
      }
      if(defaultMiddleware){
        var haveDefault = false;
        route.middlewares.forEach(function(middle){
          if(middle.__isdefault) haveDefault = true;
        });
        if(!haveDefault){
          route.middlewares.unshift(defaultMiddleware);
        }
      }
      routes.push(route);
    },
    replaceWith: function(middleware){
      middleware.__isdefault = true;
      return middleware;
    },
    setDefault: function(middleware){
      defaultMiddleware = middleware;
      defaultMiddleware.__isdefault = true;
      routes.forEach(function(route){
        var haveDefault = false;
        route.middlewares.forEach(function(middle){
          if(middle.__isdefault) haveDefault = true;
        });
        if(!haveDefault){
          route.middlewares.unshift(defaultMiddleware);
        }
      });
    },
    timeout: function(){
      timeout = 2000;
    }
  }
}



module.exports.client = require('./socker.client.js');

module.exports.route = function (socket, data, callback){
  if(socket.routingDone || !data.path) return callback();//routing was handled before
  socket.routingDone = true;
  var path = data.path;
  delete data.path;
  for(var i = 0; i < routes.length; i++){
    var m = routes[i].matcher.exec(path);
    var params = [];
    if(!m) continue;
    for (var j = 1, len = m.length; j < len; ++j) {
      var key = routes[i].args[j - 1];
      var val = m[j];
      if(key){
        params[key.name] = val;
      }else{
        params.push(val);
      }
    }
    socket.params = params;
    async.applyEachSeries(routes[i].middlewares, socket, data, callback);
    break;
  }
  
  //routing mddlw
  // should get calls like
  // "text wtf and parse (:id) guys out upto slashes as params"
  // "CREATE - /api/room/:id"
  // "READ - /smth/:id/to"
  // api should look like:
  // create('/api/room/:id', function(soket, data, next){})
  // by soket.json({/stuff/}) you can send response back
  // next(error) will handle errors

  //on client - you will have socket.update('/api/room/12323', data, function(err, responseData){});
  // socket.create('/api/room/:id/messages', messageData, function(err){})
  // socket.update('/api/user/:id', messageData, function(err){});
  // _register|actions_
  // socket.registerAction('join', function(input, msgObject){}, function(errInout, respInput){});
  // socket.join('/api/user/:id', messageRoomId, function(){})
}
module.exports.route.routingMdlw = true;

function errorHandler(err, socket, data, next){
  var error = {
    type: "ERROR",
    err : err,
    data : data
  };
  socket.json(error);
}

var socketMiddlewares = [module.exports.route];
var errMiddlewares = [errorHandler];
var routes = [];
var timeout = 2000;
var defaultMiddleware;

module.exports.attach = function (socket){
  socket.json = function(data){
    var response = {};
    response.__raw = data;
    if(data) {
      response.type = data.type;
      delete data.type;
    }
    response.__cbid = this.__cbid;
    clearTimeout(this.callTimeout);
    delete this.callTimeout;
    socket.send(JSON.stringify(response));
    delete this.__cbid;
  };
  
  socket.on('message', function(data){
    try{
      data = JSON.parse(data);
    }catch(e){
      console.log("ERROR!!!!! -" + e);
      return socket.json({type:"ERROR", code: 400, details:"the call is not an object"})
      
    }
    //throw error if there is no __cbid?
    if(!data.__cbid) return socket.json({type:"ERROR", code: 413, details:"the call does not have __cbid idetificator", data:data})
    
    var sock = {
      __cbid: data.__cbid,
      callTimeout: setTimeout(function(){
        sock.json({type:"ERROR", code: 408, details:"the call " + data.__cbid + "was timed out"})
        delete sock.__cbid;
      }, timeout)
    };
    sock.__proto__ = socket;
    delete data.__cbid;
    
    //we need to check routing mddlw here, add it to the end if not exists
    async.applyEachSeries(socketMiddlewares, sock, data, flowComplete);
    
    //try to remove it from scope
    function flowComplete(err){
      async.applyEachSeries(errMiddlewares, err, sock, data, errorFlowComplete);
      function errorFlowComplete(errFlowErr){
        socket.json({"message":"terrible error"});
      }
    }
  })
}


var argRe = /^\s*function\s+(?:\w*\s*)?\((.*?)\)/;


function pathRegexp(path, keys, sensitive, strict) {
  if (toString.call(path) == '[object RegExp]') return path;
  if (Array.isArray(path)) path = '(' + path.join('|') + ')';
  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
       keys.push({ name: key, optional: !! optional });
       slash = slash || '';
       return ''
         + (optional ? '' : slash)
         + '(?:'
         + (optional ? slash : '')
         + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
         + (optional || '')
         + (star ? '(/*)?' : '');
   })
   .replace(/([\/.])/g, '\\$1')
   .replace(/\*/g, '(.*)');
   return new RegExp('^' + path + '$', sensitive ? '' : 'i');
}





function argsNumber(func){
  var match = func.toString().match(argRe);
  if(match && match[1]){
    return match[1].split(',').length;
  }else{
    return false;
  }
}
