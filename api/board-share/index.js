const { getContainer } = require("../shared/cosmos");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

module.exports = async function (context, req) {
  try {
    const user = getUser(req);
    if (!user) {
      context.res = errorResponse(401, "Unauthorized");
      return;
    }

    const boardId = context.bindingData.id;
    if (!boardId) {
      context.res = errorResponse(400, "Board ID is required");
      return;
    }

    const email = (req.body?.email || "").trim().toLowerCase();
    if (!email) {
      context.res = errorResponse(400, "Collaborator email is required");
      return;
    }

    const container = getContainer();
    const { resources } = await container.items
      .query(
        {
          query: "SELECT * FROM c WHERE c.id = @id AND c.owner = @owner",
          parameters: [
            { name: "@id", value: boardId },
            { name: "@owner", value: user.id }
          ]
        },
        { enableCrossPartitionQuery: true }
      )
      .fetchAll();

    const board = resources[0];
    if (!board) {
      context.res = errorResponse(404, "Board not found or access denied");
      return;
    }

    const collaborators = Array.from(new Set([...(board.collaborators || []), email]));
    const updatedBoard = {
      ...board,
      collaborators,
      updatedAt: new Date().toISOString()
    };

    await container.items.upsert(updatedBoard);
    context.res = jsonResponse(200, updatedBoard);
  } catch (error) {
    context.log.error("Board share error", error);
    context.res = errorResponse(500, "Server error");
  }
};
