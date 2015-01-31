var prof = require('./libs/fprofiler');
var conf = require('./libs/fconfig');
prof.io('log required');
var fdir = require('./libs/fdir').setDir(__dirname+"/html");
prof.io('fdir required');
var fcache = require('./libs/fcache');
prof.io('fcache required');
var os = require('os');
//var cluster = require('cluster');
var CPUcount = os.cpus().length;
prof.io('OS loaded, CPUcount='+CPUcount);
var express = require('express');
prof.io('EXPRESS required');
var session = require('express-session');
prof.io('EXPRESS-SESSION required');

var log = require('./libs/devLog');
//log.setWorker(cluster.worker.id);
var RedisStore = require('connect-redis')(session);
prof.io('RedisStore required');
var SessionStore = new RedisStore({
    host: '127.0.0.1',
    port: 6379
});
prof.io('SessionStore created');
var bodyParser = require('body-parser');
prof.io('bodyParser required');
var cookieParser = require('cookie-parser');
var socket = require('socket.io');
prof.io('socket.io required');
var app = express();
prof.io('app declaration');
var http = require('http').Server(app);
prof.io('http created');
var io = socket(http);
var sioredis = require('socket.io-redis');
io.adapter(sioredis({ host: '127.0.0.1', port: 6379 }));
prof.io('io created');
var DEV_ENV=false;
if(process.env.NODE_ENV=='DEV' || process.env.NODE_ENV=='BBPI'){
    var hostname = os.hostname();
    DEV_ENV=true;
} else if(process.env.NODE_ENV=='DEV_UJWEBLAP'){
    var hostname = 'bbpi.ujweblap.com';
} else if(process.env.NODE_ENV=='LOCAL'){
    var hostname = '192.168.0.29';
    DEV_ENV=true;
} else if(process.env.NODE_ENV=='KUBA'){
    var hostname = '192.168.0.30';
    DEV_ENV=true;
} else {
    var hostname = 'bb-pi.dns4e.net';
}
var port = 8080;
var public_dir = '/public';

require('colors');
var crud = require('./libs/crudMongo');
var users = require('./libs/users');
prof.io('crud&&users required');
app.use(express.static(__dirname+public_dir));

app.use(bodyParser.json());
app.use(cookieParser(conf.getSecret()));
prof.io('app bodyparser');
app.use(session({
    store: SessionStore,
    secret: conf.getSecret(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
prof.io('app use session');

var gameDev = require('./game');
	gameDev.init();
var game = gameDev.getGame();
var gameId = game.gameId;

app.get('/', function(req, res){
    if(DEV_ENV) {
        res.sendFile(fdir.get('game.html'));
        return res;
    }
    res.set('Content-Type', 'text/html');
    res.send(fcache.fromCache(fdir.get('game.html')));
});

app.get('/gamemap', function(req, res){
    game = gameDev.getGame();
    res.set('Content-Type', 'application/json');
    res.json(game.map);
});

app.get('/api', function(req, res){
	res.json((gameDev.getGame())["map"]);
});

app.get('/404', function(req, res){
    res.statusCode = 404;
    res.send('404 ... ;( try: <a href="http://bb-pi.dns4e.net:8080/">bbpi</a>');
});

app.post('/counter/:cont',function(req,res){
    console.log(req.params.cont);
    counter = req.param.cont;
    counter ++;
    res.send(counter);
});

app.get('/hello/:name', function(req, res){
    //console.dir(req);
    console.log("hello bbpi. name: "+req.params.name);
    res.send('hello '+req.params.name);
});

/* socketIO events */

io.on('connection', function(socket){
    console.log(' user connected');
	socket.emit('connectedGame', gameDev.getGame());
    socket.on('init', function(dt){
        console.log(dt)
        if(dt.sid){
            //console.log(SessionStore);
            /*
            SessionStore.getStore().get(dt.sid, function(sess){
                console.log(sess.user);
                console.log('SOCKET user SESSION!');
                socket.emit('bbpi:init', {user:'bbpi',s:sess.user});
            });
            */
        }
    });
	socket.on('newSnake', function(dt){
        console.log('#socket: new snake');
		var snake = gameDev.newSnake(gameId, {name:"Bence"})
		socket.snakeId = snake.snakeId;
        socket.emit('nSnake',snake);
    });
	/*
    socket.on('newGame', function(){
        var snake = gameDev.newSnake();
        //socket.set('snake',snake);
        socket.emit('nSnake', snake);
    });
	*/
    socket.on('gameStart', function(){
        socket.emit('gameStart', game.getSnakes());
    });
    
    socket.on('setSnake', function(dt){
		console.log("curren snake: ",socket.snakeId);
        console.log('set snake dir', dt);
        gameDev.setSnake(dt);
    });
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});

http.listen(port, function(){
    prof.io('Server Listen ON '+(port+'').green);
    log.io('Open: '+('http://'+hostname+':'+port+'/').cyan);
});
prof.io('Server starting... '.inverse);
log.io('Host name: '+hostname.yellow);
