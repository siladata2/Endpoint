const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Style 1917",
  description: "Generate Style 1917 logo from text",
  method: "GET",
  parameters: [
    {
      name: "text",
      type: "text",
      required: true,
      placeholder: "Sila Tech"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Missing required parameter: text",
        usage: "/style1917?text=Sila Tech"
      });
    }

    const apiUrl =
      "https://prexzyapis.com/style1917?text=" +
      encodeURIComponent(text);

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
        error: "Style1917 provider request failed",
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

    const result = await response.text();

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      result
    });

  } catch (error) {
    console.error("[SILA API] Style1917:", error.message);

    return res.status(
      error.name === "TimeoutError" || error.name === "AbortError" ? 504 : 502
    ).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to generate Style1917 right now."
    });
  }
});

module.exports = router;