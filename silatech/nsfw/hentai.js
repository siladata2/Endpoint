const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Anh Hentai",
  description: "Random Anh Hentai - 18+",
  method: "GET",
  parameters: []
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch("https://prexzyapis.com/random/anhhentai", {
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`Upstream ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    // 1. JSON
    if (contentType.includes("application/json")) {
      try {
        const text = buffer.toString("utf-8");
        const data = JSON.parse(text);
        return res.status(200).json({
          success: true,
          creator: "Sila Tech",
          result: data
        });
      } catch {
        // sio json halisi, endelea kama file
      }
    }

    // 2. IMAGE
    if (contentType.includes("image")) {
      let ext = "jpg";
      if (contentType.includes("png")) ext = "png";
      if (contentType.includes("webp")) ext = "webp";
      if (contentType.includes("gif")) ext = "gif";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="result.${ext}"`);
      return res.status(200).end(buffer);
    }

    // 3. VIDEO / GIF / OTHERS
    if (contentType.includes("video") || contentType.includes("octet") || contentType.includes("gif")) {
      const isGif = contentType.includes("gif");
      res.setHeader("Content-Type", isGif ? "image/gif" : contentType || "video/mp4");
      res.setHeader("Content-Disposition", `inline; filename="result.${isGif ? "gif" : "mp4"}"`);
      return res.status(200).end(buffer);
    }

    // 4. Fallback - jaribu kutambua kwa buffer
    // kama buffer inaanza na {" -> JSON
    const start = buffer.toString("utf-8", 0, 20).trim();
    if (start.startsWith("{") || start.startsWith("[")) {
      const data = JSON.parse(buffer.toString("utf-8"));
      return res.status(200).json({
        success: true,
        creator: "Sila Tech",
        result: data
      });
    }

    // haijatambulika - tuma kama binary tu
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    return res.status(200).end(buffer);

  } catch (error) {
    console.error("[SILA API] annhentai:", error.message);
    return res.status(502).json({
      success: false,
      creator: "Sila Tech",
      error: "Unable to fetch right now."
    });
  }
});

module.exports = router;