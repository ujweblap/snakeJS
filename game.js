module.exports=(function(){
	var uuid = require('node-uuid');
	//var redis = require('socket.io-redis');
	var io = require('socket.io-emitter')({ host: 'localhost', port: 6379 });
	var games = {};
	var gamesIds = [];
	var g=0;
	var cols = 22;
	var rows = 10;
	var sn;
	var startPoses = [
		[],
		[]
	];
	var gamerColors = [
		'u0',
		'u1',
		'u2',
		'u3',
		'u4',
		'u5',
		'u6',
		'u7',
		'u8'
	];
	var getRandom = function(n){
		return parseInt(Math.random()*n)+1;
	};
	var getRandomMap = function(){
		return 6+getRandom(4);
	};

	function GameBlock(){
		var gm = this;
		gm.cols = 22; // X , 2. szint, width
		gm.rows = 10; // Y , 1. szint, height
		gm.intervalSpeed = 100;
		gm.gameId = uuid.v1();
		gm.map = [];
		gm.mapChanges = [];
		gm.snakes = {};
		gm.snakesIds = [];

		gm.initMap = function(){
			for(var i=0;i<gm.rows;i++){
				gm.map[i]=[];
				for(var j=0;j<gm.cols;j++){
					gm.map[i][j]=new MapPoint(j, i, 'b0');
					//map[i][j]['c']=getRandomMap();
					//gm.map[i][j]['c']='b0';
					//gm.map[i][j]['dir']='0';
				}
			}

		};
		gm.initSnakes = function(){

		};
		gm.addSnake = function(user){
			var s = new Snake(new MapPoint(8,4,1,4),{x:1,y:0},4);
			gm.snakesIds.push(s.snakeId);
			gm.snakes[s.snakeId]=s;
			return s;
		};
		gm.addFood = function(){
			var rX = getRandom(gm.cols)-1;
			var rY = getRandom(gm.rows)-1;
			if(/^(s|h|t|u)/.test(gm.map[rY][rX]['c']) == false){
				gm.map[rY][rX]['c'] = "f0";
				return new MapPoint(rX,rY,"f0","");
			}
			return gm.map[rY][rX];
		};

		
		gm.getPlayers = function(){
			var scores = {};
			var sni;
			for(sni in gm.snakesIds){
				scores[gamerColors[sni]] = gm.snakes[gm.snakesIds[sni]]["score"];
			}
			return scores;
		};
		gm.getDirectionClass = function(dir){
			if(dir==undefined){
				return 0;
			}
			if(dir.x==-1){
				return 0;
			} else if(dir.x==1) {
				return 2;
			} else if(dir.y==-1) {
				return 1;
			} else if(dir.y==1) {
				return 3;
			} else {
				return 0;
			}
		};
		gm.getRotationClass = function(newdir, olddir){
			return ""+newdir.x+newdir.y+""+olddir.x+olddir.y;
		};
		gm.getMapChanges = function(){
			var dt = {};
			dt.map = gm.mapChanges;
			dt.players = gm.getPlayers();
			return dt;
		};

		gm.getSnakes = function(){
			return gm.snakes;
		};
		gm.checkHeadFood = function(head){
			if(/^f/.test(gm.map[head["y"]][head["x"]]["c"])){
				gm.snakes[head.snid]["score"]++;
			}
			/* a kovetkezo lepest ellenorzi
			var frontOfHead = gm.getNextPoint(head);
			if(/^f/.test(gm.map[frontOfHead["y"]][frontOfHead["x"]]["c"])){
				gm.snakes[head.snid]["score"]++;
			}
			*/

		};

		gm.getNextPoint = function(point){
			var pX = point.x;
			var pY = point.y;
			pX += point["dir"]["y"];
			pY += point["dir"]["x"];
			if(pX>=gm.cols){
				pX=0;
			} else if(pX<0){
				pX=gm.cols-1;
			}
			if(pY>=gm.rows){
				pY=0;
			} else if(pY<0){
				pY=gm.rows-1;
			}
			return gm.map[pY][pX];
			return {
				x:pX,
				y:pY
			}
		};

		gm.moveSnakes = function(cb){
			var stateMap = [];
			var sn, sni, head, newHead, newNeck;
			gm.mapChanges = [];

			for(sni in gm.snakesIds){
				sn=gm.snakesIds[sni];
				/*
                if(map[snakes[sn]["map"][0]["x"]][snakes[sn]["map"][0]["y"]]["s"]){
                    console.log("ÜTKÖZÉS!");
                }*/

				head = gm.snakes[sn]["map"].shift();
				newNeck = new MapPoint(head.x,head.y,"s"+gm.getDirectionClass(head.dir),"");
				if(head.dir.x != gm.snakes[sn]['dir']['x'] || head.dir.y != gm.snakes[sn]['dir']['y']){
					newNeck.c = 'r'+gm.getRotationClass(gm.snakes[sn]['dir'], head.dir);
				} else {
					newNeck.c = 's'+gm.getDirectionClass(head.dir);
				}
				newNeck.dir = head.dir;

				gm.snakes[sn]["map"].unshift(newNeck);
				gm.mapChanges.push({x:head.x,y:head.y,c:gamerColors[sni]+" "+newNeck.c});
				gm.map[head.y][head.x]["c"] = gamerColors[sni]+" "+newNeck.c;

				//snakes[sn]["map"].pop();
				var lastTail = gm.snakes[sn]["map"].pop();
				gm.mapChanges.push(
					{
						x:lastTail.x,
						y:lastTail.y,
						c:gamerColors[sni]+" "+"b0"
					}
				);
				gm.map[lastTail.y][lastTail.x]["c"] = 'b0';


				var snakeTail = gm.snakes[sn]["map"].pop();
				if(snakeTail["c"][0]=="r"){
					snakeTail["c"] = "t1";
					snakeTail["c"] = "t"+gm.getDirectionClass(gm.snakes[sn]["map"][(gm.snakes[sn]["map"]["length"]-1)].dir);
				} else {
					snakeTail["c"] = "t"+gm.getDirectionClass(snakeTail.dir);
				}
				gm.mapChanges.push(
					{
						x:snakeTail.x,
						y:snakeTail.y,
						c:gamerColors[sni]+" "+snakeTail.c
					}
				);
				gm.map[snakeTail.y][snakeTail.x]["c"] = gamerColors[sni]+" "+snakeTail.c;
				gm.snakes[sn]["map"].push(snakeTail);


				//snakes[sn]["map"].push(new MapPoint(lastTail.x,lastTail.y,"s8",""));
				head["dir"] = gm.snakes[sn]["dir"];
				//head["x"] += gm.snakes[sn]["dir"]["y"];
				//head["y"] += gm.snakes[sn]["dir"]["x"];

				//head["s"] = "h"+snakes[sn]["dir"]["x"]+""+snakes[sn]["dir"]["y"];
				var headNext = gm.getNextPoint(head);
				head["c"] = 'h'+gm.getDirectionClass(head.dir);
				head["x"] = headNext["x"];
				head["y"] = headNext["y"];
				head["snid"] = gm.snakes[sn]["snakeId"];

				newHead = new MapPoint(head["x"],head["y"],head["c"],head["s"]);
				newHead.dir = gm.snakes[sn]["dir"];
				newHead.snid = gm.snakes[sn]["snakeId"];
				gm.snakes[sn]["map"].unshift(newHead);
				gm.mapChanges.push(
					{
						x:head.x,
						y:head.y,
						c:gamerColors[sni]+" "+head.c
					}
				);
				gm.checkHeadFood(newHead);
				gm.map[head.y][head.x]["c"] = gamerColors[sni]+" "+head.c;
			}
			var foodPix = gm.addFood();
			gm.mapChanges.push(foodPix);
			cb(gm.getMapChanges());
		};

		gm.startMove = function(){
			setTimeout(function(){
				gm.moveSnakes(function(mapCh){
					//socketIo.emit('snakes',getSnakes());
					io.emit('map',mapCh);
					//console.log(getMapChanges());
					//console.log(game.snakesIds);
					gm.mapChanges = [];
					gm.startMove();
				});
			}, gm.intervalSpeed);
		};

		

		gm.setSnakeDir = function(sdt){
			//console.log("setSnake",sdt);
			//console.log(gm.snakesIds);
			//console.log(gm.snakes[sdt['snid']]);
			if((typeof gm.snakes[sdt['snid']])!=="undefined"){
				gm.snakes[sdt['snid']].setDir(sdt['dir']);
				//console.log("SNAKES: ",gm.snakes[sdt['snid']]);
				/*
				if(gm.snakes[sdt['snid']].getDir().x+parseInt(sdt["dir"]["x"])!=0  || gm.snakes[sdt['snid']].getDir().y+parseInt(sdt["dir"]["y"])!=0){
					
				}*/
			}
		};
		
		gm.init = function(){
			gm.initMap();
		};
		gm.init();

		return gm;
	};

	var newGame = function(){
		console.log('##1 newGame');
		var game = new GameBlock();
		gamesIds.push(game.gameId);
		games[game.gameId]=game;
		return game;
	};

	var Snake = function(start, direction, leng){
		this.snakeId = uuid.v1();
		this.map = [];
		this.dir = direction;
		this.leng = leng;
		this.score = 0;
		for(var l=0;l<leng;l++){
			this.map.unshift(new MapPoint(start.x+(l*direction.x),start.y+(l*direction.y),start.c));
		}
		this.setDir = function(d){
			this.dir = d;
		};
		this.getDir = function(){
			return this.dir;
		};
		return this;
	};
	var MapPoint = function(x,y,c,s){
		this.x=x;
		this.y=y;
		this.c=c;
		this.dir={x:0,y:1};
		if(s){
			this.s=s;
		} else {
			this.s = "";
		}
		return this;
	};
	var User = function(){
		this.snake = newSnake();
		return this;
	};

	var setSnakeDir = function(sdt){
		getGame().setSnakeDir(sdt);
	};
	
	var newSnake = function(gameId, user){
		console.log('##2 newSnake');
		return getGame(gameId).addSnake(user);
		//return game.newSnake();
	};

	var getLobby = function(){
		this.newGame = newGame;
		return this;
	};

	var lobby = getLobby();
	var single_game = lobby.newGame();
	single_game.startMove();

	var init = function(){
	};
	
	var getGame = function(gameId){
		console.log('### getGame');
		return single_game;
		if(!!gameId){
			return games[gameId];
		} else {
			return games[gamesIds.length-1];
		}
	};
	
	return {
		init: init,
		newSnake: newSnake,
		getGame: getGame,
		setSnake: setSnakeDir
	};
})();
