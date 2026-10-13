const express = require("express");
const router = express.Router();

const API_URL = "https://prexzyapis.com/random/car";

router.apiInfo = {
  name: "Sila Random Car",
  description: "Get random car images.",
  category: "Random",
  method: "GET",
  endpoint: "/random/car",
  parameters: [],
  example: "/random/car"
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch(API_URL, {
      signal: AbortSignal.timeout(30000),
      headers: {
        Accept: "image/*, application/json, */*"
      }
    });

    if (!response.ok) {
      console.error("Car API HTTP status:", response.status);

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Unable to retrieve car images."
      });
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    // Ikiwa API inarudisha picha moja kwa moja
    if (contentType.startsWith("image/")) {
      const imageBuffer = Buffer.from(
        await response.arrayBuffer()
      );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");
      return res.send(imageBuffer);
    }

    // Ikiwa API inarudisha JSON
    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });

  } catch (error) {
    console.error("[SILA CAR API ERROR]", error);

    return res.status(
      error.name === "TimeoutError" ||
      error.name === "AbortError" ? 504 : 502
    ).json({
      success: false,
      creator: "Sila Tech",
      message: "Failed to retrieve car images."
    });
  }
});

module.exports = router;