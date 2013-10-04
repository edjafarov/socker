var expect = require('chai').expect;
var engine = require('engine.io');

var socker = require('../socker.js');
var PORT = 3656;
var client= require('engine.io-client');

describe('initialize express server, add engine.io, and cover by socker',function(){
  var app ;
  before(function(done){
   app = engine.listen(PORT);
   socker(app);
   done()
  });
  it('app should have sock.use and sock.when functions',function(){
    expect(app.sock).to.be.an('object');
    expect(app.sock.use).to.be.a('function');
    expect(app.sock.when).to.be.a('function');
  });

  describe('set up configuration for socket connection', function(){
    this.timeout(1000);
    var soketInst;
    before(function(done){
      app.on('connection', function(socket){
        socker.attach(socket);
        socketInst = socket;
        done();
      });
      var c = client('ws://localhost:' + PORT);
    })

    it('socket should have json method', function(){
      expect(socketInst).to.have.property('json').to.be.a('function');;
    })
  
  })
})
