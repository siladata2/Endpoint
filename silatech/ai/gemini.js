const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/gemini";

router.apiInfo = {
  name: "Gemini",
  description: "Ask questions and receive AI-generated responses.",
  category: "AI",
  method: "GET",
  endpoint: "/ai/gemini",
  parameters: [
    {
      name: "prompt",
      type: "string",
      required: true,
      description: "The question or message to send to the AI."
    }
  ],
  example: "/ai/gemini?prompt=Wewe%20ni%20nani"
};

router.get("/", async (req, res) => {
  try {
    const prompt = String(req.query.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide a prompt.",
        example: "/ai/gemini?prompt=Wewe%20ni%20nani"
      });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The prompt is too long. Maximum length is 5000 characters."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("prompt", prompt);

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
      console.error("[SILA AI GEMINI] Upstream status:", response.status);

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The AI service is temporarily unavailable."
      });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The AI service returned an unsupported response."
      });
    }

    let data;

    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The AI service returned invalid JSON."
      });
    }

    if (data.success === false || data.error) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The AI could not process your prompt."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Gemini",
      result:
        data.result ??
        data.data ??
        data.response ??
        data.message ??
        data
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI GEMINI]",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "The AI took too long to respond. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;