const { imageGeneration } = require("../shared/openai");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

module.exports = async function (context, req) {
  try {
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      context.res = errorResponse(400, "Prompt is required.");
      return;
    }

    const imageUrl = await imageGeneration({
      deployment: process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT,
      prompt
    });

    context.res = jsonResponse(200, { imageUrl });
  } catch (error) {
    context.log.error("Generate image API error", error);
    context.res = errorResponse(500, error.message || "Server error");
  }
};
