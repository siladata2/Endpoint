const express = require("express");

const router = express.Router();

router.apiInfo = {
  name: "AI Story Generator",
  description: "Generate a story using AI from a text prompt",
  method: "GET",
  parameters: [
    {
      name: "text",
      type: "text",
      required: true,
      placeholder: "Enter your story idea"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: text",
        usage: `${process.env.BASE_URL || "https://api.silatech.site"}/ai/story?text=Your%20story%20idea`
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: "Text must not exceed 5000 characters"
      });
    }

    const apiUrl =
      "https://eliteprotech-apis.zone.id/ai/story?text=" +
      encodeURIComponent(text);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: "Upstream story API request failed",
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
    console.error("[SILA API] Story Generator:", error.message);

    const timeout =
      error.name === "TimeoutError" ||
      error.name === "AbortError";

    return res.status(timeout ? 504 : 502).json({
      success: false,
      error: timeout
        ? "Story generation timed out. Please try again."
        : "Unable to generate a story at this time."
    });
  }
});

module.exports = router;