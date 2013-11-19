var expect = require('chai').expect;
var engine = require('engine.io');
var sinon = require('sinon');
var sockerClient = require('../socker.client.js');
var PORT = 3657;
var client= require('engine.io-client');

describe('SOCKER-CLIENT: initialize express server, add engine.io, and cover by socker',function(){
  var socker;
  var app ;
  before(function(done){
   app = engine.listen(PORT);
   socker = require('../socker.js');
   socker(app);
   done()
  });
  after(function(done){
    app.close();
    delete require.cache[require('path').normalize(__dirname + '/../socker.js')];
    done();
  })

  describe('attach socker to a socket on connection and connect from client, cover client by sockerClient', function(){
    var soketInst;
    var c; //connection
    before(function(done){
      app.on('connection', function(socket){
        socker.attach(socket);
        socketInst = socket;
        done();
      });
      c = client('ws://localhost:' + PORT);
      sockerClient(c);
    })
    it('client should obtain serve method', function(){
      expect(c).to.have.property('serve').to.be.a('function');
    });
    //check the event was added(for unit)
    
    describe('set middleware with sock.when and send a dummy message with socker client, receive response', function(){
      var middleware;
      var clientcb1;
      var clientcb2;
      var errorMiddleware;
      
      before(function(done){
        clientcb1 = sinon.spy();
        clientcb2 = sinon.spy();

        middleware = function(socket, data, next){
          socket.json({message: 're:' + data.message, key: socket.params['id']});
        };
        errorMiddleware = function(socket, data, next){
          next({code: 123, message:"fail"});
        }
        app.sock.when('/error', errorMiddleware);
        app.sock.when('/api/:id/dummy2', middleware);
        
        c.serve('/api/2/dummy2', {message:'dummy2'}, function(err, data){
          clientcb1.apply(this, arguments);
          c.serve('/error', {message:'dummy2'}, gotError);
        });

        function gotError(){
          clientcb2.apply(this, arguments);
          done();
        }
      })
      
      it('middleware should be called', function(){
        expect(clientcb1.called).to.be.ok;
      });
      it('middleware should be called with second argument {message:"dummy2"}', function(){
        expect(clientcb1.firstCall.args[1]).to.deep.equal({message:'re:dummy2', key: "2"});
      });
      it('Errormiddleware should be responded', function(){
        expect(clientcb2.called).to.be.ok;
      });
      it('error should be returned with a bunch of metadata', function(){
        expect(clientcb2.firstCall.args[0]).to.have.property("err").to.have.property('code', 123);
      });
    })
 
    describe('set middleware with sock.use and send a dummy message', function(){
      var middleware;
      var clientcb;
      before(function(done){
        clientcb = sinon.spy();
        middleware = function(socket, data, next){
          socket.json({message: 're:' + data.message});
        };
        app.sock.use(middleware);
        c.serve({message:'dummy1'}, function(err, data){
          clientcb.apply(this, arguments);
          done();
        });
      })
      
      it('middleware should be called', function(){
        expect(clientcb.called).to.be.ok;
      });
      it('middleware should be called with second argument {message:"dummy1"}', function(){
        expect(clientcb.firstCall.args[1]).to.deep.equal({message:'re:dummy1'});
      });
      //TODO: hack and send without __cbid, wrong __cbid, expired __cbid
    })
    

  })
})
