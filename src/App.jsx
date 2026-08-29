import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

// Pages
import ImageAnalysis from "./ImageAnalysis";
import VideoAnalysis from "./VideoAnalysis";

function App() {
  const imageInputRef = useRef(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState("home");
  const [typedText, setTypedText] = useState("");

  const textBeforeAI = "Powered By ";
  const aiText = "AI";

  // Typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    const fullText = textBeforeAI + aiText;

    const interval = setInterval(() => {
      setTypedText(fullText.substring(0, currentIndex + 1));
      currentIndex++;

      if (currentIndex >= fullText.length) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Image picker
  const handleImageButton = () => {
    imageInputRef.current?.click();
  };

  // Open live video analysis
  const handleVideoButton = () => {
    setSelectedImage(null);
    setCurrentPage("video-analysis");
  };

  // Image selected
  const handleImageSelected = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate image type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    // Validate image size
    const maxImageSize = 10 * 1024 * 1024;

    if (file.size > maxImageSize) {
      alert("Image size must be less than 10 MB.");
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setCurrentPage("image-analysis");
  };

  // Back to home
  const handleBack = () => {
    setCurrentPage("home");
    setSelectedImage(null);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  /*
   * ============================================================
   * IMAGE ANALYSIS PAGE
   * ============================================================
   */

  if (currentPage === "image-analysis" && selectedImage) {
    return (
      <ImageAnalysis
        image={selectedImage}
        onBack={handleBack}
      />
    );
  }

  /*
   * ============================================================
   * VIDEO ANALYSIS PAGE
   * ============================================================
   */

  if (currentPage === "video-analysis") {
    return (
      <VideoAnalysis
        onBack={handleBack}
      />
    );
  }

  /*
   * ============================================================
   * HOME PAGE
   * ============================================================
   */

  return (
    <main className="app">

      {/* Background */}
      <div className="background">
        <div className="glow glow-purple" />
        <div className="glow glow-blue" />
        <div className="glow-bottom" />
        <div className="grid" />
        <div className="vignette" />
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">

          {/* Badge */}
          <div className="ai-badge fade-in">
            <Sparkles />
            <span>VISION AI</span>
          </div>

          {/* Heading */}
          <h1 className="title fade-up">
            Tic-Tac-Toe
          </h1>

          {/* Subtitle */}
          <div className="subtitle">
            <span>
              {typedText.startsWith(textBeforeAI) &&
                textBeforeAI}

              {typedText.length > textBeforeAI.length && (
                <span className="ai-gradient">
                  {typedText.substring(textBeforeAI.length)}
                </span>
              )}

              <span className="cursor" />
            </span>
          </div>

          {/* Description */}
          <p className="description">
            Detect and analyze a Tic-Tac-Toe board using
            computer vision. Upload an image or use video
            input to get started.
          </p>

          {/* Buttons */}
          <div className="actions">

            <button
              type="button"
              onClick={handleImageButton}
              className="action-button image-button"
            >
              <span className="button-shine" />

              <ImageIcon />

              <span className="button-text">
                Start with Image
              </span>
            </button>

            <button
              type="button"
              onClick={handleVideoButton}
              className="action-button video-button"
            >
              <span className="button-shine" />

              <Camera />

              <span className="button-text">
                Start Live Video
              </span>
            </button>

          </div>

          {/* Hidden image input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelected}
            hidden
          />

          {/* Footer */}
          <p className="footer">
            Computer Vision • AI • Tic-Tac-Toe
          </p>

        </div>
      </section>

    </main>
  );
}

export default App;
