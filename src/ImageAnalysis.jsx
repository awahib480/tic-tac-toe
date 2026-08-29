import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

function ImageAnalysis({ image, onBack }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [status, setStatus] = useState("analyzing");
  const [board, setBoard] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [visibleMarks, setVisibleMarks] = useState(0);
  const [error, setError] = useState(null);

  // Prevent duplicate inference
  const analyzedImageRef = useRef(null);

  // Create image URL
  useEffect(() => {
    if (!image) return;

    const url = URL.createObjectURL(image);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  // Run inference once
  useEffect(() => {
    if (!image) return;

    if (analyzedImageRef.current === image) {
      return;
    }

    analyzedImageRef.current = image;

    const analyzeImage = async () => {
      try {
        setStatus("analyzing");
        setError(null);
        setBoard(null);
        setShowGrid(false);
        setVisibleMarks(0);

        const formData = new FormData();
        formData.append("image", image);

        console.log("Sending image to backend...");

        const response = await fetch(
          "http://localhost:5000/api/analyze",
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        console.log("Backend result:", result);

        if (!response.ok) {
          throw new Error(
            result.message || "Roboflow inference failed."
          );
        }

        // No board
        if (!result.boardDetected) {
          setBoard(null);
          setStatus("not-detected");
          return;
        }

        // Board found
        setBoard(result.board);
        setStatus("detected");

      } catch (err) {
        console.error("Image analysis error:", err);

        setError(
          err.message || "Unable to analyze image."
        );

        setStatus("error");
      }
    };

    analyzeImage();
  }, [image]);

  // Animate board
  useEffect(() => {
    if (status !== "detected" || !board) {
      setShowGrid(false);
      setVisibleMarks(0);
      return;
    }

    setShowGrid(false);
    setVisibleMarks(0);

    const gridTimer = setTimeout(() => {
      setShowGrid(true);
    }, 250);

    let count = 0;

    const markTimer = setInterval(() => {
      count++;

      setVisibleMarks(count);

      if (count >= 9) {
        clearInterval(markTimer);
      }
    }, 160);

    return () => {
      clearTimeout(gridTimer);
      clearInterval(markTimer);
    };
  }, [status, board]);

  // Calculate game state
  const gameState = board
    ? getGameState(board)
    : null;

  return (
    <main className="analysis-page">

      {/* Background */}
      <div className="background">
        <div className="glow glow-purple" />
        <div className="glow glow-blue" />
        <div className="glow-bottom" />
        <div className="grid" />
        <div className="vignette" />
      </div>

      <section className="analysis-content">

        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="back-button"
        >
          <ArrowLeft />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="analysis-header">

          <div className="analysis-badge">
            <Sparkles />
            <span>BOARD ANALYSIS</span>
          </div>

          <h1>Image Analysis</h1>

          <p>
            Detecting and reconstructing the Tic-Tac-Toe board.
          </p>

        </div>

        {/* Status */}
<div className="board-status">

  {status === "analyzing" && (
    <>
      <LoaderCircle className="status-spinner" />
      <span>Contacting Vision AI...</span>
    </>
  )}

  {status === "detected" && (
    <>
      <Check />
      <span>Board detected</span>
    </>
  )}

  {status === "not-detected" && (
    <span>No valid board detected</span>
  )}

  {status === "error" && (
    <span>Unable to analyze image</span>
  )}

</div>

{/* Game status */}
{status === "detected" && gameState && (
  <div className={`game-state game-${gameState.type}`}>
    <span className="game-state-label">
      GAME STATUS
    </span>

    <strong>
      {gameState.message}
    </strong>
  </div>
)}

{/* Result panels */}
<div className="analysis-result">

  {/* Original image */}
  <div className="original-image-panel">

    <p className="section-label">
      SELECTED PICTURE
    </p>

    <div className="original-image">
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Selected Tic-Tac-Toe board"
        />
      )}
    </div>

    <p className="image-name">
      {image.name}
    </p>

  </div>

  {/* Reconstructed board */}
  <div className="reconstruction-panel">

    <p className="section-label">
      RECONSTRUCTED BOARD
    </p>

    <div className="board-wrapper">

      {status === "detected" && board && (
        <>
          <div className="board-glow" />

          <div className="tic-grid">

            {/* Vertical lines */}
            <div
              className={`grid-line vertical-line line-v1 ${
                showGrid ? "draw-vertical" : ""
              }`}
            />

            <div
              className={`grid-line vertical-line line-v2 ${
                showGrid ? "draw-vertical delay-1" : ""
              }`}
            />

            {/* Horizontal lines */}
            <div
              className={`grid-line horizontal-line line-h1 ${
                showGrid ? "draw-horizontal delay-2" : ""
              }`}
            />

            <div
              className={`grid-line horizontal-line line-h2 ${
                showGrid ? "draw-horizontal delay-3" : ""
              }`}
            />

            {/* Cells */}
            <div className="board-cells">

              {board.map((mark, index) => (
                <div
                  key={index}
                  className="board-cell"
                >
                  {mark && index < visibleMarks && (
                    <span
                      className={`board-mark mark-${mark.toLowerCase()}`}
                    >
                      {mark}
                    </span>
                  )}
                </div>
              ))}

            </div>

          </div>
        </>
      )}

      {/* Loading */}
      {status === "analyzing" && (
        <div className="board-placeholder">
          <LoaderCircle className="status-spinner" />
          <span>Analyzing board...</span>
        </div>
      )}

      {/* No board */}
      {status === "not-detected" && (
        <div className="board-placeholder">
          <span className="placeholder-title">
            Board not detected
          </span>

          <span className="placeholder-description">
            A complete Tic-Tac-Toe grid could not
            be identified in this image.
          </span>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="board-placeholder">
          <span className="placeholder-title">
            Analysis failed
          </span>

          <span className="placeholder-description">
            {error}
          </span>
        </div>
      )}

    </div>

  </div>

</div>

      </section>
    </main>
  );
}

/* Game logic */
function getGameState(board) {
  const winningLines = [
    // Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    // Columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    // Diagonals
    [0, 4, 8],
    [2, 4, 6],
  ];

  // Count X and O for validation  
  const xCount = board.filter((cell) => cell === "X").length;
  const oCount = board.filter((cell) => cell === "O").length;

  // Invalid if move counts differ by more than 1
  if (Math.abs(xCount - oCount) > 1) {
    return {
      type: "invalid",
      winner: null,
      message: "INVALID GAME",
    };
  }

  // Check whether X and O have won
  const xWon = winningLines.some(([a, b, c]) =>
    board[a] === "X" &&
    board[b] === "X" &&
    board[c] === "X"
  );

  const oWon = winningLines.some(([a, b, c]) =>
    board[a] === "O" &&
    board[b] === "O" &&
    board[c] === "O"
  );

  // Both cannot win in the same game
  if (xWon && oWon) {
    return {
      type: "invalid",
      winner: null,
      message: "INVALID GAME",
    };
  }

  // X wins
  if (xWon) {
    return {
      type: "win",
      winner: "X",
      message: "X WINS",
    };
  }

  // O wins
  if (oWon) {
    return {
      type: "win",
      winner: "O",
      message: "O WINS",
    };
  }

  // Board is full
  if (board.every((cell) => cell !== "")) {
    return {
      type: "draw",
      winner: null,
      message: "DRAW",
    };
  }

  // Game is still ongoing
  return {
    type: "progress",
    winner: null,
    message: "GAME IN PROGRESS",
  };
}
export default ImageAnalysis;
