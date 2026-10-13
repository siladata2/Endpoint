const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "TikTok Downloader",
  description: "Retrieve TikTok video download information.",
  method: "GET",
  parameters: [
    {
      name: "url",
      type: "text",
      required: true,
      placeholder: "Paste TikTok video URL"
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
        usage: "/download/tiktok?url=TIKTOK_VIDEO_URL"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(videoUrl);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid TikTok URL."
      });
    }

    const allowedHosts = [
      "tiktok.com",
      "www.tiktok.com",
      "m.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com"
    ];

    const hostname = parsedUrl.hostname.toLowerCase();

    if (
      !allowedHosts.includes(hostname) &&
      !hostname.endsWith(".tiktok.com")
    ) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Only TikTok URLs are supported."
      });
    }

    // Provider URL inabaki backend pekee.
    const providerUrl = new URL(
      "https://prexzyapis.com/download/tiktok"
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
        "[SILA API] TikTok provider status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "TikTok download service is temporarily unavailable."
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
      "[SILA API] TikTok Downloader:",
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
        : "Unable to process the TikTok video."
    });
  }
});

module.exports = router;