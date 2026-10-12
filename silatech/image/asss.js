const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "AI Image Creator",
  description: "Generate an image from a text prompt.",
  method: "GET",
  parameters: [
    {
      name: "text",
      type: "text",
      required: true,
      placeholder: "Sila"
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
        usage: "/imagecreator/image?text=Sila"
      });
    }

    const apiUrl =
      "https://prexzyapis.com/imagecreator/image?text=" +
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
        creator: "Sila Tech",
        error: "Image provider request failed",
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
    console.error("[SILA API] Image Creator:", error.message);

    return res.status(
      error.name === "TimeoutError" ||
      error.name === "AbortError" ? 504 : 502
    ).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to generate the image right now."
    });
  }
});

module.exports = router;