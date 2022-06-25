var express = require('express')
var app = express()

const port = process.env.PORT || 8080

var http = require('http').createServer(app);
var io = require('socket.io')(http);
http.listen(port)

app.use(express.static('public'))
    .get('/', function (req, res) {
        res.sendFile(__dirname + '/kharto.html');
    })
    .get('/kharto', function (req, res) {
        res.sendFile(__dirname + '/kharto.html');
    });


var players = {};


io.sockets.on("connection", function (socket) {
    socket.shortid = socket.id.slice(socket.id.length - 4, socket.id.length);
    console.log("Socket connected " + socket.id);
    let url = new URL(socket.handshake.headers.referer);
    let op = url.searchParams.get('op')
    socket.emit('connect');
    if (op && joinGame(socket, op)) {
        // Send Game begin to both
        socket.emit("game.begin", {
            playing: true,
        });
        getOpponent(socket).emit("game.begin", {
            playing: false,
        });

    } else createGame(socket);

    /*if (getOpponent(socket)) { // If has opponent
        // Send Game begin to both
        socket.emit("game.begin", {
            playing: true,
        });
        getOpponent(socket).emit("game.begin", {
            playing: false,
        });
    }*/

    socket.on("make.move", function (data) { // When someone make a move
        if (!getOpponent(socket)) return; // Check he still have an opponent
        // Send/Validate the move to both
        socket.emit("move.made", data);
        getOpponent(socket).emit("move.made", data);
    });

    socket.on("disconnect", function () { // When someone disconnect

        if (getOpponent(socket)) { // Check he still have an opponent

            // Tell to the opponent that his opponent has left. (Wow brain injury)
            getOpponent(socket).emit("opponent.left");
        }

        delete players[socket.shortid];


    });
});

function createGame(socket) {
    players[socket.shortid] = {
        opponent: null,
        socket: socket
    };

}

function joinGame(socket, opponent) {
    if (!players[opponent]) return false; // If there's no opponent
    if (players[opponent].opponent) return false; // If the opponent has already an opponent

    players[socket.shortid] = {
        opponent: players[opponent].socket.shortid,
        socket: socket
    };

    players[opponent].opponent = socket.shortid;
    return true;
}

function getOpponent(socket) {
    if (!players[socket.shortid]) return;
    else if (!players[socket.shortid].opponent) return;
    else if (!players[players[socket.shortid].opponent]) return;
    else return players[players[socket.shortid].opponent].socket;
}
