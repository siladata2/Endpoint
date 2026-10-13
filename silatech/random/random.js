const express = require("express");

const router = express.Router();

const API_BASE = "https://prexzyapis.com/random";

const endpoints = [
  {
    path: "/bluearchive",
    name: "Sila Blue Archive",
    description: "Get a random Blue Archive image.",
    endpoint: "/random/bluearchive"
  },
  {
    path: "/boypic",
    name: "Sila Boy Pic",
    description: "Get a random boy picture.",
    endpoint: "/random/boypic"
  },
  {
    path: "/car",
    name: "Sila Random Car",
    description: "Get a random car image.",
    endpoint: "/random/car"
  }
];

// Metadata ya kila API kwa ajili ya mfumo wa UI.
router.apiInfo = endpoints.map((item) => ({
  name: item.name,
  description: item.description,
  category: "Random",
  method: "GET",
  endpoint: item.endpoint,
  parameters: [],
  example: item.endpoint
}));

// Kutengeneza route kwa kila API.
for (const item of endpoints) {
  router.get(item.path, async (req, res) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      let response;

      try {
        response = await fetch(`${API_BASE}${item.path}`, {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        console.error(
          `[${item.name}] Upstream status:`,
          response.status
        );

        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "The random image service is temporarily unavailable."
        });
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "The service returned an unsupported response."
        });
      }

      let data;

      try {
        data = await response.json();
      } catch {
        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "The service returned invalid JSON."
        });
      }

      if (data && (data.success === false || data.error)) {
        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "Unable to retrieve the requested result."
        });
      }

      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        name: item.name,
        result: data
      });
    } catch (error) {
      const timedOut = error?.name === "AbortError";

      console.error(
        `[${item.name}]`,
        timedOut ? "Request timed out" : "Request failed"
      );

      return res.status(timedOut ? 504 : 500).json({
        success: false,
        creator: "Sila Tech",
        message: timedOut
          ? "The request timed out. Please try again."
          : "An unexpected error occurred."
      });
    }
  });
}

module.exports = router;