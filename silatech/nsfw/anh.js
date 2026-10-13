const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Anh Video NSFW",
  description: "Random Anh Video NSFW  - 18+",
  method: "GET",
  parameters: []
};

router.get("/", async (req, res) => {
  try {
    const apiUrl = "https://prexzyapis.com/random/anhvideonsfw";

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json, video/*" },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Anh Video NSFW provider failed",
        upstreamStatus: response.status
      });
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    // Direct video file
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    res.status(200);
    res.setHeader("Content-Type", contentType || "video/mp4");
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("Content-Disposition", "inline; filename=\"anhvideo.mp4\"");
    return res.end(fileBuffer);

  } catch (error) {
    console.error("[SILA API] anhvideonsfw:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch Anh Video NSFW right now."
    });
  }
});

module.exports = router;