(function(){
    var hostname = window.location.hostname;
    var app=angular.module('gameApp', [])
		.factory('socket', function ($rootScope) {
            var socket = io.connect();
            return {
                on: function (eventName, callback) {
                    socket.on(eventName, function () {
                        var args = arguments;
                        $rootScope.$apply(function () {
                            callback.apply(socket, args);
                        });
                    });
                },
                emit: function (eventName, data, callback) {
                    socket.emit(eventName, data, function () {
                        var args = arguments;
                        $rootScope.$apply(function () {
                            if (callback) {
                                callback.apply(socket, args);
                            }
                        });
                    })
                }
            };
        });
    app.controller('gameCtrl', ['$scope', '$http', 'socket', function($scope, $http, socket){
        $scope.Site = {};
        $scope.map = [];
        $scope.dir = {
            x: 0,
            y: 0
        };
		
		var gamepadSupportAvailable = !!navigator.webkitGetGamepads || !!navigator.webkitGamepads;
		console.log(gamepadSupportAvailable);
		
		$scope.players = {};
	
		
		var snakeInit = false;
		$http(
			{
				method:'get',
				url:'http://'+hostname+':8080/gamemap/'
			}
		).then(function(dt){
				//console.log(dt);
				$scope.map = dt.data;
				//console.log(dt.data);

				//console.log(dt);
							socket.emit('newSnake',{});
				socket.on('nSnake', function(snid){
					console.log(snid);
					for(var i = 0; i < snid.map.length; i++){
						$scope.map[snid.map[i].y][snid.map[i].x].c = snid.map[i].c;
					}
					snakeId = snid.snakeId;
					$scope.Site.snakeId = snid.snakeId;
					$scope.Site.snake = snid;
					snakeInit=true;
					socket.on('map',function(dt){

						//dt[0].map[].x

						console.log(dt);
						for(var i = 0; i < dt.map.length; i++){

							$scope.map[dt.map[i].y][dt.map[i].x].c = dt.map[i].c;
						}
						$scope.players = dt.players;
						//TODO

					});
				});
		}, function(err){
			//error
		});
        $scope.pixClass = function(p){
            //console.log(p);
            var c = ("s"+p["c"]);
            if(p.hasOwnProperty("s")&& p.s!=""){
                c="usnake s7 s"+p["s"];
            }
            return c;
        };
	var winWidth=jQuery(window).width();
	var winHeight=jQuery(window).height();
	jQuery('body').on('touchstart', '#touch', function(e){
		
	});
        jQuery('body').on('keydown', function(e){
			if(snakeInit){
            $scope.$apply(function(){

                    $scope.key_pressed = e.keyCode;
                    switch (e.keyCode) {
                        case 39:
                            $scope.dir.x = 0;
                            $scope.dir.y = 1;
                            break;
                        case 37:
                            $scope.dir.x = 0;
                            $scope.dir.y = -1;
                            break;
                        case 38:
                            $scope.dir.x = -1;
                            $scope.dir.y = 0;
                            break;
                        case 40:
                            $scope.dir.x = 1;
                            $scope.dir.y = 0;
                            break;
                    }
                    socket.emit('setSnake', {dir: $scope.dir, snid: $scope.Site.snakeId});

            });
			}
        });
        /*
        $scope.moveSnake = function (event) {
            $scope.key_pressed = event.keyCode;
            if (event.keyCode === 8) {
                console.log('here!');
            }
        };*/

        //$scope.level.map.push({"class": "welcome"});
        /*
        for(var i=0;i<40;i++){
            for(var j=0;j<24;j++){
		$scope.level.fill = "base_box";
		if((i+j)%2==0){
			$scope.level.fill = "empty_box";
		}
                $scope.level.map.push({"class": ""+i+"_"+j+"_box "+$scope.level.fill});
            }
        }*/
    /*
		//console.log("hello");
        $scope.newGame = function(){
            //socket.emit('newGame');
            $http({method:'get',url:'http://192.168.0.30:8080/gamemap/'}).then(function(dt){
                //$scope.level = {};
                $scope.table = dt.data;
				//console.log(dt);
            }, function(err){
                //error
            });
            $scope.Site.game = 'loading';
        };
        $scope.newSnake = function(){
            socket.emit('newSnake');
        };
		
		*/
    }]);
	
    app.controller('menuCtrl',['$scope', '$http', 'socket', function($scope, $http, socket){
        $scope.newGame = function(){
            //socket.emit('newGame');
            $http({method:'get',url:'http://192.168.0.30:8080/gamemap/'}).then(function(dt){
                //$scope.level = {};
                $scope.level.map = dt.data;
            }, function(err){
                //error
            });
            $scope.Site.game = 'loading';
        };
        $scope.newSnake = function(){
            socket.emit('newSnake',{});
        };
    }]);
})();
