var express = require('express');
var app = express();
var server = require('http').Server(app);
var _ = require ('lodash');
// var redis = require('redis').createClient();

//************
// Redis hooks
//************

// redis.on('error', function(err) {
//     console.log('Redis error: ' + err);
// });

// redis.on('connect', function() {
//     console.log('Connected to Redis.');
// });

//*******************
// Data and Functions
//*******************

var rooms = {};

var DEBUG = true;


function makeid(size) {
    var text = '';
    var possible = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for(var i=0; i<size; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}

function genRoom() {
    while(true) {
        var room = makeid(1);
        if(!rooms[room]) return room;
    }
}

function broadcast(room, exclude, type, data) {
    for(p in rooms[room].players) {
        if(p == exclude) continue;
        var sock = rooms[room].players[p].socket;
        sock.emit(type, data);
    }
}

// debug
function debug() {
    if(DEBUG)
        console.log.apply(this, arguments);
}

//**********
// Express
//**********

var bodyParser = require('body-parser');
var serveStatic = require('serve-static');
var favicon = require('serve-favicon');

// app.use(favicon('./public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(serveStatic('./public'));

//**********
// SOCKET.io
//**********

var io = app.io = require('socket.io')(server);

// fires on client connection
io.on('connection', function(socket) {

    var myRoom;
    var myName;

    debug('A player connected.');

    socket.on('disconnect', function() {
        // room cleanup
        if(myRoom && rooms[myRoom]) {
            delete rooms[myRoom].players[myName];
            if(_.size(rooms[myRoom].players) == 0) {
                delete rooms[myRoom];
                debug('Room destroyed: %s', myRoom);
            } else {
                broadcast(myRoom, myName, 'player_left', myName);
            }
        }

        debug('%s disconnected.', myName);
    });

    socket.on('create_room', function(playerName) {
        // set up the new room
        var roomName = genRoom();
        rooms[roomName] = {
            state: 'LOBBY',
            players: {}
        };

        // add player to room
        rooms[roomName].players[playerName] = {
            socket: socket
        };

        // set this socket's current room
        myRoom = roomName;
        myName = playerName;

        // notify client with the room name
        socket.emit('room_created', roomName);

        debug('%s created room %s', playerName, roomName);
    });

    socket.on('join_room', function(roomName, playerName) {
        if(!rooms[roomName]) {
            socket.emit('invalid_room');
            return;
        }

        if(rooms[roomName].players[playerName]) {
            socket.emit('name_taken');
            return;
        }

        if(rooms[roomName].state != 'LOBBY') {
            socket.emit('not_in_lobby');
            return;
        }

        // add player to room
        rooms[roomName].players[playerName] = {
            socket: socket
        };

        // set this socket's current room
        myRoom = roomName;
        myName = playerName;

        // notify client with the room name and current player list
        socket.emit('room_joined', {
            players: _.keys(rooms[roomName].players),
            roomName: roomName
        });

        // broadcast player_joined to everyone else
        broadcast(roomName, playerName, 'player_joined', playerName);

        debug('%s joined room %s', playerName, roomName);
    });

    socket.on('start_game', function() {
        rooms[myRoom].state = 'GAME';
        broadcast(myRoom, '', 'game_started', {
            playerOrder: _.shuffle(_.keys(rooms[myRoom].players))
        });
        debug('%s started game %s', myName, myRoom);
    });
});

server.listen(4000, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('high-noon listening at %s:%s', host, port);
});