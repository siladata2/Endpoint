const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Sila Blue Archive",
  description: "Get random Blue Archive images.",
  method: "GET",
  endpoint: "/random/bluearchive",
  parameters: [],
  example: "/random/bluearchive"
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch(
      "https://prexzyapis.com/random/bluearchive",
      {
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Blue Archive service is temporarily unavailable."
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });
  } catch (error) {
    return res.status(error.name === "TimeoutError" ||
      error.name === "AbortError" ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: "Failed to retrieve Blue Archive images."
    });
  }
});

module.exports = router;

//sila

const express = require("express");
const router = express.Router();

router.apiInfo = {
  name: "Sila Boy Pic",
  description: "Get random boy pictures.",
  method: "GET",
  endpoint: "/random/boypic",
  parameters: [],
  example: "/random/boypic"
};

router.get("/", async (req, res) => {
  try {
    const response = await fetch(
      "https://prexzyapis.com/random/boypic",
      {
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Boy Pic service is temporarily unavailable."
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });
  } catch (error) {
    return res.status(error.name === "TimeoutError" ||
      error.name === "AbortError" ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: "Failed to retrieve boy pictures."
    });
  }
});

module.exports = router;