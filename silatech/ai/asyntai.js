const express = require("express");

const router = express.Router();

const SYSTEM_PROMPT = `
You are SILA AI.

Your name is SILA AI.
You were created and developed by Sila Tech.
Sila Tech is your creator and developer.

When users ask who created you, who developed you,
who owns you, what your name is, or where you come from,
answer clearly:

"My name is SILA AI. I was created and developed by Sila Tech."

Do not claim that you were created by another company,
developer, platform, or person.

You are an AI assistant designed to help users with
questions, explanations, coding, ideas, and general tasks.

Keep your identity consistent as SILA AI.
`;

router.apiInfo = {
  name: "SILA AI",
  description: "SILA AI assistant powered by Sila Tech",
  method: "GET",
  parameters: [
    {
      name: "prompt",
      type: "text",
      required: true,
      placeholder: "Ask SILA AI anything..."
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const prompt = req.query.prompt;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: prompt"
      });
    }

    const finalPrompt = `${SYSTEM_PROMPT}

User message:
${prompt}
`;

    const upstreamUrl =
      `https://eliteprotech-apis.zone.id/ai/asyntai?prompt=${encodeURIComponent(finalPrompt)}`;

    const response = await fetch(upstreamUrl);

    const contentType =
      response.headers.get("content-type") || "";

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "Upstream AI request failed",
        status: response.status
      });
    }

    if (contentType.includes("application/json")) {
      const data = await response.json();

      return res.json(data);
    }

    const text = await response.text();

    return res.send(text);

  } catch (error) {
    console.error("SILA AI Error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to process SILA AI request"
    });
  }
});

module.exports = router;