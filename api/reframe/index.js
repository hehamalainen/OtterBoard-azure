const { chatCompletion } = require("../shared/openai");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

const frameworkInstructions = {
  swot: "Reframe into SWOT Analysis: Strengths, Weaknesses, Opportunities, Threats",
  eisenhower:
    "Reframe into Eisenhower Matrix: Urgent/Important, Not Urgent/Important, Urgent/Not Important, Not Urgent/Not Important",
  roadmap:
    "Reframe into a Timeline Roadmap: Now (0-3 months), Next (3-6 months), Later (6-12 months), Future (12+ months)",
  bmc:
    "Reframe into Business Model Canvas sections: Value Propositions, Customer Segments, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure"
};

const buildThemesText = (themes) =>
  themes
    .map(
      (theme) =>
        `Theme: ${theme.title || "Untitled"}\nMeta-Insight: ${theme.metaInsight || ""}\nNotes: ${theme.notes?.map((note) => note.text).join(", ") || ""}`
    )
    .join("\n\n");

const stripFence = (text) =>
  text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();

module.exports = async function (context, req) {
  try {
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const { themes = [], framework } = req.body || {};
    if (!Array.isArray(themes) || themes.length === 0) {
      context.res = errorResponse(400, "Themes are required.");
      return;
    }

    const prompt = `
You have these strategic themes from a whiteboard:
${buildThemesText(themes)}

${frameworkInstructions[framework] || "Reframe into logical categories."}

OUTPUT as JSON array with format:
[{"title": "Category Name", "metaInsight": "One sentence insight", "notes": [{"id": "unique-id", "text": "note text"}]}]

Return ONLY valid JSON, no markdown formatting.
    `.trim();

    const responseText = await chatCompletion({
      deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
      messages: [
        { role: "system", content: "You are a strategic consulting assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      maxTokens: 1200
    });

    let parsedThemes = themes;
    try {
      parsedThemes = JSON.parse(stripFence(responseText));
    } catch (error) {
      context.log.warn("Failed to parse reframe JSON, returning original themes.");
    }

    context.res = jsonResponse(200, { themes: parsedThemes });
  } catch (error) {
    context.log.error("Reframe API error", error);
    context.res = errorResponse(500, error.message || "Server error");
  }
};
