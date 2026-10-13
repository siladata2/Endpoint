const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "XNXX Downloader",
  description: "XNXX Video Downloader - 18+",
  method: "GET",
  parameters: [
    { name: "url", required: true, description: "XNXX video URL" }
  ]
};

router.get("/", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "url is required. Example: /api/xnxx-dl?url=https://www.xnxx.com/video-xxxx"
      });
    }

    if (!url.includes("xnxx.com")) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Invalid XNXX URL"
      });
    }

    const apiUrl = `https://prexzyapis.com/nsfw/xnxx-dl?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(90000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "XNXX DL provider failed",
        upstreamStatus: response.status
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      result: data
    });

  } catch (error) {
    console.error("[SILA API] XNXX-DL:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch XNXX video right now."
    });
  }
});

module.exports = router;