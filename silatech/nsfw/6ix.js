const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "SixtyNine NSFW",
  description: "Random SixtyNine NSFW (image & video)",
  method: "GET",
  parameters: []
};

router.get("/", async (req, res) => {
  try {
    const apiUrl = "https://prexzyapis.com/nsfw/sixtynine";

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json, image/*, video/*" },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "SixtyNine provider failed",
        upstreamStatus: response.status
      });
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    // 1. Kama ni JSON - ina URL ya image/video
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    // 2. Kama ni file direct (image/jpeg, image/png, video/mp4, image/gif)
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    
    let finalType = "image/jpeg";
    if (contentType) finalType = contentType;
    else if (fileBuffer.slice(0,4).toString() === "GIF8") finalType = "image/gif";

    res.status(200);
    res.setHeader("Content-Type", finalType);
    res.setHeader("Content-Length", fileBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (finalType.includes("video")) {
      res.setHeader("Content-Disposition", "inline; filename=\"sixtynine.mp4\"");
    } else {
      res.setHeader("Content-Disposition", "inline; filename=\"sixtynine.jpg\"");
    }

    return res.end(fileBuffer);

  } catch (error) {
    console.error("[SILA API] SixtyNine:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch SixtyNine right now."
    });
  }
});

module.exports = router;