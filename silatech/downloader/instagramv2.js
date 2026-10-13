const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Instagram Downloader V2",
  description: "Retrieve Instagram media download information.",
  method: "GET",
  parameters: [
    {
      name: "url",
      type: "text",
      required: true,
      placeholder: "Paste Instagram post, Reel or video URL"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const mediaUrl = String(req.query.url || "").trim();

    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Missing required parameter: url",
        usage: "/download/instagramv2?url=INSTAGRAM_URL"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(mediaUrl);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid Instagram URL."
      });
    }

    const allowedHosts = [
      "instagram.com",
      "www.instagram.com",
      "m.instagram.com"
    ];

    if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Only Instagram URLs are supported."
      });
    }

    // Provider details remain in the backend.
    const providerUrl = new URL(
      "https://prexzyapis.com/download/igv2"
    );

    providerUrl.searchParams.set("url", mediaUrl);

    const response = await fetch(providerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.error(
        "[SILA API] Instagram V2 provider status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Instagram download service is temporarily unavailable."
      });
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "The download service returned an unsupported response."
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      result: data
    });

  } catch (error) {
    console.error(
      "[SILA API] Instagram Downloader V2:",
      error.message
    );

    const timeout =
      error.name === "TimeoutError" ||
      error.name === "AbortError";

    return res.status(timeout ? 504 : 502).json({
      success: false,
      creator: "Sila Tech",
      error: timeout
        ? "The request timed out. Please try again."
        : "Unable to process the Instagram media."
    });
  }
});

module.exports = router;