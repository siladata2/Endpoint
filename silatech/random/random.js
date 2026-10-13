const express = require("express");

// ==========================================
// API 1: SILA BLUE ARCHIVE
// ==========================================

const blueArchiveRouter = express.Router();

blueArchiveRouter.apiInfo = {
  name: "Sila Blue Archive",
  description: "Get random Blue Archive images.",
  method: "GET",
  endpoint: "/random/bluearchive",
  parameters: []
};

blueArchiveRouter.get("/", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;

    try {
      response = await fetch(
        "https://prexzyapis.com/random/bluearchive",
        {
          headers: { Accept: "application/json" },
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Blue Archive service is unavailable."
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });
  } catch (error) {
    return res.status(error.name === "AbortError" ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: error.name === "AbortError"
        ? "Request timed out."
        : "Failed to retrieve Blue Archive images."
    });
  }
});


// ==========================================
// API 2: SILA BOY PIC
// ==========================================

const boyPicRouter = express.Router();

boyPicRouter.apiInfo = {
  name: "Sila Boy Pic",
  description: "Get random boy pictures.",
  method: "GET",
  endpoint: "/random/boypic",
  parameters: []
};

boyPicRouter.get("/", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;

    try {
      response = await fetch(
        "https://prexzyapis.com/random/boypic",
        {
          headers: { Accept: "application/json" },
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Boy Pic service is unavailable."
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });
  } catch (error) {
    return res.status(error.name === "AbortError" ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: error.name === "AbortError"
        ? "Request timed out."
        : "Failed to retrieve boy pictures."
    });
  }
});


// ==========================================
// API 3: SILA RANDOM CAR
// ==========================================

const carRouter = express.Router();

carRouter.apiInfo = {
  name: "Sila Random Car",
  description: "Get random car images.",
  method: "GET",
  endpoint: "/random/car",
  parameters: []
};

carRouter.get("/", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;

    try {
      response = await fetch(
        "https://prexzyapis.com/random/car",
        {
          headers: { Accept: "application/json" },
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        creator: "Sila Tech",
        message: "Random Car service is unavailable."
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      creator: "Sila Tech",
      result: data
    });
  } catch (error) {
    return res.status(error.name === "AbortError" ? 504 : 500).json({
      success: false,
      creator: "Sila Tech",
      message: error.name === "AbortError"
        ? "Request timed out."
        : "Failed to retrieve car images."
    });
  }
});


// ==========================================
// EXPORT ROUTERS
// ==========================================

module.exports = {
  blueArchiveRouter,
  boyPicRouter,
  carRouter
};