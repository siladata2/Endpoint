const express = require("express");

const router = express.Router();

router.apiInfo = {
  name: "Fire Logo",
  description: "Generate a fire-style logo image from text",
  method: "GET",
  parameters: [
    {
      name: "text",
      type: "text",
      required: true,
      placeholder: "Enter text for the logo"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const text = req.query.text;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: text"
      });
    }

    const apiUrl =
      "https://eliteprotech-apis.zone.id/image/firelogo?text=" +
      encodeURIComponent(text);

    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        success: false,
        error: "Fire Logo API request failed",
        status: apiResponse.status
      });
    }

    const data = await apiResponse.json();

    if (!data || !data.image) {
      return res.status(502).json({
        success: false,
        error: "Image URL was not returned by upstream API"
      });
    }

    const imageResponse = await fetch(data.image);

    if (!imageResponse.ok) {
      return res.status(502).json({
        success: false,
        error: "Failed to fetch generated image",
        status: imageResponse.status
      });
    }

    const imageBuffer = Buffer.from(
      await imageResponse.arrayBuffer()
    );

    /*
     * FireLogo upstream returns PNG images.
     * Force the correct content type so the browser
     * and SILA API frontend recognize this as an image.
     */

    res.status(200);

    res.setHeader(
      "Content-Type",
      "image/png"
    );

    res.setHeader(
      "Content-Length",
      imageBuffer.length
    );

    res.setHeader(
      "Content-Disposition",
      "inline"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    return res.end(imageBuffer);

  } catch (error) {

    console.error(
      "Fire Logo Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to generate Fire Logo",
      message:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message
    });
  }
});

module.exports = router;