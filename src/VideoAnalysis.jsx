import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Sparkles,
  VideoOff,
} from "lucide-react";

import {
  connectors,
  webrtc,
  streams,
} from "@roboflow/inference-sdk";

function VideoAnalysis({ onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  const connectionRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Prevent stale StrictMode sessions
  const sessionRef = useRef(0);

  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState(null);

  // Game State refs
  const gameStateRef = useRef(null);
  const stableGameStateRef = useRef(null);
  const stableCountRef = useRef(0);
  const candidateGameStateRef = useRef(null);
  const candidateCountRef = useRef(0);
  const [gameState, setGameState] = useState(null);
  const STABILITY_THRESHOLD = 3;

  useEffect(() => {
    const sessionId = ++sessionRef.current;

    startVideo(sessionId);

    return () => {
      sessionRef.current++;
      stopVideo();
    };
  }, []);

  /*
   * Draw Roboflow detections on the video.
   */
  useEffect(() => {
    drawPredictions();

    const handleResize = () => {
      drawPredictions();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [predictions]);

  async function startVideo(sessionId) {
    try {
      setStatus("connecting");
      setError(null);
      setPredictions(null);

      /*
       * ============================================================
       * 1. START CAMERA
       * ============================================================
       */

      console.log("Starting camera...");

      const cameraStream = await streams.useCamera(
        {
          video: {
            facingMode: "environment",
            aspectRatio: 16 / 9,
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        }
      );

      // Ignore stale StrictMode session
      if (sessionRef.current !== sessionId) {
        cameraStream
          .getTracks()
          .forEach((track) => track.stop());

        return;
      }

      cameraStreamRef.current = cameraStream;

      /*
       * Keep the local camera feed in the video element.
       */

      if (videoRef.current) {
        videoRef.current.srcObject = cameraStream;

        try {
          await videoRef.current.play();
        } catch (err) {
          console.warn(
            "Camera autoplay warning:",
            err
          );
        }
      }

      console.log("Camera started.");

      /*
       * ============================================================
       * 2. CREATE ROBOFLOW PROXY
       * ============================================================
       */

      const connector = connectors.withProxyUrl(
        "http://localhost:5000/api/init-webrtc"
      );

      console.log(
        "Connecting to Roboflow WebRTC..."
      );

      /*
       * ============================================================
       * 3. CONNECT CAMERA TO ROBOFLOW
       * ============================================================
       */

      const connection = await webrtc.useStream({
        source: cameraStream,
        connector,
        wrtcParams: {
          workspaceName: "abduls-workspace-jci1d",
          workflowId:
            "tictactoe-vtictactoe-uyxgd-scgzw-3-yolov8n-t2-logic",
          streamOutputNames: [],
          dataOutputNames: ["predictions"],
          processingTimeout: 3600,
          requestedPlan: "webrtc-gpu-medium",
          requestedRegion: "ap",
          realtimeProcessing: true,
        },

        /*
         * Roboflow workflow results
         */
        onData: (data) => {
          console.log("ROBOFLOW RAW DATA:", data);

          if (sessionRef.current !== sessionId) {
            return;
          }

          setPredictions(data);

          /*
            * Do not run game logic until the
            * complete board has been detected.
          */
          if (!isBoardDetected(data)) {
            updateStableGameState({
              type: "no-board",
              winner: null,
              message: "No Board Detected",
            });

        return;
      }  

      const board =
        getBoardFromPredictions(data);

      if (board) {
        const nextGameState = getGameState(board);

      updateStableGameState(nextGameState);
    }
  },
});

      /*
       * Ignore stale StrictMode session
       */

      if (sessionRef.current !== sessionId) {
        connection?.cleanup();
        return;
      }

      connectionRef.current = connection;

      console.log(
        "WebRTC connection established."
      );

      setStatus("connected");

      console.log(
        "Video analysis is now active."
      );

    } catch (err) {
      /*
       * Ignore stale StrictMode initialization.
       */

      if (
        sessionRef.current !== sessionId
      ) {
        return;
      }

      console.error(
        "Video analysis error:",
        err
      );

      setError(
        err?.message ||
          "Unable to connect to the camera or Vision AI."
      );

      setStatus("error");
    }
  }


// Game Logic
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

  const xCount = board.filter((cell) => cell === "X").length;
  const oCount = board.filter((cell) => cell === "O").length;

  if (Math.abs(xCount - oCount) > 1) {
    return {
      type: "invalid",
      winner: null,
      message: "INVALID GAME",
    };
  }

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

  if (xWon && oWon) {
    return {
      type: "invalid",
      winner: null,
      message: "INVALID GAME",
    };
  }

  if (xWon) {
    return {
      type: "win",
      winner: "X",
      message: "X WINS",
    };
  }

  if (oWon) {
    return {
      type: "win",
      winner: "O",
      message: "O WINS",
    };
  }

  if (board.every((cell) => cell !== "")) {
    return {
      type: "draw",
      winner: null,
      message: "DRAW",
    };
  }

  return {
    type: "progress",
    winner: null,
    message: "GAME IN PROGRESS",
  };
}


// Check if the board is fully detected (Field + all 9 cells)
function isBoardDetected(data) {
  const detections =
    data
      ?.serialized_output_data
      ?.predictions
      ?.predictions;

  if (!Array.isArray(detections)) {
    return false;
  }

  const hasField = detections.some(
    (prediction) =>
      prediction.class === "Field"
  );

  const requiredCells = [
    "11", "12", "13",
    "21", "22", "23",
    "31", "32", "33",
  ];

  const detectedCells = new Set(
    detections
      .filter(
        (prediction) =>
          requiredCells.includes(
            prediction.class
          )
      )
      .map(
        (prediction) =>
          prediction.class
      )
  );

  return (
    hasField &&
    requiredCells.every((cell) =>
      detectedCells.has(cell)
    )
  );
}


// Reconstruct the board internally from predictions for Game Status
function getBoardFromPredictions(data) {
  const detections =
    data
      ?.serialized_output_data
      ?.predictions
      ?.predictions;

  if (!Array.isArray(detections)) {
    return null;
  }

  const board = Array(9).fill("");
  const confidence = Array(9).fill(0);

  const cells = detections.filter(
    (prediction) =>
      typeof prediction.class === "string" &&
      /^[1-3][1-3]$/.test(prediction.class) &&
      typeof prediction.x === "number" &&
      typeof prediction.y === "number" &&
      typeof prediction.width === "number" &&
      typeof prediction.height === "number"
  );

  const marks = detections.filter(
    (prediction) =>
      (prediction.class === "X" ||
        prediction.class === "O") &&
      typeof prediction.x === "number" &&
      typeof prediction.y === "number" &&
      typeof prediction.confidence === "number"
  );

  marks.forEach((mark) => {
    let matchedCell = null;

    for (const cell of cells) {
      const left =
        cell.x - cell.width / 2;

      const right =
        cell.x + cell.width / 2;

      const top =
        cell.y - cell.height / 2;

      const bottom =
        cell.y + cell.height / 2;

      if (
        mark.x >= left &&
        mark.x <= right &&
        mark.y >= top &&
        mark.y <= bottom
      ) {
        matchedCell = cell;
        break;
      }
    }

    if (!matchedCell) {
      return;
    }

    const row =
      Number(matchedCell.class[0]) - 1;

    const column =
      Number(matchedCell.class[1]) - 1;

    const index =
      row * 3 + column;

    if (
      mark.confidence >
      confidence[index]
    ) {
      board[index] = mark.class;
      confidence[index] =
        mark.confidence;
    }
  });

  return board;
}


// Update the stable game state based on predictions (temporal stability)
function updateStableGameState(nextGameState) {
  if (!nextGameState) {
    return;
  }

  const nextKey =
    `${nextGameState.type}-${nextGameState.winner}`;

  const candidate =
    candidateGameStateRef.current;

  const candidateKey = candidate
    ? `${candidate.type}-${candidate.winner}`
    : null;

  if (nextKey === candidateKey) {
    candidateCountRef.current += 1;
  } else {
    candidateGameStateRef.current =
      nextGameState;

    candidateCountRef.current = 1;
  }

  if (
    candidateCountRef.current >=
    STABILITY_THRESHOLD
  ) {
    setGameState(nextGameState);
  }
}


/* Draw Roboflow bounding boxes */
function drawPredictions() {
  const canvas = canvasRef.current;
  const video = videoRef.current;

  if (!canvas || !video) {
    return;
  }

  const wrapperWidth = video.clientWidth;
  const wrapperHeight = video.clientHeight;

  if (
    wrapperWidth === 0 ||
    wrapperHeight === 0 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    return;
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return;
  }

  /*
   * Get the actual Roboflow output resolution.
   */
  const predictionImage =
    predictions
      ?.serialized_output_data
      ?.predictions
      ?.image;

  const inferenceWidth =
    predictionImage?.width;

  const inferenceHeight =
    predictionImage?.height;

  if (
    !inferenceWidth ||
    !inferenceHeight
  ) {
    return;
  }

  const dpr =
    window.devicePixelRatio || 1;

  canvas.width =
    wrapperWidth * dpr;

  canvas.height =
    wrapperHeight * dpr;

  canvas.style.width =
    `${wrapperWidth}px`;

  canvas.style.height =
    `${wrapperHeight}px`;

  ctx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

  ctx.clearRect(
    0,
    0,
    wrapperWidth,
    wrapperHeight
  );

  const detections =
    predictions
      ?.serialized_output_data
      ?.predictions
      ?.predictions;

  if (!Array.isArray(detections)) {
    return;
  }

  /*
   * Determine the actual displayed video rectangle.
   */
  const videoAspect =
    video.videoWidth /
    video.videoHeight;

  const containerAspect =
    wrapperWidth /
    wrapperHeight;

  let videoWidth;
  let videoHeight;
  let offsetX;
  let offsetY;

  if (videoAspect > containerAspect) {
    videoWidth = wrapperWidth;

    videoHeight =
      wrapperWidth / videoAspect;

    offsetX = 0;

    offsetY =
      (wrapperHeight - videoHeight) / 2;

  } else {
    videoHeight = wrapperHeight;

    videoWidth =
      wrapperHeight * videoAspect;

    offsetY = 0;

    offsetX =
      (wrapperWidth - videoWidth) / 2;
  }

  /*
   * Scale Roboflow coordinates to
   * the displayed video.
   */
  const scaleX =
    videoWidth / inferenceWidth;

  const scaleY =
    videoHeight / inferenceHeight;

  detections.forEach((prediction) => {
    const {
      class: className,
      confidence,
      x,
      y,
      width,
      height,
    } = prediction;

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof width !== "number" ||
      typeof height !== "number"
    ) {
      return;
    }

    const boxWidth =
  width * scaleX;

    const boxHeight =
  height * scaleY;

// Mirror the box positions for flipped video
    const left =
  offsetX +
  (inferenceWidth - (x + width / 2)) *
    scaleX;

    const top =
  offsetY +
  (y - height / 2) * scaleY;

    let lineWidth = 2;
    let lineDash = [];

    if (className === "Field") {
      lineWidth = 2;
      lineDash = [8, 5];
    } else if (
      className === "X" ||
      className === "O"
    ) {
      lineWidth = 3;
    }

    ctx.save();

    ctx.lineWidth = lineWidth;
    ctx.setLineDash(lineDash);

    if (className === "Field") {
      ctx.strokeStyle =
        "rgba(167, 139, 250, 0.9)";
    } else if (className === "X") {
      ctx.strokeStyle =
        "rgba(34, 211, 238, 0.95)";
    } else if (className === "O") {
      ctx.strokeStyle =
        "rgba(251, 146, 60, 0.95)";
    } else {
      ctx.strokeStyle =
        "rgba(255, 255, 255, 0.75)";
    }

    ctx.strokeRect(
      left,
      top,
      boxWidth,
      boxHeight
    );

    ctx.restore();

    /*
     * Draw label.
     */
    const label =
      `${className} ${Math.round(
        confidence * 100
      )}%`;

    ctx.save();

    ctx.font =
      "600 12px Arial";

    const textWidth =
      ctx.measureText(label).width;

    const labelHeight = 20;

    const labelWidth =
      textWidth + 10;

    const labelX = left;

    const labelY =
      Math.max(
        0,
        top - labelHeight
      );

    ctx.fillStyle =
      "rgba(5, 8, 22, 0.85)";

    ctx.fillRect(
      labelX,
      labelY,
      labelWidth,
      labelHeight
    );

    if (className === "Field") {
      ctx.fillStyle = "#c4b5fd";
    } else if (className === "X") {
      ctx.fillStyle = "#67e8f9";
    } else if (className === "O") {
      ctx.fillStyle = "#fdba74";
    } else {
      ctx.fillStyle = "#ffffff";
    }

    ctx.textBaseline = "middle";

    ctx.fillText(
      label,
      labelX + 5,
      labelY + labelHeight / 2
    );

    ctx.restore();
  });
}

  function stopVideo() {
    console.log(
      "Stopping video session..."
    );

    /*
     * Stop Roboflow WebRTC
     */

    if (connectionRef.current) {
      try {
        connectionRef.current.cleanup();
      } catch (err) {
        console.warn(
          "WebRTC cleanup warning:",
          err
        );
      }

      connectionRef.current = null;
    }

    /*
     * Stop camera
     */

    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      cameraStreamRef.current = null;
    }

    /*
     * Clear video
     */

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    /*
     * Clear detection overlay.
     */

    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );
      }
    }
  }

  function handleBack() {
    stopVideo();
    onBack();
  }

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
          onClick={handleBack}
          className="back-button"
        >
          <ArrowLeft />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="analysis-header">

          <div className="analysis-badge">
            <Sparkles />
            <span>VIDEO ANALYSIS</span>
          </div>

          <h1>Video Analysis</h1>

          <p>
            Analyze a live Tic-Tac-Toe board
            using Vision AI.
          </p>

        </div>

        {/* Status */}
        <div className="board-status">

          {status === "connecting" && (
            <>
              <LoaderCircle
                className="status-spinner"
              />

              <span>
                Connecting to Vision AI...
              </span>
            </>
          )}

          {status === "connected" && (
            <>
              <Check />

              <span>
                Vision AI connected
              </span>
            </>
          )}

          {status === "error" && (
            <>
              <VideoOff />

              <span>
                Unable to connect
              </span>
            </>
          )}

        </div>

        {/* Live Video */}
        <div className="video-analysis-container">

          <div className="video-panel">

            <p className="section-label">
              LIVE VIDEO
            </p>

            <div
  ref={wrapperRef}
  className="live-video-wrapper"
>
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted
    className="live-video flipped-video"
  />

  <canvas
    ref={canvasRef}
    className="detection-canvas"
  />

  {gameState && status === "connected" && (
    <div
      className={`game-status-waterdrop game-${gameState.type}`}
    >
      <strong>{gameState.message}</strong>
    </div>
  )}

  {status === "connecting" && (
    <div className="video-overlay">
      <LoaderCircle className="status-spinner" />

      <span>
        Connecting...
      </span>
    </div>
  )}

  {status === "error" && (
    <div className="video-overlay">
      <VideoOff />

      <span className="placeholder-title">
        Video unavailable
      </span>

      <span className="placeholder-description">
        {error}
      </span>
    </div>
  )}

  {status === "connected" && (
    <div className="live-indicator">
      <span />
      LIVE
    </div>
  )}
</div>

          </div>

        </div>

      </section>

    </main>
  );
}

export default VideoAnalysis;
