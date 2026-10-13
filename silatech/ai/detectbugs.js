const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/detectbugs";

router.apiInfo = {
  name: "Sila AI Bug Detector",
  description: "Analyze code or text to identify potential bugs and issues.",
  category: "AI Developer Tools",
  method: "GET",
  endpoint: "/ai/detectbugs",
  parameters: [
    {
      name: "code",
      type: "string",
      required: true,
      description: "Code or text to analyze for potential bugs."
    }
  ],
  example: "/ai/detectbugs?code=console.log('Hello World')"
};

router.get("/", async (req, res) => {
  try {
    const code = String(req.query.code || "").trim();

    if (!code) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide code to analyze.",
        example: "/ai/detectbugs?code=console.log('Hello World')"
      });
    }

    if (code.length > 10000) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Input is too long. Maximum length is 10000 characters."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("code", code);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response;

    try {
      response = await fetch(upstreamUrl.toString(), {
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
        "[SILA AI BUG DETECTOR] Upstream status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Bug detection service is temporarily unavailable."
      });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The analysis service returned an unsupported response."
      });
    }

    let data;

    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The analysis service returned invalid JSON."
      });
    }

    if (data.success === false || data.error) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Unable to analyze the supplied code."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Bug Detector",
      result: data.result ?? data.data ?? data.response ?? data
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI BUG DETECTOR]",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Analysis took too long. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/detectbugs";

router.apiInfo = {
  name: "Sila AI Bug Detector",
  description: "Analyze code or text to identify potential bugs and issues.",
  category: "AI Developer Tools",
  method: "GET",
  endpoint: "/ai/detectbugs",
  parameters: [
    {
      name: "code",
      type: "string",
      required: true,
      description: "Code or text to analyze for potential bugs."
    }
  ],
  example: "/ai/detectbugs?code=console.log('Hello World')"
};

router.get("/", async (req, res) => {
  try {
    const code = String(req.query.code || "").trim();

    if (!code) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide code to analyze.",
        example: "/ai/detectbugs?code=console.log('Hello World')"
      });
    }

    if (code.length > 10000) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Input is too long. Maximum length is 10000 characters."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("code", code);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response;

    try {
      response = await fetch(upstreamUrl.toString(), {
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
        "[SILA AI BUG DETECTOR] Upstream status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Bug detection service is temporarily unavailable."
      });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The analysis service returned an unsupported response."
      });
    }

    let data;

    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The analysis service returned invalid JSON."
      });
    }

    if (data.success === false || data.error) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Unable to analyze the supplied code."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Bug Detector",
      result: data.result ?? data.data ?? data.response ?? data
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI BUG DETECTOR]",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Analysis took too long. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;