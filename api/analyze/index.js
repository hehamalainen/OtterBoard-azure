const { randomUUID } = require("crypto");
const { chatCompletion } = require("../shared/openai");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

const stripFence = (text) =>
  text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim();

const parseThemes = (markdown) => {
  const themes = [];
  const sections = markdown.split("\n# ");

  sections.forEach((section) => {
    const trimmed = section.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith("strategic gap")) return;

    const lines = trimmed.split("\n");
    const title = lines[0].replace(/^#\s*/, "").trim();
    let metaInsight = "";
    const notes = [];

    lines.slice(1).forEach((line) => {
      const cleaned = line.trim();
      if (!cleaned) return;
      if (cleaned.toLowerCase().startsWith("meta-insight:")) {
        metaInsight = cleaned.split(":").slice(1).join(":").trim();
        return;
      }
      if (cleaned.startsWith("- ")) {
        notes.push({
          id: randomUUID(),
          text: cleaned.slice(2).trim()
        });
      }
    });

    if (notes.length) {
      themes.push({ title, metaInsight, notes });
    }
  });

  return themes;
};

const extractGaps = (markdown) => {
  const marker = "# Strategic Gap Analysis";
  if (!markdown.includes(marker)) return [];
  const section = markdown.split(marker)[1];
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
};

module.exports = async function (context, req) {
  try {
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const { images = [], mode, options = {} } = req.body || {};
    if (!Array.isArray(images) || images.length === 0) {
      context.res = errorResponse(400, "At least one image is required.");
      return;
    }
    if (!mode) {
      context.res = errorResponse(400, "Analysis mode is required.");
      return;
    }

    const visionDeployment = process.env.AZURE_OPENAI_VISION_DEPLOYMENT || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;

    if (mode === "strategy") {
      const systemInstruction = `
You are a Principal Management Consultant. Your goal is to digitize physical whiteboard sticky notes into a structured strategic roadmap.

RULES:
1. IDENTIFY THEMES: Group the notes into 5-7 logical themes (columns).
2. TRANSCRIBE: Capture every note's text accurately.
3. META-INSIGHT: For each theme, write a one-sentence "Meta-Insight" explaining the strategic importance.
4. COLOR AWARENESS: ${options.useColorCoding ? "Extract the color of each note (e.g. [Yellow], [Pink]). Notes about risks are usually Pink. Solutions are usually Green." : "Ignore colors."}
5. SPATIAL AWARENESS: ${options.respectLayout ? "Respect the physical columns and grouping of the whiteboard layout." : "Group purely by semantic content."}
6. GAP ANALYSIS: ${options.gapAnalysis ? "At the end, list 3-5 standard business areas that are missing from this board but should be considered." : "Skip gap analysis."}

OUTPUT FORMAT (Strict Markdown):
# [Theme Title]
Meta-Insight: [One sentence]
- [Note Text] (Include color if requested, e.g. "Fix sales comp [Pink]")
- [Another Note]

...repeat for each theme...

# Strategic Gap Analysis
- [Gap 1]
- [Gap 2]
      `.trim();

      const messages = [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: [
            { type: "text", text: "Digitize and synthesize these whiteboard photos into a strategic digital board." },
            ...images.map((img) => ({
              type: "image_url",
              image_url: { url: img }
            }))
          ]
        }
      ];

      const rawText = await chatCompletion({
        deployment: visionDeployment,
        messages,
        temperature: 0.1,
        maxTokens: 2000
      });

      const themes = parseThemes(rawText);
      const gaps = options.gapAnalysis ? extractGaps(rawText) : [];

      context.res = jsonResponse(200, {
        mode: "strategy",
        themes,
        strategicGaps: gaps,
        rawMarkdown: rawText
      });
      return;
    }

    if (mode === "process") {
      const systemInstruction = `
You are a Senior Systems Architect.
Your goal is to convert a hand-drawn diagram into executable Mermaid.js code.

RULES:
1. ANALYZE: Identify if this is a Flowchart, Sequence Diagram, State Diagram, or Class Diagram.
2. SYNTAX: Use standard Mermaid.js syntax.
3. LABELS: Preserve all text labels from the drawing.
4. STRUCTURE:
   - For flowcharts, use 'graph TD' (Top-Down) or 'graph LR' (Left-Right) based on the image.
   - Use correct shapes: [] for process, {} for decision, () for start/end.
5. OUTPUT: Return ONLY the raw mermaid code.
      `.trim();

      const messages = [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: [
            { type: "text", text: "Convert this diagram into Mermaid.js syntax." },
            ...images.map((img) => ({
              type: "image_url",
              image_url: { url: img }
            }))
          ]
        }
      ];

      const rawText = await chatCompletion({
        deployment: visionDeployment,
        messages,
        temperature: 0.1,
        maxTokens: 1200
      });

      const diagramCode = stripFence(rawText);
      context.res = jsonResponse(200, {
        mode: "process",
        themes: [],
        rawMarkdown: rawText,
        diagramCode
      });
      return;
    }

    if (mode === "wireframe") {
      const systemInstruction = `
You are a Frontend Expert specializing in Tailwind CSS.
Your goal is to convert a hand-drawn UI sketch into a production-ready HTML component.

RULES:
1. LAYOUT: Use Flexbox and Grid to match the sketched layout perfectly.
2. STYLING: Use Tailwind CSS classes for all styling. Make it look modern and clean.
3. CONTENT: Use specific text from the image where legible, otherwise use 'Lorem Ipsum'.
4. IMAGES: Use <img src="https://placehold.co/600x400" /> for any image placeholders drawn.
5. OUTPUT: Return ONLY the raw HTML string. Do not include <html> or <body> tags.
      `.trim();

      const messages = [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: [
            { type: "text", text: "Convert this UI sketch into HTML with Tailwind CSS." },
            ...images.map((img) => ({
              type: "image_url",
              image_url: { url: img }
            }))
          ]
        }
      ];

      const rawText = await chatCompletion({
        deployment: visionDeployment,
        messages,
        temperature: 0.1,
        maxTokens: 2000
      });

      const wireframeCode = stripFence(rawText);
      context.res = jsonResponse(200, {
        mode: "wireframe",
        themes: [],
        rawMarkdown: rawText,
        wireframeCode
      });
      return;
    }

    context.res = errorResponse(400, "Invalid mode.");
  } catch (error) {
    context.log.error("Analyze API error", error);
    context.res = errorResponse(500, error.message || "Server error");
  }
};
