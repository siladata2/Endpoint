const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/genimage";

router.apiInfo = {
  name: "Sila AI Image Generator",
  description: "Generate images from text prompts using AI.",
  category: "AI Image",
  method: "GET",
  endpoint: "/ai/genimage",
  parameters: [
    {
      name: "prompt",
      type: "string",
      required: true,
      description: "Describe the image you want to generate."
    }
  ],
  example: "/ai/genimage?prompt=Create%20a%20logo%20named%20Sila%20Tech"
};

router.get("/", async (req, res) => {
  try {
    const prompt = String(req.query.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide a prompt describing the image.",
        example: "/ai/genimage?prompt=Create%20a%20logo%20named%20Sila%20Tech"
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The prompt is too long. Maximum length is 2000 characters."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("prompt", prompt);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let response;

    try {
      response = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json, image/*"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("[SILA AI IMAGE GENERATOR] Upstream status:", response.status);

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Image generation is temporarily unavailable."
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // Forward the generated image if the service returns binary image data.
    if (contentType.startsWith("image/")) {
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(imageBuffer);
    }

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The image service returned an unsupported response."
      });
    }

    let data;

    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The image service returned invalid JSON."
      });
    }

    if (data.success === false || data.error) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Unable to generate the image. Please try again."
      });
    }

    const result =
      data.result ??
      data.data ??
      data.image ??
      data.url ??
      data.images ??
      null;

    if (result === null) {
      console.error("[SILA AI IMAGE GENERATOR] No image result found.");

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "No generated image was returned."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Image Generator",
      result
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI IMAGE GENERATOR]",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Image generation took too long. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;