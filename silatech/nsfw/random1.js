const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Random ANH NSFW",
  description: "Get random ANH NSFW image",
  method: "GET",
  parameters: []
};

router.get("/", async (req, res) => {
  try {
    const apiUrl = "https://prexzyapis.com/random/anhnsfw";

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "ANH NSFW provider request failed",
        upstreamStatus: response.status
      });
    }

    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    // Kama API ikirudisha image direct
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    res.status(200);
    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.setHeader("Content-Length", imageBuffer.length);
    res.setHeader("Content-Disposition", "inline");
    return res.end(imageBuffer);

  } catch (error) {
    console.error("[SILA API] ANHNSFW:", error.message);

    return res.status(
      error.name === "TimeoutError" || error.name === "AbortError" ? 504 : 502
    ).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch ANH NSFW right now."
    });
  }
});

module.exports = router;