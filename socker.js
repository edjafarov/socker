//CRUD over engine io
var async = require('async');

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
var socketMiddlewares = [module.exports.route];
var errMiddlewares = [];
var routes = [];

module.exports = function(server){
  server.sock = {
    use : function(middleware){
      if(argsNumber(middleware) > 3){ // err at the beginning
        errMiddlewares.push(middleware);
      }else{
        //preLast, instead of last
        //last will be routing if wasnt called befoew
        //socketMiddlewares.push(middleware);
        socketMiddlewares.splice(socketMiddlewares - 1, 0, middleware);
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
      routes.push(route);
    }
  }
}

module.exports.attach = function (socket){
  socket.json = function(data){
    data.__cbid = this.__cbid;
    socket.send(JSON.stringify(data));
    delete this.__cbid;
  };
  
  socket.on('message', function(data){
    try{
      data = JSON.parse(data);
    }catch(e){
      console.log("ERROR!!!!! -" + e);
      //TODO:handle error
    }
    //throw error if there is no __cbid?

    var sock = {
      __cbid: data.__cbid
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
