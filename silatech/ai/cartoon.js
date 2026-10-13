const express = require("express");

const router = express.Router();

const API_URL = "https://prexzyapis.com/ai/cartoon";

router.apiInfo = {
  name: "Sila AI Cartoon",
  description: "Convert an image into a cartoon using AI.",
  category: "AI Image",
  method: "GET",
  endpoint: "/ai/cartoon",
  parameters: [
    {
      name: "imageurl",
      type: "string",
      required: true,
      description: "Publicly accessible URL of the image."
    }
  ],
  example:
    "/ai/cartoon?imageurl=https%3A%2F%2Fi.ibb.co%2FmVrdcYtB%2Fsilatechbot.jpg"
};

router.get("/", async (req, res) => {
  try {
    const imageurl = String(req.query.imageurl || "").trim();

    if (!imageurl) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide an image URL.",
        example:
          "/ai/cartoon?imageurl=https%3A%2F%2Fi.ibb.co%2FmVrdcYtB%2Fsilatechbot.jpg"
      });
    }

    if (imageurl.length > 2048) {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The image URL is too long."
      });
    }

    let parsedImageUrl;

    try {
      parsedImageUrl = new URL(imageurl);
    } catch {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "Please provide a valid image URL."
      });
    }

    if (parsedImageUrl.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        creator: "Sila Tech",
        message: "The image URL must use HTTPS."
      });
    }

    const upstreamUrl = new URL(API_URL);
    upstreamUrl.searchParams.set("imageurl", imageurl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let upstreamResponse;

    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json, image/*"
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstreamResponse.ok) {
      console.error(
        "[SILA AI CARTOON] Request failed:",
        upstreamResponse.status
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Cartoon generation is temporarily unavailable."
      });
    }

    const contentType =
      upstreamResponse.headers.get("content-type") || "";

    // Handle a direct image response without converting binary data to text.
    if (contentType.startsWith("image/")) {
      const imageBuffer = Buffer.from(
        await upstreamResponse.arrayBuffer()
      );

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
      data = await upstreamResponse.json();
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
        message: "Unable to convert this image into a cartoon."
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
      console.error(
        "[SILA AI CARTOON] No image result found in response."
      );

      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "No cartoon image was returned."
      });
    }

    return res.status(200).json({
      success: true,
      creator: "Sila Tech",
      ai: "Sila AI Cartoon",
      result
    });

  } catch (error) {
    const timedOut = error?.name === "AbortError";

    console.error(
      "[SILA AI CARTOON] Request error:",
      timedOut ? "Request timed out" : "Request failed"
    );

    return res.status(timedOut ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: timedOut
        ? "Cartoon generation took too long. Please try again."
        : "An unexpected error occurred."
    });
  }
});

module.exports = router;