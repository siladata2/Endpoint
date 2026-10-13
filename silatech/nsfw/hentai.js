const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Anh Hentai",
  description: "Random Anh Hentai Video - 18+",
  method: "GET",
  parameters: []
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch("https://prexzyapis.com/random/anhhentai", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Provider failed",
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
    console.error("[SILA API] annhentai:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch right now."
    });
  }
});

module.exports = router;