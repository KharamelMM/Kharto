const MAP_SIDE_LENGTH = 4;
const BUTTON_ID = {
    // [y][x]
    "a0": [0, 0],
    "a1": [0, 1],
    "a2": [0, 2],
    "a3": [0, 3],
    "b0": [1, 0],
    "b1": [1, 1],
    "b2": [1, 2],
    "b3": [1, 3],
    "c0": [2, 0],
    "c1": [2, 1],
    "c2": [2, 2],
    "c3": [2, 3],
    "d0": [3, 0],
    "d1": [3, 1],
    "d2": [3, 2],
    "d3": [3, 3],
}

const MAP_BUTTON = [
    ["a0", "a1", "a2", "a3"],
    ["b0", "b1", "b2", "b3"],
    ["c0", "c1", "c2", "c3"],
    ["d0", "d1", "d2", "d3"]
]


var socket = io();

var available_tokens = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // Available tokens, check bits to get similarity
var chosen_token = -1;
// Map[y][x]. -1 is no token placed on the cell, otherwise the number correspond to the token.
var map = [
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1]
];

const MAX_TURN = 4;
/* Start at pos 1 or 3
0: I place Token on the board
1: I choose Token for Opponent
2: Opponent place Token on the board
3: Opponent choose Token for I
 */
var turn = 1;

function isMyTurn() {
    return (turn & 2) !== 2 // Check the second bit
}

function isChoosingTurn() {
    return (turn & 1) === 1 // Check the first bit

}

function nextTurn() {
    turn = (turn + 1) % MAX_TURN;
}

$(function () {
    setupGame();

    // Event is called when either player makes a move
    socket.on("move.made", function (data) {
        // Render the move
        if (isChoosingTurn()) {
            chosen_token = data.token;
            available_tokens[chosen_token] = -1;

            $(".available-tokens button[value=\"" + chosen_token + "\"]").remove(); // Remove the token as available token
        } else { // Place chosen_token on the map
            let id = MAP_BUTTON[data.position[0]][data.position[1]];
            $("#" + id).attr("value", chosen_token); // Place the token on the board
            map[data.position[0]][data.position[1]] = chosen_token;
            chosen_token = -1;
        }
        $("#chosen-token").attr("value", chosen_token); // Place the token as chosen token (-1 or token value)
        nextTurn();

        // If the game is still going, show who's turn it is
        if (!isGameOver()) {
            if (gameTied()) {
                $("#messages").text("Tie..");
                $(".board button").attr("disabled", true);
            } else {
                renderTable();
            }
            // If the game is over
        } else {
            // Show the result message
            if (isMyTurn()) {
                $("#messages").text("You won !");
            } else {
                $("#messages").text("Game over, you lost..");
            }

            // Disable the board
            $(".board button").attr("disabled", true);
        }
    });

    // Set up the initial state when the game begins
    socket.on("game.begin", function (data) {
        setupGame();
        if (!data.playing) turn += 2; // Opponent plays first !
        renderTable();
    });

    // Disable the board if the opponent leaves
    socket.on("opponent.left", function () {
        $("#messages").text("Opponent has left the game.");
        $(".board button").attr("disabled", true);
    });
});

function setupGame() {
    // Setup table
    available_tokens = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    chosen_token = -1;
    map = [
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, -1]
    ];
    turn = 1;


    $(".available-tokens > .col0").empty();
    $(".available-tokens > .col1").empty();
    for (let i = 0; i < available_tokens.length; i++) {
        $(".available-tokens > .col" + (i % 2)).append("<button value='" + i + "' disabled='true'></button>");
    }


    // Setup buttons
    $(".placed-tokens button").attr("disabled", true)
        .attr("value", -1);
    $(".board button").off("click")
        .on("click", makeMove)
        .empty()
        .append("<div class='kharto-icon'></div>");

}

function gameTied() {
    return available_tokens.length <= 0;
}

// t1, t2, t3, t4 should be integer < 16
function compareTokens(t1, t2, t3, t4) {
    if (t1 < 0 || t2 < 0 || t3 < 0 || t4 < 0) return false; // Check every token is defined
    // Binary Comparaison

    else if ((t1 & t2 & t3 & t4) !== 0) return true; // Check if every token have 1 on the same position
    else if ((t1 | t2 | t3 | t4) !== 15) return true;// Check if every token have 0 on the same position
    return false; // Otherwise
}

function isGameOver() {
    // Check Lines
    for (let i = 0; i < MAP_SIDE_LENGTH; i++) {
        if (compareTokens(map[i][0], map[i][1], map[i][2], map[i][3]))
            return true;
        if (compareTokens(map[0][i], map[1][i], map[2][i], map[3][i]))
            return true;
    }

    // Check Diagonals
    if (compareTokens(map[0][0], map[1][1], map[2][2], map[3][3]))
        return true;
    if (compareTokens(map[0][3], map[1][2], map[2][1], map[3][0]))
        return true;

    return false;
}

function renderTable() {
    // Disable the board by default
    $(".board button").attr("disabled", true);

    if (isMyTurn()) {
        if (isChoosingTurn()) { // Enable available buttons.
            $("#messages").text("Your turn !");
            $("#tip").text("Choose a token for your opponent..");
            $(".available-tokens button").removeAttr("disabled");
        } else {
            $("#messages").text("Your turn !");
            $("#tip").text("Place on the board, the token that your opponent has chosen..");
            $(".placed-tokens button").removeAttr("disabled");
            $("#chosen-token").removeAttr("disabled");
        }
    } else {
        $("#messages").text("Opponent's turn...");
        $("#tip").text("");
    }
}


function makeMove(e) {

    e.preventDefault();

    if (!isMyTurn()) return; // It's not your turn


    if (isChoosingTurn()) {
        if ($(this).attr("value") < 0) return; // No value on the button ?

        // Emit the move to the server
        socket.emit("make.move", {
            token: $(this).attr("value")
        });
    } else {
        if ($(this).attr("value") >= 0) return; // There already a token on this cell

        // Emit the move to the server
        socket.emit("make.move", {
            token: chosen_token,
            position: BUTTON_ID[$(this).attr("id")]
        });
    }
}
