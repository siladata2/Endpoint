const express = require("express");

const router = express.Router();

const API_BASE = "https://prexzyapis.com/random";

// API 1: Blue Archive
const blueArchiveInfo = {
  name: "Sila Blue Archive",
  description: "Get random Blue Archive images.",
  category: "Random",
  method: "GET",
  endpoint: "/random/bluearchive",
  parameters: [],
  example: "/random/bluearchive"
};

// API 2: Boy Pic
const boyPicInfo = {
  name: "Sila Boy Pic",
  description: "Get random boy pictures.",
  category: "Random",
  method: "GET",
  endpoint: "/random/boypic",
  parameters: [],
  example: "/random/boypic"
};

// API 3: Random Car
const carInfo = {
  name: "Sila Random Car",
  description: "Get random car images.",
  category: "Random",
  method: "GET",
  endpoint: "/random/car",
  parameters: [],
  example: "/random/car"
};

// Hifadhi metadata zote kwa ajili ya UI loader.
router.apiInfo = [
  blueArchiveInfo,
  boyPicInfo,
  carInfo
];

// Function ya kuunda route kwa kila API.
function createRandomEndpoint(path, info) {
  router.get(path, async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const upstreamUrl = `${API_BASE}${path}`;

      const response = await fetch(upstreamUrl, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        console.error(
          `[${info.name}] Service status:`,
          response.status
        );

        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "The service is temporarily unavailable."
        });
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "Unsupported response format."
        });
      }

      const data = await response.json();

      if (data?.success === false || data?.error) {
        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "Unable to retrieve the requested result."
        });
      }

      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        name: info.name,
        result: data
      });
    } catch (error) {
      const timedOut = error.name === "AbortError";

      console.error(
        `[${info.name}]`,
        timedOut ? "Request timed out" : "Request failed"
      );

      return res.status(timedOut ? 504 : 500).json({
        success: false,
        creator: "Sila Tech",
        message: timedOut
          ? "Request timed out. Please try again."
          : "An unexpected error occurred."
      });
    } finally {
      clearTimeout(timeout);
    }
  });
}

// Sajili kila API kwa metadata yake.
createRandomEndpoint("/bluearchive", blueArchiveInfo);
createRandomEndpoint("/boypic", boyPicInfo);
createRandomEndpoint("/car", carInfo);

module.exports = router;