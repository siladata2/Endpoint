const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Gif",
  description: "Random Gif - 18+",
  method: "GET",
  parameters: []
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch("https://prexzyapis.com/nsfw/gif", {
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`Upstream ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("application/json")) {
      try {
        const data = JSON.parse(buffer.toString("utf-8"));
        return res.status(200).json({
          success: true,
          creator: "Sila Tech",
          result: data
        });
      } catch {}
    }

    if (contentType.includes("image")) {
      let ext = "gif";
      if (contentType.includes("png")) ext = "png";
      if (contentType.includes("webp")) ext = "webp";
      if (contentType.includes("jpg") || contentType.includes("jpeg")) ext = "jpg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="result.${ext}"`);
      return res.status(200).end(buffer);
    }

    if (contentType.includes("video") || contentType.includes("octet")) {
      res.setHeader("Content-Type", contentType || "image/gif");
      res.setHeader("Content-Disposition", `inline; filename="result.gif"`);
      return res.status(200).end(buffer);
    }

    const start = buffer.toString("utf-8", 0, 20).trim();
    if (start.startsWith("{") || start.startsWith("[")) {
      const data = JSON.parse(buffer.toString("utf-8"));
      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    res.setHeader("Content-Type", contentType || "application/octet-stream");
    return res.status(200).end(buffer);

  } catch (error) {
    console.error("[SILA API] gif:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch right now."
    });
  }
});

module.exports = router;