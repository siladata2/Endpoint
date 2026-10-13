const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Sila Random Car",
  description: "Get random car images.",
  method: "GET",
  endpoint: "/random/car",
  parameters: [],
  example: "/random/car"
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch(
      "https://prexzyapis.com/random/car",
      {
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Random Car service is temporarily unavailable."
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });
  } catch (error) {
    return res.status(error.name === "TimeoutError" ||
      error.name === "AbortError" ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: "Failed to retrieve car images."
    });
  }
});

module.exports = router;