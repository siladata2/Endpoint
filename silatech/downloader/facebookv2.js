const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Facebook Downloader V2",
  description: "Download Facebook videos and retrieve available video information.",
  method: "GET",
  parameters: [
    {
      name: "url",
      type: "text",
      required: true,
      placeholder: "Paste Facebook video URL"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const videoUrl = String(req.query.url || "").trim();

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Missing required parameter: url",
        usage: "/download/facebookv2?url=FACEBOOK_VIDEO_URL"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(videoUrl);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid Facebook video URL."
      });
    }

    const allowedHosts = [
      "facebook.com",
      "www.facebook.com",
      "m.facebook.com",
      "web.facebook.com",
      "fb.watch"
    ];

    if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Only Facebook video URLs are supported."
      });
    }

    // Provider URL inabaki backend pekee.
    const providerUrl = new URL(
      "https://prexzyapis.com/download/facebookv2"
    );

    providerUrl.searchParams.set("url", videoUrl);

    const response = await fetch(providerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.error(
        "[SILA API] Facebook V2 provider status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Facebook download service is temporarily unavailable."
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
      "[SILA API] Facebook Downloader V2:",
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
        : "Unable to process the Facebook video."
    });
  }
});

module.exports = router;