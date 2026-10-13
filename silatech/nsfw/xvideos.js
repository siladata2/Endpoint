const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "XVIDEOS Search NSFW",
  description: "Search XVIDEOS videos via Prexzy API - 18+",
  method: "GET",
  parameters: [
    { name: "query", required: true, description: "Search keyword" }
  ]
};

router.get("/", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Query is required. Example: /api/xvideos-search?query=love"
      });
    }

    const apiUrl = `https://prexzyapis.com/nsfw/xvideos-search?query=${encodeURIComponent(query)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "XVIDEOS Search provider failed",
        upstreamStatus: response.status
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      query,
      result: data
    });

  } catch (error) {
    console.error("[SILA API] XVIDEOS-Search:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch XVIDEOS Search right now."
    });
  }
});

module.exports = router;