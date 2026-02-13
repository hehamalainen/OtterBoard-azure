const { chatCompletion } = require("../shared/openai");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

const stripFence = (text) =>
  text.replace(/```json\n?/gi, "").replace(/```/g, "").trim();

const buildThemesText = (themes) =>
  themes
    .map(
      (theme) =>
        `Theme: ${theme.title || "Untitled"}\nNotes: ${theme.notes?.map((note) => note.text).join(", ") || ""}`
    )
    .join("\n\n");

module.exports = async function (context, req) {
  try {
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const { themes = [], context: groundingContext = "" } = req.body || {};
    if (!Array.isArray(themes) || themes.length === 0) {
      context.res = errorResponse(400, "Themes are required.");
      return;
    }

    const prompt = `
Analyze these strategic themes and generate an action plan:
${buildThemesText(themes)}

Additional Context: ${groundingContext || "None provided"}

Identify:
1. BIG ROCKS: Major strategic initiatives that will have high impact (2-4 items)
2. QUICK WINS: Smaller tasks that can be done immediately for momentum (3-5 items)

OUTPUT as JSON:
{
  "priorities": [
    {"id": "unique-id", "title": "Action Item", "type": "Big Rock" or "Quick Win", "reasoning": "Why this matters", "sourceNoteIds": []}
  ]
}

Return ONLY valid JSON, no markdown formatting.
    `.trim();

    const responseText = await chatCompletion({
      deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
      messages: [
        { role: "system", content: "You are a strategic advisor focused on action plans." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      maxTokens: 1200
    });

    let plan = { priorities: [] };
    try {
      plan = JSON.parse(stripFence(responseText));
    } catch (error) {
      context.log.warn("Failed to parse action plan JSON, returning empty plan.");
    }

    context.res = jsonResponse(200, plan);
  } catch (error) {
    context.log.error("Action plan API error", error);
    context.res = errorResponse(500, "Action plan API error", error);
  }
};
