const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/aiappgen";

router.apiInfo = {
  name: "Sila AI App Image Generator",
  description: "Generate AI images from text prompts.",
  category: "AI Image Generation",
  method: "GET",
  endpoint: "/ai/aiappgen",
  parameters: [
    {
      name: "prompt",
      type: "string",
      required: true,
      description: "Describe the image you want to generate."
    }
  ],
  example: "/ai/aiappgen?prompt=Lion%20and%20cat%20running"
};

router.get("/", async (req, res) => {
  try {
    const prompt = String(req.query.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide a prompt describing the image.",
        example: "/ai/aiappgen?prompt=Lion%20and%20cat%20running"
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Your prompt is too long. Please use fewer than 1000 characters."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("prompt", prompt);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let upstreamResponse;

    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const contentType =
      upstreamResponse.headers.get("content-type") || "";

    if (!upstreamResponse.ok) {
      console.error(
        "[SILA AI APP IMAGE GENERATOR] Request failed:",
        upstreamResponse.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Image generation is temporarily unavailable. Please try again."
      });
    }

    /*
     * If the upstream returns an image directly, forward the binary
     * image instead of converting it to text.
     */
    if (contentType.startsWith("image/")) {
      const imageBuffer = Buffer.from(
        await upstreamResponse.arrayBuffer()
      );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(imageBuffer);
    }

    const rawBody = await upstreamResponse.text();

    let data;

    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        return res.status(502).json({
          success: false,
          creator: "Sila Tech",
          message: "The image service returned an invalid response."
        });
      }
    } else {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "The image service returned an unsupported response format."
      });
    }

    /*
     * Return only the useful result.
     * Do not expose upstream creator/provider metadata.
     */
    const result =
      data.result ??
      data.data ??
      data.image ??
      data.url ??
      data.images ??
      null;

    if (data.success === false || data.error || result === null) {
      console.error(
        "[SILA AI APP IMAGE GENERATOR] Image generation did not return a result."
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Could not generate the image. Please try a different prompt."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI App Image Generator",
      prompt,
      result
    });

  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI APP IMAGE GENERATOR] Request error:",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Image generation took too long. Please try again."
        : "An unexpected error occurred while generating the image."
    });
  }
});

module.exports = router;