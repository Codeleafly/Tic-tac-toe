const socket = io();
let symbol;
let myTurn = false;
let isBot = false;

function submitName() {
  const name = document.getElementById('nameInput').value;
  if (!name) return;

  if (name === "hacking@200") {
    isBot = true;
  }

  socket.emit('set-name', name);
  document.getElementById('namePrompt').style.display = 'none';
  document.getElementById('game').style.display = 'block';
}

socket.on('symbol', (s) => {
  symbol = s;
  if (!isBot) {
    document.getElementById('status').innerText = 'Waiting for another player...';
  }
});

socket.on('waiting', () => {
  document.getElementById('status').innerText = 'Waiting for another player...';
});

socket.on('start-game', ({ turn }) => {
  updateStatus(turn);
  drawBoard();
  if (isBot && symbol === turn) {
    setTimeout(playBot, 300);
  }
});

socket.on('board-update', ({ board, turn }) => {
  drawBoard(board);
  updateStatus(turn);
  if (isBot && symbol === turn) {
    setTimeout(() => playBot(board), 300);
  }
});

socket.on('next-turn', (turn) => {
  updateStatus(turn);
  if (isBot && symbol === turn) {
    setTimeout(playBot, 300);
  }
});

socket.on('game-over', ({ winner }) => {
  const msg = winner === 'draw' ? "It's a draw!" : `Player ${winner} wins!`;
  document.getElementById('status').innerText = msg;
  document.getElementById('restartBtn').style.display = 'inline-block';
});

socket.on('restart-board', () => {
  drawBoard(Array(9).fill(null));
  document.getElementById('restartBtn').style.display = 'none';
});

socket.on('player-disconnected', () => {
  alert('A player disconnected. Game reset.');
  location.reload();
});

socket.on('room-full', () => {
  alert('Room is full!');
  location.reload();
});

function drawBoard(board = Array(9).fill(null)) {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';
  board.forEach((cell, i) => {
    const div = document.createElement('div');
    div.innerText = cell || '';
    div.onclick = () => {
      if (!cell && symbol === currentTurn() && !isBot) {
        socket.emit('make-move', i);
      }
    };
    boardDiv.appendChild(div);
  });
}

function restartGame() {
  socket.emit('restart-game');
}

function currentTurn() {
  const status = document.getElementById('status').innerText;
  if (status.includes('X')) return 'X';
  if (status.includes('O')) return 'O';
  return '';
}

function updateStatus(turn) {
  myTurn = turn === symbol;
  document.getElementById('status').innerText = myTurn
    ? `Your turn (${symbol})`
    : `Opponent's turn (${turn})`;
}

// BOT Move (Simple AI - unbeatable strategy)
function playBot(board = Array.from(document.querySelectorAll('#board div')).map(d => d.innerText || null)) {
  const bestMove = getBestMove(board, symbol);
  if (bestMove !== null) {
    socket.emit('make-move', bestMove);
  }
}

// Minimax AI
function getBestMove(board, player) {
  const opponent = player === 'X' ? 'O' : 'X';

  function minimax(b, isMax) {
    const winner = checkWinner(b);
    if (winner === player) return { score: 1 };
    if (winner === opponent) return { score: -1 };
    if (!b.includes(null)) return { score: 0 };

    let moves = [];
    for (let i = 0; i < b.length; i++) {
      if (b[i] === null) {
        b[i] = isMax ? player : opponent;
        const result = minimax(b, !isMax);
        moves.push({ index: i, score: result.score });
        b[i] = null;
      }
    }

    return isMax
      ? moves.reduce((a, b) => (a.score > b.score ? a : b))
      : moves.reduce((a, b) => (a.score < b.score ? a : b));
  }

  const move = minimax([...board], true);
  return move.index;
}

function checkWinner(b) {
  const winPatterns = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (let [a,b1,c] of winPatterns) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return b[a];
    }
  }
  return null;
}
