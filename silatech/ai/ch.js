const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/ch";

router.apiInfo = {
  name: "Sila AI Chat",
  description: "Chat with Sila AI.",
  category: "AI",
  method: "GET",
  endpoint: "/ai/ch",
  parameters: [
    {
      name: "q",
      type: "string",
      required: true,
      description: "Message or question to send to the AI."
    }
  ],
  example: "/ai/ch?q=Hi"
};

router.get("/", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide a message using the q parameter.",
        example: "/ai/ch?q=Hi"
      });
    }

    if (q.length > 5000) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Your message is too long. Maximum length is 5000 characters."
      });
    }

    const url = new URL(API_URL);
    url.searchParams.set("q", q);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response;

    try {
      response = await fetch(url.toString(), {
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
        message: "The AI could not process your message."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Chat",
      result: data.result ?? data.data ?? data.response ?? data.message ?? data
    });

  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI CHAT]",
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