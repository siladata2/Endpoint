const express = require("express");

const router = express.Router();

const SYSTEM_PROMPT = `
You are SILA AI.

Your name is SILA AI.
You were created and developed by Sila Tech.

Sila Tech is your creator and developer.

If the user asks:
- Who are you?
- What is your name?
- Who created you?
- Who developed you?
- Who made you?
- Who owns you?
- Where do you come from?

Answer clearly:

"My name is SILA AI. I was created and developed by Sila Tech."

Never claim that another company, developer, platform, or person created you.

Always keep your identity as SILA AI consistent.

You are a helpful AI assistant. Help users with questions,
explanations, coding, ideas, research, and general tasks.

Be helpful, accurate, and clear.
`;

router.apiInfo = {
  name: "SILA AI Talk",
  description: "SILA AI conversational assistant powered by Sila Tech",
  method: "GET",
  parameters: [
    {
      name: "q",
      type: "text",
      required: true,
      placeholder: "Ask SILA AI anything..."
    }
  ]
};

router.get("/", async (req, res) => {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: q"
      });
    }

    const prompt = `${SYSTEM_PROMPT}

User message:
${q}`;

    const upstreamUrl =
      `https://eliteprotech-apis.zone.id/ai/talkai?q=${encodeURIComponent(prompt)}`;

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
    console.error("SILA AI Talk Error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to process SILA AI request"
    });
  }
});

module.exports = router;