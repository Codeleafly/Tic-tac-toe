// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = 5555;
app.use(express.static('public'));

let players = {};
let turn = 'X';
let board = Array(9).fill(null);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('set-name', (name) => {
        if (Object.keys(players).length >= 2) {
            socket.emit('room-full');
            return;
        }

        const symbol = Object.keys(players).length === 0 ? 'X' : 'O';
        players[socket.id] = { name, symbol };
        socket.emit('symbol', symbol);
        io.emit('players-update', Object.values(players));

        if (Object.keys(players).length === 2) {
            io.emit('start-game', { turn });
        } else {
            socket.emit('waiting');
        }
    });

    socket.on('make-move', (index) => {
        if (!players[socket.id]) return;
        if (board[index] !== null) return;
        if (players[socket.id].symbol !== turn) return;

        board[index] = turn;
        io.emit('board-update', { board, turn });

        // Check win
        const winPatterns = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];

        let winner = null;
        for (let pattern of winPatterns) {
            const [a,b,c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                winner = turn;
                break;
            }
        }

        if (winner) {
            io.emit('game-over', { winner });
        } else if (board.every(cell => cell !== null)) {
            io.emit('game-over', { winner: 'draw' });
        } else {
            turn = turn === 'X' ? 'O' : 'X';
            io.emit('next-turn', turn);
        }
    });

    socket.on('restart-game', () => {
        board = Array(9).fill(null);
        turn = 'X';
        io.emit('restart-board');
        io.emit('next-turn', turn);
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        board = Array(9).fill(null);
        turn = 'X';
        io.emit('player-disconnected');
    });
});

http.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
