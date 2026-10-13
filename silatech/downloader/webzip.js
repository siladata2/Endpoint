const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Website ZIP Downloader",
  description: "Create a ZIP archive of a website you are authorized to save.",
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
        error: "Missing required parameter: url"
      });
    }

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
        error: "Only HTTP and HTTPS URLs are supported."
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
        error: "Please provide a valid public website URL."
      });
    }

    // Backend provider: haionekani kwenye public response.
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
        "[SILA API] Website ZIP request failed:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Website ZIP service is temporarily unavailable."
      });
    }

    const rawData = await response.json();

    if (!rawData || rawData.status !== true || !rawData.data) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        error: "Unable to create the website archive."
      });
    }

    // Rudisha fields zinazohitajika tu.
    // Usirudishe rawData nzima kwa sababu ina taarifa za provider.
    const cleanResult = {
      downloadUrl:
        typeof rawData.data.downloadUrl === "string"
          ? rawData.data.downloadUrl
          : null,

      copiedFilesAmount:
        Number.isFinite(Number(rawData.data.copiedFilesAmount))
          ? Number(rawData.data.copiedFilesAmount)
          : 0,

      originalUrl:
        typeof rawData.data.originalUrl === "string"
          ? rawData.data.originalUrl
          : parsedUrl.href
    };

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      result: cleanResult
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
        ? "The request timed out. Please try again."
        : "Unable to process the website archive."
    });
  }
});

module.exports = router;