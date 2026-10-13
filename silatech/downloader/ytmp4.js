const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "YouTube to MP4",
  description: "Retrieve video download information from YouTube.",
  method: "GET",
  parameters: [
    {
      name: "url",
      type: "text",
      required: true,
      placeholder: "Paste YouTube video URL"
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
        usage: "/download/ytmp4?url=YOUTUBE_VIDEO_URL"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(videoUrl);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid YouTube URL."
      });
    }

    const allowedHosts = [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtu.be"
    ];

    if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Only YouTube URLs are supported."
      });
    }

    // Provider details remain on the backend.
    const providerUrl = new URL(
      "https://prexzyapis.com/download/ytmp4"
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
        "[SILA API] YouTube MP4 provider status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Video download service is temporarily unavailable."
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
      "[SILA API] YouTube MP4:",
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
        : "Unable to process the video request."
    });
  }
});

module.exports = router;