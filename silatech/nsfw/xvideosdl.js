const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "XVIDEOS Downloader",
  description: "XVIDEOS Video Downloader - 18+",
  method: "GET",
  parameters: [
    { name: "url", required: true, description: "XVIDEOS video URL" }
  ]
};

router.get("/", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "url is required. Example: /api/xvideos-dl?url=https://www.xvideos.com/video.xxxx"
      });
    }

    if (!url.includes("xvideos.com")) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Invalid XVIDEOS URL"
      });
    }

    const apiUrl = `https://prexzyapis.com/nsfw/xvideos-dl?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(90000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "XVIDEOS DL provider failed",
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
    console.error("[SILA API] XVIDEOS-DL:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch XVIDEOS video right now."
    });
  }
});

module.exports = router;