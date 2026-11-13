import { useEffect, useState } from "react";
import ".//Minesweeper.css";

type Cell  = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type GameStatus = "playing" | "won" | "lost";

function createEmptyBoard(): Cell[] {
  return Array.from({ length: ROWS * COLS }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
}

function generateBoard(firstClick: number, oldBoard: Cell[]): Cell[] {
  const board = createEmptyBoard();

  // Keep flags placed before the first reveal
  board.forEach((cell, i) => {
    cell.flagged = oldBoard[i].flagged;
  });

  // Randomly place mines, excluding the first clicked square
  const available = board
    .map((_, i) => i)
    .filter((i) => i !== firstClick && !board[i].flagged);

  for (let i = 0; i < MINES; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const mineIndex = available.splice(randomIndex, 1)[0];
    board[mineIndex].mine = true;
  }

  // Calculate nearby mines
  board.forEach((cell, index) => {
    if (cell.mine) return;

    const neighbors = getNeighbors(index);

    cell.adjacent = neighbors.filter((i) => board[i].mine).length;
  });

  return board;
}

function getNeighbors(index: number): number[] {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const neighbors: number[] = [];

  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      if (r === 0 && c === 0) continue;

      const newRow = row + r;
      const newCol = col + c;

      if (
        newRow >= 0 &&
        newRow < ROWS &&
        newCol >= 0 &&
        newCol < COLS
      ) {
        neighbors.push(newRow * COLS + newCol);
      }
    }
  }

  return neighbors;
}

function revealCells(board: Cell[], start: number): Cell[] {
  const updated = board.map((cell) => ({ ...cell }));
  const queue = [start];

  while (queue.length > 0) {
    const index = queue.pop()!;
    const cell = updated[index];

    if (cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;

    // Reveal surrounding empty cells automatically
    if (cell.adjacent === 0) {
      getNeighbors(index).forEach((neighbor) => {
        if (
          !updated[neighbor].revealed &&
          !updated[neighbor].flagged &&
          !updated[neighbor].mine
        ) {
          queue.push(neighbor);
        }
      });
    }
  }

  return updated;
}

export default function App() {
  const [board, setBoard] = useState<Cell[]>(createEmptyBoard);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [flags, setFlags] = useState(0);
  const [timer, setTimer] = useState(0);

  // Game timer
  useEffect(() => {
    if (!started || status !== "playing") return;

    const interval = setInterval(() => {
      setTimer((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [started, status]);

  function checkWin(updatedBoard: Cell[]) {
    const revealedSafeCells = updatedBoard.filter(
      (cell) => cell.revealed && !cell.mine
    ).length;

    if (revealedSafeCells === ROWS * COLS - MINES) {
      setStatus("won");
    }
  }

  function handleReveal(index: number) {
    if (status !== "playing") return;

    const currentCell = board[index];

    if (currentCell.revealed || currentCell.flagged) return;

    let updatedBoard = board;

    // Generate mines on the first click
    if (!started) {
      updatedBoard = generateBoard(index, board);
      setStarted(true);
    }

    if (updatedBoard[index].mine) {
      const lostBoard = updatedBoard.map((cell) => ({
        ...cell,
        revealed: cell.revealed || cell.mine,
      }));

      setBoard(lostBoard);
      setStatus("lost");
      return;
    }

    updatedBoard = revealCells(updatedBoard, index);

    setBoard(updatedBoard);
    checkWin(updatedBoard);
  }

  function handleFlag(e: React.MouseEvent, index: number) {
    e.preventDefault();

    if (status !== "playing" || board[index].revealed) return;

    const updatedBoard = board.map((cell, i) =>
      i === index ? { ...cell, flagged: !cell.flagged } : cell
    );

    setBoard(updatedBoard);

    setFlags(updatedBoard.filter((cell) => cell.flagged).length);
  }

  function restartGame() {
    setBoard(createEmptyBoard());
    setStarted(false);
    setStatus("playing");
    setFlags(0);
    setTimer(0);
  }

  return (
    <main className="game-page">
      <div className="game-container">
        <h1>MINESWEEPER</h1>
        <p className="subtitle">Find the mines. Stay alive!</p>

        <div className="game-header">
          <div className="counter">
            <span>💣</span>
            <span>{MINES - flags}</span>
          </div>

          <button className="restart-button" onClick={restartGame}>
            {status === "lost" ? "😵" : status === "won" ? "😎" : "🙂"}
          </button>

          <div className="counter">
            <span>⏱️</span>
            <span>{timer.toString().padStart(3, "0")}</span>
          </div>
        </div>

        <div className="board">
          {board.map((cell, index) => (
            <button
              key={index}
              className={`cell ${cell.revealed ? "revealed" : ""} ${
                cell.revealed && cell.adjacent > 0 ? `number-${cell.adjacent}` : ""
              }`}
              onClick={() => handleReveal(index)}
              onContextMenu={(e) => handleFlag(e, index)}
              disabled={status !== "playing" || cell.revealed}
              aria-label={
                cell.revealed
                  ? cell.mine
                    ? "Mine"
                    : `${cell.adjacent} nearby mines`
                  : cell.flagged
                    ? "Flagged cell"
                    : "Hidden cell"
              }
            >
              {cell.flagged && !cell.revealed
                ? "🚩"
                : cell.revealed && cell.mine
                  ? "💣"
                  : cell.revealed && cell.adjacent > 0
                    ? cell.adjacent
                    : ""}
            </button>
          ))}
        </div>

        <div className="game-message">
          {status === "won" && "🎉 You won! All mines avoided!"}
          {status === "lost" && "💥 Boom! Better luck next time!"}
          {status === "playing" && "Right-click to place a flag 🚩"}
        </div>

        <button className="new-game-button" onClick={restartGame}>
          New Game
        </button>
      </div>
    </main>
  );
}
