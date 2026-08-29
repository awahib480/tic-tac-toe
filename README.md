# Tic Tac Toe Vision AI
A computer-vision-powered Tic-Tac-Toe application that detects the board, cells and X/O moves from images or live video then reconstructs the board and determines the current game state.

## Features
- **Image Analysis** Upload an image and detect the Tic-Tac-Toe board
- **Real-Time Video Analysis** Detect the board and moves through a webcam
- **AI-Powered Detection** Object detection using RoboFlow
- **Board Reconstruction** Converts detections into a 3×3 game board
- **Game Logic** Detects:
    - X Wins
    - O Wins
    - Draw
    - In Progress
    - Invalid Game
- **Visual Overlays** Bounding boxes and live game status directly on the video

## Tech Stack
- React	(Frontend)
- CSS	(UI styling)
- Node.js + Express	(Backend)
- RoboFlow	(Object detection)
- WebRTC	(Live video streaming)
- JavaScript	(Application logic)

## How It Works
Image / Webcam

      ↓

AI Object Detection

      ↓

Board & Cell Detection

      ↓

X / O Detection

      ↓

3×3 Board Reconstruction

      ↓

Game Logic

      ↓

Game Status

## How To Get Started
**1. Clone the repository:**

git clone https://github.com/awahib480/tic-tac-toe

cd tic-tac-toe

**2. Install dependencies**

npm install

Install dependencies separately inside the frontend and backend if required by the project structure.

**3. Configure environment variables**

Create a .env file in the backend:

ROBOFLOW_API_KEY=your_api_key

**4. Run the application**

Start the backend and frontend separately, then open the provided local URL in your browser.

## Vision Meets Game Logic
This project combines computer vision + real-time processing + game-state reasoning to turn a physical Tic-Tac-Toe board into an interactive AI experience.

**Built as a Computer Vision & AI project.**
