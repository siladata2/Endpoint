const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Facebook Downloader",
  description: "Fetch Facebook video download information.",
  method: "GET",
  parameters: [
    {
      name: "url",
      type: "text",
      required: true,
      placeholder: "Paste a Facebook video URL"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();

    if (!url) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Missing required parameter: url",
        usage: "/download/facebook?url=FACEBOOK_VIDEO_URL"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid URL."
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
        error: "Please provide a Facebook video URL."
      });
    }

    const apiUrl = new URL(
      "https://prexzyapis.com/download/facebook"
    );

    apiUrl.searchParams.set("url", url);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Facebook downloader provider failed.",
        upstreamStatus: response.status
      });
    }

    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    const result = await response.text();

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      result
    });

  } catch (error) {
    console.error(
      "[SILA API] Facebook Downloader:",
      error.message
    );

    const timeout =
      error.name === "TimeoutError" ||
      error.name === "AbortError";

    return res.status(timeout ? 504 : 502).json({
      success: false,
      creator: "Sila Tech",
      error: timeout
        ? "Request timed out. Please try again."
        : "Unable to process the request."
    });
  }
});

module.exports = router;