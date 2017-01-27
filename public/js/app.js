var highNoon = angular.module('highNoonApp', []);

highNoon.controller('LobbyController', function($scope) {

    var socket = io();

    // scope variables

    $scope.state = 'CONNECT';

    $scope.roomName = '';
    $scope.myName = '';
    $scope.players = {};
    $scope.playerOrder = [];

    $scope.eventLog = [];

    var addPlayer = function(playerName) {
        $scope.players[playerName] = {};
    };

    var removePlayer = function(playerName) {
        delete $scope.players[playerName];
    };

    $scope.numPlayers = function() {
        return Object.keys($scope.players).length;
    }

    var validateName = function() {
        return $scope.myName != '';
    };

    var setWarning = function(type, text) {
        if(type == 'name') {
            $scope.nameError = true;
        } else if(type == 'room') {
            $scope.roomError = true;
        }
        $scope.connectWarning = text;
    };

    //*******//
    // Lobby //
    //*******//

    $scope.createRoom = function() {

        if(!validateName()) {
            setWarning('name', 'Please enter a valid name.');
            return;
        }

        // send create room request
        socket.emit('create_room', $scope.myName);

        // once room is created, set up room
        socket.on('room_created', function(roomName) {
            $scope.roomName = roomName;
            $scope.state = 'LOBBY';
            addPlayer($scope.myName);
            $scope.$digest();
        });
    };

    $scope.joinRoom = function() {

        if(!validateName()) {
            setWarning('name', 'Please enter a valid name.');
            return;
        }

        socket.emit('join_room', $scope.joinRoomName.toUpperCase(), $scope.myName);

        socket.on('invalid_room', function() {
            setWarning('room', 'Room does not exist.');
            $scope.$digest();
        });

        socket.on('name_taken', function() {
            setWarning('name', 'Someone in the room took your name already.');
            $scope.$digest();
        });

        socket.on('not_in_lobby', function() {
            setWarning('room', 'You cannot join this game because it has already begun.');
            $scope.$digest();
        });

        // once confirmation is created, set up room
        socket.on('room_joined', function(data) {
            $scope.roomName = data.roomName;
            $scope.state = 'LOBBY';
            for(p in data.players) {
                addPlayer(data.players[p]);
            }
            $scope.$digest();
        });
    };

    // respond to player join/leave events
    socket.on('player_joined', function(playerName) {
        addPlayer(playerName);
        $scope.$digest();
    });

    socket.on('player_left', function(playerName) {
        removePlayer(playerName);
        $scope.$digest();
    });

    $scope.startGame = function() {
        socket.emit('start_game');
    };

    socket.on('game_started', function(data) {
        for(k in $scope.players) {
            $scope.players[k].alive = true;
        }
        $scope.playerOrder = data.playerOrder;
        console.log($scope.playerOrder);
        $scope.state = 'GAME';
        $scope.$digest();
    });

    
});
