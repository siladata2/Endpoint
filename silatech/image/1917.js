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
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Style1917 provider failed",
        upstreamStatus: response.status
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // Kama ni JSON basi rudisha JSON
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    // Kama ni image (jpeg/png) - hii ndio inayotokea sasa
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    res.status(200);
    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.setHeader("Content-Length", imageBuffer.length);
    res.setHeader("Content-Disposition", "inline; filename=\"style1917.jpg\"");
    res.setHeader("Cache-Control", "public, max-age=86400");
    
    return res.end(imageBuffer);

  } catch (error) {
    console.error("[SILA API] Style1917:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to generate Style1917 right now."
    });
  }
});

module.exports = router;