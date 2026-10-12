const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Image Creator",
  description: "Generate logo/image from text using Prexzy API",
  method: "GET",
  parameters: [
    {
      name: "text",
      type: "text",
      required: true,
      placeholder: "Enter text - e.g Sila Tech"
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
      "https://prexzyapis.com/imagecreator/image?text=" +
      encodeURIComponent(text);

    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        success: false,
        error: "ImageCreator API request failed",
        status: apiResponse.status
      });
    }

    const data = await apiResponse.json();
    
    // console.log(data) yako inarudisha hivi - tunahandle formats zote
    // inaweza kuwa { image: "url" } au { url: "url" } au { result: "url" }
    const imageUrl = data?.image || data?.url || data?.result || data?.data;

    if (!imageUrl) {
      return res.status(502).json({
        success: false,
        error: "Image URL was not returned by upstream API",
        raw: data
      });
    }

    const imageResponse = await fetch(imageUrl);

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

    // Auto-detect content type
    const contentType = imageResponse.headers.get("content-type") || "image/png";

    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", imageBuffer.length);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.end(imageBuffer);

  } catch (error) {
    console.error("ImageCreator Error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to generate Image",
      message: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

module.exports = router;