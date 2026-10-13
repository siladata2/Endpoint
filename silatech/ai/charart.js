const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/charart";

router.apiInfo = {
  name: "Sila AI CharArt",
  description: "Edit and transform images using AI.",
  category: "AI Image",
  method: "GET",
  endpoint: "/ai/charart",
  parameters: [
    {
      name: "prompt",
      type: "string",
      required: true,
      description: "Instructions describing how to edit the image."
    },
    {
      name: "image",
      type: "string",
      required: true,
      description: "Publicly accessible HTTPS image URL."
    }
  ],
  example:
    "/ai/charart?prompt=Add%20the%20Tanzanian%20flag%20logo&image=https%3A%2F%2Fi.ibb.co%2FmVrdcYtB%2Fsilatechbot.jpg"
};

router.get("/", async (req, res) => {
  try {
    const prompt = String(req.query.prompt || "").trim();
    const image = String(req.query.image || "").trim();

    if (!prompt || !image) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Both prompt and image parameters are required.",
        example:
          "/ai/charart?prompt=Add%20the%20Tanzanian%20flag%20logo&image=https%3A%2F%2Fi.ibb.co%2FmVrdcYtB%2Fsilatechbot.jpg"
      });
    }

    if (prompt.length > 2000 || image.length > 2048) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The prompt or image URL exceeds the allowed length."
      });
    }

    let parsedImage;

    try {
      parsedImage = new URL(image);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide a valid image URL."
      });
    }

    if (parsedImage.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The image URL must use HTTPS."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("prompt", prompt);
    upstreamUrl.searchParams.set("image", image);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

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
      console.error("[SILA AI CHARART] Upstream status:", response.status);

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Image editing is temporarily unavailable."
      });
    }

    const contentType = response.headers.get("content-type") || "";

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
        message: "Unable to edit the image. Please try again."
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
      console.error("[SILA AI CHARART] No result found in response.");

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "No edited image was returned."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI CharArt",
      result
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI CHARART]",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Image editing took too long. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;