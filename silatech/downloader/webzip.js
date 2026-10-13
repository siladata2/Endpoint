const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Website ZIP Downloader",
  description: "Retrieve website export information as a ZIP archive.",
  method: "GET",
  parameters: [
    {
      name: "url",
      type: "text",
      required: true,
      placeholder: "silatech.site"
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    let website = String(req.query.url || "").trim();

    if (!website) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Missing required parameter: url",
        usage: "/download/saveweb2zip?url=silatech.site"
      });
    }

    // Ruhusu domain yenyewe au URL kamili ya HTTP/HTTPS.
    if (!/^https?:\/\//i.test(website)) {
      website = `https://${website}`;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(website);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid website URL."
      });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Only HTTP and HTTPS website URLs are supported."
      });
    }

    if (
      parsedUrl.username ||
      parsedUrl.password ||
      !parsedUrl.hostname.includes(".")
    ) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        error: "Please provide a valid public website domain."
      });
    }

    // Provider inabaki backend pekee.
    const providerUrl = new URL(
      "https://prexzyapis.com/download/saveweb2zip"
    );

    providerUrl.searchParams.set("url", parsedUrl.href);

    const response = await fetch(providerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      console.error(
        "[SILA API] Website ZIP provider status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Website export service is temporarily unavailable."
      });
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "The export service returned an unsupported response."
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
      "[SILA API] Website ZIP Downloader:",
      error.message
    );

    const timeout =
      error.name === "TimeoutError" ||
      error.name === "AbortError";

    return res.status(timeout ? 504 : 502).json({
      success: false,
      creator: "Sila Tech",
      error: timeout
        ? "The website export request timed out."
        : "Unable to export the website right now."
    });
  }
});

module.exports = router;