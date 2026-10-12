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
        Accept: "image/*, application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Image provider request failed",
        upstreamStatus: response.status
      });
    }

    const contentType =
      response.headers.get("content-type") || "";

    // Provider akirudisha JSON, rudisha JSON
    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    // Hakikisha response ina aina ya picha inayotambulika
    if (!contentType.startsWith("image/")) {
      const message = await response.text();

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Provider did not return an image",
        details: message.slice(0, 300)
      });
    }

    // Rudisha picha kama binary data bila kuibadilisha kuwa text
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Powered-By", "Sila Tech");

    const imageBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    return res.status(200).send(imageBuffer);

  } catch (error) {
    console.error(
      "[SILA API] Image Creator:",
      error.message
    );

    const isTimeout =
      error.name === "TimeoutError" ||
      error.name === "AbortError";

    return res.status(isTimeout ? 504 : 502).json({
      success: false,
      creator: "Sila Tech",
      error: isTimeout
        ? "Image generation timed out. Please try again."
        : "Unable to generate the image right now."
    });
  }
});

module.exports = router;