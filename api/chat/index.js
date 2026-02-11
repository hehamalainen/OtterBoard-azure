const { chatCompletion } = require("../shared/openai");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

const buildContextText = (contextData) => {
  if (!contextData?.themes) return "";
  return (
    "Whiteboard Context:\n" +
    contextData.themes
      .map(
        (theme) =>
          `Theme: ${theme.title || "Untitled"}\nMeta-Insight: ${theme.metaInsight || ""}\nNotes: ${theme.notes?.map((note) => note.text).join(", ") || ""}`
      )
      .join("\n\n")
  );
};

module.exports = async function (context, req) {
  try {
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const { message, context: boardContext } = req.body || {};
    if (!message) {
      context.res = errorResponse(400, "Message is required.");
      return;
    }

    const systemInstruction = `
You are the Otter Assistant, a helpful strategic consultant.
You have analyzed a whiteboard and the user is asking questions about it.

${buildContextText(boardContext)}

RULES:
1. Be concise and professional.
2. Use the context provided to answer questions accurately.
3. If something isn't on the board, say so, but offer a consultant's perspective if helpful.
    `.trim();

    const responseText = await chatCompletion({
      deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: `User message: ${message}` }
      ],
      temperature: 0.7,
      maxTokens: 800
    });

    context.res = jsonResponse(200, { text: responseText.trim() });
  } catch (error) {
    context.log.error("Chat API error", error);
    context.res = errorResponse(500, error.message || "Server error");
  }
};
