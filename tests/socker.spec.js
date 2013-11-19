var expect = require('chai').expect;
var engine = require('engine.io');
var sinon = require('sinon');
var PORT = 3656;
var client= require('engine.io-client');

describe('initialize express server, add engine.io, and cover by socker',function(){
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
  it('app should have sock.use and sock.when functions',function(){
    expect(app.sock).to.be.an('object');
    expect(app.sock.use).to.be.a('function');
    expect(app.sock.when).to.be.a('function');
  });

  describe('set up configuration for socket connection', function(){
    var soketInst;
    var c; //connection
    before(function(done){
      app.on('connection', function(socket){
        socker.attach(socket);
        socketInst = socket;
        done();
      });
      c = client('ws://localhost:' + PORT);
    })
    
    it('socket should have json method', function(){
      expect(socketInst).to.have.property('json').to.be.a('function');;
    })

    describe('set middleware with sock.use and send a dummy message', function(){
      var middleware;
      before(function(done){
        middleware = sinon.stub();
        middleware.callsArg(2);
        app.sock.use(middleware);
        c.send('{"__cbid":1,"message":"dummy"}', done);
      })
      
      it('middleware should be called', function(){
        expect(middleware.called).to.be.ok;
      });
      it('middleware should be called with second argument {message:"dummy"}', function(){
        expect(middleware.firstCall.args[1]).to.deep.equal({message:'dummy'});
      });
    })
    
    describe('set route and middlewares with sock.when and send a dummy1 message', function(){
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

    describe('set route and middlewares with sock.when and security, send a dummy1 message', function(){
      var routingMiddleware1, routingMiddleware2, routingMiddleware3, routingMiddleware4;
      before(function(done){
        routingMiddleware1 = sinon.stub();
        routingMiddleware2 = sinon.stub();
        securityMiddleware = sinon.stub();
        freeMiddleware = sinon.stub();
        freeMiddleware.callsArg(2);
        app.sock.setDefault(securityMiddleware);
        app.sock.when("READ - /api/security", routingMiddleware1);
        app.sock.when("READ - /api/free", app.sock.replaceWith(freeMiddleware), routingMiddleware2);
        c.send('{"__cbid":1,"message":"dummy1", "path":"READ - /api/security"}', function(){
          c.send('{"__cbid":1,"message":"dummy1", "path":"READ - /api/free"}', done);
        });
      })
      
      it('- routingMiddleware1 should be called', function(){
        expect(routingMiddleware1.called).to.not.be.ok;
      });
      it('- routingMiddleware2 should be called with second argument {message:"dummy1"}', function(){
        expect(routingMiddleware2.firstCall.args[1]).to.deep.equal({message:'dummy1'});
      });

      describe('if default middleware allows you to pass', function(){
        before(function(done){
          securityMiddleware.callsArg(2);
          c.send('{"__cbid":1,"message":"dummy1", "path":"READ - /api/security"}', done);
        })
        it('- routingMiddleware1 should be called with second argument {message:"dummy1"}', function(){
          expect(routingMiddleware2.firstCall.args[1]).to.deep.equal({message:'dummy1'});
        });
      })
    })
    // fail if no __cbid
    // fail if not an object
    // fail on timeout
  })
})
