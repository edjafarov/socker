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
    
    xdescribe('set route and middlewares with sock.when and send a dummy1 message', function(){
      var routingMiddleware1, routingMiddleware2, routingMiddleware3, routingMiddleware4;
      before(function(done){
        routingMiddleware1 = sinon.stub();
        routingMiddleware2 = sinon.stub();
        routingMiddleware3 = sinon.stub();
        routingMiddleware4 = sinon.stub();
        routingMiddleware1.callsArg(2);
        
        app.sock.when("READ - /api/dummy/:id", routingMiddleware1, routingMiddleware2, routingMiddleware3);
        app.sock.when("READ - /api/:id/dummy", routingMiddleware4);
        c.send('{"__cbid":1,"message":"dummy1", "path":"READ - /api/dummy/1234"}', done);
      })
      
      it('- routingMiddleware1 should be called', function(){
        expect(routingMiddleware1.called).to.be.ok;
      });
      it('- routingMiddleware1 should be called with second argument {message:"dummy1"}', function(){
        expect(routingMiddleware1.firstCall.args[1]).to.deep.equal({message:'dummy1'});
      });
      it('- routingMiddleware2 should be called with second argument {message:"dummy1"}', function(){
        expect(routingMiddleware2.firstCall.args[1]).to.deep.equal({message:'dummy1'});
      });
      it('- routingMiddleware3 should not be called', function(){
        expect(routingMiddleware3.called).to.be.not.ok;
      });
      it('- routingMiddleware4 should not be called', function(){
        expect(routingMiddleware4.called).to.be.not.ok;
      });
    
    })
  })
})
