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


var players = {},
    unmatched;


io.sockets.on("connection", function (socket) {
    console.log("Socket connected " + socket.id);
    socket.emit('connect', {msg: "hello"});
    joinGame(socket);

    if (getOpponent(socket)) { // If has opponent
        // Send Game begin to both
        socket.emit("game.begin", {
            playing: true,
        });
        getOpponent(socket).emit("game.begin", {
            playing: false,
        });
    }

    socket.on("make.move", function (data) { // When someone make a move
        if (!getOpponent(socket)) return; // Check he still have an opponent
        // Send/Validate the move to both
        socket.emit("move.made", data);
        getOpponent(socket).emit("move.made", data);
    });

    socket.on("disconnect", function () { // When someone disconnect

        if (!getOpponent(socket)) return; // Check he still have an opponent

        // Tell to the opponent that his opponent has left. (Wow brain injury)
        getOpponent(socket).emit("opponent.left");

    });
});

function joinGame(socket) {
    players[socket.id] = {
        opponent: unmatched,
        socket: socket // The socket that is associated with this player
    };
    if (unmatched) { // If someone is waiting for an opponent
        players[unmatched].opponent = socket.id;
        unmatched = null;
    } else { // If no one is waiting for an opponent, we're gonna wait for an opponent.
        unmatched = socket.id;
    }
}

function getOpponent(socket) {
    if (!players[socket.id].opponent) {
        return;
    }
    return players[players[socket.id].opponent].socket;
}
