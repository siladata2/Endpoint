const express = require("express");
const router = express.Router();

const API_URL = "https://prexzyapis.com/random/boypic";

router.apiInfo = {
  name: "Sila Boy Pic",
  description: "Get random boy pictures.",
  category: "Random",
  method: "GET",
  endpoint: "/random/boypic",
  parameters: [],
  example: "/random/boypic"
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
      console.error("Boy Pic API HTTP status:", response.status);

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Unable to retrieve boy pictures."
      });
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    if (contentType.startsWith("image/")) {
      const imageBuffer = Buffer.from(
        await response.arrayBuffer()
      );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");

      return res.send(imageBuffer);
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });

  } catch (error) {
    console.error("[SILA BOY PIC ERROR]", error);

    return res.status(
      error.name === "TimeoutError" ||
      error.name === "AbortError" ? 504 : 502
    ).json({
      success: false,
      creator: "Sila Tech",
      message: "Failed to retrieve boy pictures."
    });
  }
});

module.exports = router;