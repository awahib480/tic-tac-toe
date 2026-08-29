import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";

dotenv.config();

// Use node-fetch instead of Node's built-in fetch
globalThis.fetch = fetch;

const { InferenceHTTPClient } =
  await import("@roboflow/inference-sdk");

// Creating RoboFlow client
const roboflowClient = InferenceHTTPClient.init({
  apiKey: process.env.ROBOFLOW_API_KEY,
  serverUrl: "https://serverless.roboflow.com",
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

console.log(
  "Roboflow API key loaded:",
  process.env.ROBOFLOW_API_KEY ? "YES" : "NO"
);

const ROBOFLOW_URL =
  "https://serverless.roboflow.com/abduls-workspace-jci1d/workflows/tictactoe-vtictactoe-uyxgd-scgzw-3-yolov8n-t2-logic";

/* ---------------------------------------------------------------------------------------------------------- */

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    /*
     * ============================================================
     * 1. CHECK IMAGE
     * ============================================================
     */

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image was provided.",
      });
    }

    console.log("\n========================================");
    console.log("IMAGE RECEIVED");
    console.log("========================================");

    console.log("Name:", req.file.originalname);
    console.log("Type:", req.file.mimetype);
    console.log("Size:", req.file.size);

    /*
     * ============================================================
     * 2. READ IMAGE
     * ============================================================
     */

    console.log("STEP 1: Reading image...");

    const imageBuffer = fs.readFileSync(req.file.path);

    console.log("STEP 2: Image read successfully.");

    /*
     * ============================================================
     * 3. CONVERT TO BASE64
     * ============================================================
     */

    const imageBase64 = imageBuffer.toString("base64");

    console.log("STEP 3: Image converted to Base64.");
    console.log(
      "Base64 length:",
      imageBase64.length
    );

    /*
     * ============================================================
     * 4. CHECK API KEY
     * ============================================================
     */

    if (!process.env.ROBOFLOW_API_KEY) {
      throw new Error(
        "ROBOFLOW_API_KEY is not configured."
      );
    }

    /*
     * ============================================================
     * 5. CALL ROBOFLOW
     * ============================================================
     */

    console.log("STEP 4: Sending image to Roboflow...");
    console.log("Workflow URL:", ROBOFLOW_URL);

    /*
     * Abort request if Roboflow takes more than 30 seconds
     */
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    let response;

    try {
      response = await fetch(
        ROBOFLOW_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            api_key: process.env.ROBOFLOW_API_KEY,

            inputs: {
              image: {
                type: "base64",
                value: imageBase64,
              },
            },
          }),

          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    console.log(
      "STEP 5: Roboflow response received."
    );

    console.log(
      "Roboflow status:",
      response.status,
      response.statusText
    );

    /*
     * ============================================================
     * 6. READ ROBOFLOW RESPONSE
     * ============================================================
     */

    const responseText = await response.text();

    console.log(
      "Roboflow response length:",
      responseText.length
    );

    if (!response.ok) {
      console.error(
        "Roboflow request failed:"
      );

      console.error(responseText);

      return res.status(response.status).json({
        success: false,
        message: "Roboflow inference failed.",
        error: responseText,
      });
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "Failed to parse Roboflow response:"
      );

      console.error(responseText);

      throw new Error(
        "Roboflow returned an invalid JSON response."
      );
    }

    console.log(
      "STEP 6: Roboflow JSON parsed successfully."
    );

    console.log(
      "Roboflow result:",
      JSON.stringify(result, null, 2)
    );

    /*
     * ============================================================
     * 7. GET PREDICTIONS
     * ============================================================
     */

    const predictions =
      result?.outputs?.[0]?.predictions?.predictions || [];

    console.log(
      "STEP 7: Predictions found:",
      predictions.length
    );

    /*
     * ============================================================
     * 8. FIND FIELD
     * ============================================================
     */

    const field = predictions.find(
      (prediction) =>
        prediction.class === "Field"
    );

    console.log(
      "Field detected:",
      field ? "YES" : "NO"
    );

    /*
     * ============================================================
     * 9. FIND ALL 9 CELLS
     * ============================================================
     */

    const requiredCells = [
      "11", "12", "13",
      "21", "22", "23",
      "31", "32", "33",
    ];

    const cells = predictions.filter(
      (prediction) =>
        requiredCells.includes(
          prediction.class
        )
    );

    const detectedCellNames = new Set(
      cells.map(
        (cell) => cell.class
      )
    );

    const allCellsDetected =
      requiredCells.every(
        (cell) =>
          detectedCellNames.has(cell)
      );

    console.log(
      "Cells detected:",
      cells.length
    );

    console.log(
      "All 9 cells detected:",
      allCellsDetected ? "YES" : "NO"
    );

    /*
     * ============================================================
     * 10. VALIDATE BOARD
     * ============================================================
     */

    if (!field || !allCellsDetected) {
      console.log(
        "STEP 8: Complete board NOT detected."
      );

      return res.json({
        success: true,
        boardDetected: false,
        message:
          "Complete Tic-Tac-Toe board not detected.",
      });
    }

    console.log(
      "STEP 8: Complete board detected."
    );

    /*
     * ============================================================
     * 11. CREATE EMPTY BOARD
     * ============================================================
     */

    const board = Array(9).fill("");

    /*
     * ============================================================
     * 12. FIND X AND O
     * ============================================================
     */

    const pieces = predictions.filter(
      (prediction) =>
        prediction.class === "X" ||
        prediction.class === "O"
    );

    console.log(
      "X/O detections:",
      pieces.length
    );

    /*
     * ============================================================
     * 13. CHECK WHETHER EACH PIECE IS INSIDE A CELL
     * ============================================================
     */

    for (const piece of pieces) {
      const pieceX = piece.x;
      const pieceY = piece.y;

      let containingCell = null;

      for (const cell of cells) {
        const cellLeft =
          cell.x - cell.width / 2;

        const cellRight =
          cell.x + cell.width / 2;

        const cellTop =
          cell.y - cell.height / 2;

        const cellBottom =
          cell.y + cell.height / 2;

        const isInside =
          pieceX >= cellLeft &&
          pieceX <= cellRight &&
          pieceY >= cellTop &&
          pieceY <= cellBottom;

        if (isInside) {
          containingCell = cell;
          break;
        }
      }

      /*
       * Piece is outside all detected cells
       */
      if (!containingCell) {
        console.log(
          `${piece.class} detected outside all cells. Ignoring.`
        );

        continue;
      }

      /*
       * ========================================================
       * 14. CONVERT CELL NAME TO BOARD INDEX
       * ========================================================
       */

      const row =
        Number(containingCell.class[0]);

      const column =
        Number(containingCell.class[1]);

      const index =
        (row - 1) * 3 +
        (column - 1);

      /*
       * Don't overwrite an already assigned cell
       */
      if (board[index] !== "") {
        console.log(
          `Cell ${containingCell.class} already occupied.`
        );

        continue;
      }

      board[index] = piece.class;

      console.log(
        `${piece.class} assigned to cell ${containingCell.class}`
      );
    }

    /*
     * ============================================================
     * 15. FINAL BOARD
     * ============================================================
     */

    console.log(
      "STEP 9: Board reconstructed:"
    );

    console.log(board);

    /*
     * ============================================================
     * 16. RETURN RESULT
     * ============================================================
     */

    return res.json({
      success: true,
      boardDetected: true,
      board,
    });

  } catch (error) {

    console.error(
      "\n========================================"
    );

    console.error(
      "API ERROR"
    );

    console.error(
      "========================================"
    );

    if (error.name === "AbortError") {
      console.error(
        "Roboflow request timed out."
      );

      return res.status(504).json({
        success: false,
        message:
          "Roboflow inference timed out. Please try again.",
      });
    }

    console.error(
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error.",
      error:
        error.message,
    });

  } finally {

    /*
     * ============================================================
     * DELETE TEMPORARY UPLOAD
     * ============================================================
     */

    if (
      req.file?.path &&
      fs.existsSync(req.file.path)
    ) {
      try {
        fs.unlinkSync(req.file.path);

        console.log(
          "Temporary image deleted."
        );
      } catch (deleteError) {
        console.error(
          "Failed to delete temporary image:",
          deleteError.message
        );
      }
    }

    console.log(
      "========================================\n"
    );
  }
});

/* ---------------------------------------------------------------------------------------------------------- */

/*
 * ============================================================
 * ROBOFLOW WEBRTC PROXY
 * ============================================================
 */

app.post("/api/init-webrtc", async (req, res) => {
  console.log("\n========================================");
  console.log("WEBRTC INITIALIZATION");
  console.log("========================================");

  try {
    const { offer, wrtcParams } = req.body;

    /*
     * Validate request
     */

    if (!offer) {
      return res.status(400).json({
        message: "WebRTC offer is missing.",
      });
    }

    if (!wrtcParams) {
      return res.status(400).json({
        message: "WebRTC parameters are missing.",
      });
    }

    /*
     * Check API key
     */

    if (!process.env.ROBOFLOW_API_KEY) {
      console.error(
        "ROBOFLOW_API_KEY is missing."
      );

      return res.status(500).json({
        message:
          "Roboflow API key is not configured.",
      });
    }

    /*
     * Log WebRTC configuration
     */

    console.log(
      "Workspace:",
      wrtcParams.workspaceName
    );

    console.log(
      "Workflow:",
      wrtcParams.workflowId
    );

    console.log(
      "Plan:",
      wrtcParams.requestedPlan
    );

    console.log(
      "Region:",
      wrtcParams.requestedRegion
    );

    console.log(
      "Stream outputs:",
      wrtcParams.streamOutputNames
    );

    console.log(
      "Data outputs:",
      wrtcParams.dataOutputNames
    );

    /*
     * Initialize Roboflow WebRTC worker
     */

    const answer =
      await roboflowClient.initializeWebrtcWorker({
        offer,

        workspaceName:
          wrtcParams.workspaceName,

        workflowId:
          wrtcParams.workflowId,

        config: {
          streamOutputNames:
            wrtcParams.streamOutputNames || [],

          dataOutputNames:
            wrtcParams.dataOutputNames || [],

          workflowsParameters:
            wrtcParams.workflowsParameters || {},

          requestedPlan:
            wrtcParams.requestedPlan,

          requestedRegion:
            wrtcParams.requestedRegion,

          realtimeProcessing:
            wrtcParams.realtimeProcessing,
        },
      });

    console.log(
      "Roboflow WebRTC worker initialized."
    );

    console.log(
      "========================================\n"
    );

    return res.json(answer);

  } catch (error) {

    console.error(
      "\n========================================"
    );

    console.error(
      "ROBOFLOW WEBRTC ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(
      "Error:",
      error
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Status code:",
      error?.statusCode
    );

    console.error(
      "Error data:",
      error?.errorData
    );

    console.error(
      "Error type:",
      error?.errorData?.error_type
    );

    console.error(
      "Inner error type:",
      error?.errorData?.inner_error_type
    );

    console.error(
      "Inner error message:",
      error?.errorData?.inner_error_message
    );

    console.error(
      "Block errors:",
      error?.errorData?.blocks_errors
    );

    console.error(
      "Stack:",
      error?.stack
    );

    console.error(
      "========================================\n"
    );

    /*
     * IMPORTANT:
     * Forward Roboflow's actual WorkflowError.
     */

    if (
      error?.statusCode &&
      error?.errorData
    ) {
      return res
        .status(error.statusCode)
        .json(error.errorData);
    }

    /*
     * Fallback for normal errors
     */

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to initialize Roboflow WebRTC.",
    });
  }
});


app.listen(PORT, () => {
  console.log(
    `API running at http://localhost:${PORT}`
  );
});
