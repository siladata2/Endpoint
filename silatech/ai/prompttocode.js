const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/prompttocode";

router.apiInfo = {
  name: "Sila AI Prompt To Code",
  description: "Generate source code from a prompt in your chosen programming language.",
  category: "AI Developer Tools",
  method: "GET",
  endpoint: "/ai/prompttocode",
  parameters: [
    {
      name: "prompt",
      type: "string",
      required: true,
      description: "Describe the application or code you want to generate."
    },
    {
      name: "language",
      type: "string",
      required: true,
      description: "Programming language, such as HTML, JavaScript, or Python."
    }
  ],
  example: "/ai/prompttocode?prompt=Snake%20mini%20game&language=Html"
};

router.get("/", async (req, res) => {
  try {
    const prompt = String(req.query.prompt || "").trim();
    const language = String(req.query.language || "").trim();

    if (!prompt || !language) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Both prompt and language parameters are required.",
        example: "/ai/prompttocode?prompt=Snake%20mini%20game&language=Html"
      });
    }

    if (prompt.length > 3000 || language.length > 100) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The prompt or language parameter is too long."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("prompt", prompt);
    upstreamUrl.searchParams.set("language", language);

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
        "[SILA AI PROMPT TO CODE] Upstream status:",
        response.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Code generation is temporarily unavailable."
      });
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The code service returned an unsupported response."
      });
    }

    let data;

    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The code service returned invalid JSON."
      });
    }

    if (data.success === false || data.error) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Unable to generate code for this prompt."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Prompt To Code",
      prompt,
      language,
      result:
        data.result ??
        data.data ??
        data.response ??
        data.code ??
        data
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI PROMPT TO CODE]",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Code generation took too long. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;