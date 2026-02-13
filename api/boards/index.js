module.exports = async function (context, req) {
  // 1. ABSOLUTELY MINIMAL PING (Zero Dependencies)
  if (req.headers["x-ping"]) {
    context.res = {
      status: 200,
      body: "pong-v3",
      headers: { "Content-Type": "text/plain" }
    };
    return;
  }

  try {
    // 2. LAZY LOADING (Try to load dependencies one by one)
    const { randomUUID } = require("crypto");
    const { getUser } = require("../shared/auth");
    const { jsonResponse, errorResponse } = require("../shared/http");

    let getContainer;
    try {
      getContainer = require("../shared/cosmos").getContainer;
    } catch (loadErr) {
      context.log.error("Failed to load cosmos module", loadErr);
      context.res = { status: 500, body: `Init Error: Cosmos module failed to load: ${loadErr.message}` };
      return;
    }
    if (!getContainer) {
      context.res = errorResponse(500, "Cosmos module failed to load");
      return;
    }
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const container = getContainer();

    if (req.method === "GET") {
      const hasEmail = Boolean(user.email);
      const querySpec = {
        query: `SELECT * FROM c WHERE c.owner = @owner${hasEmail ? " OR ARRAY_CONTAINS(c.collaborators, @email, true)" : ""}`,
        parameters: [
          { name: "@owner", value: user.id },
          ...(hasEmail ? [{ name: "@email", value: user.email }] : [])
        ]
      };

      const { resources } = await container.items
        .query(querySpec, { enableCrossPartitionQuery: true })
        .fetchAll();

      context.res = jsonResponse(200, { boards: resources });
      return;
    }

    if (req.method === "POST") {
      const title = (req.body?.title || "").trim();
      if (!title) {
        context.res = errorResponse(400, "Title is required");
        return;
      }

      const board = {
        id: randomUUID(),
        title,
        owner: user.id,
        ownerEmail: user.email,
        collaborators: [],
        updatedAt: new Date().toISOString(),
        result: null
      };

      await container.items.create(board);
      context.res = jsonResponse(201, board);
      return;
    }

    context.res = errorResponse(405, "Method not allowed");
  } catch (error) {
    context.log.error("Boards API error", error.message, error.stack);
    context.res = errorResponse(500, "Boards API error", error);
  }
};
