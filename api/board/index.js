const { getContainer } = require("../shared/cosmos");
const { getUser } = require("../shared/auth");
const { jsonResponse, errorResponse } = require("../shared/http");

const fetchBoard = async (container, id, user) => {
  const hasEmail = Boolean(user.email);
  const querySpec = {
    query: `SELECT * FROM c WHERE c.id = @id AND (c.owner = @owner${hasEmail ? " OR ARRAY_CONTAINS(c.collaborators, @email, true)" : ""})`,
    parameters: [
      { name: "@id", value: id },
      { name: "@owner", value: user.id },
      ...(hasEmail ? [{ name: "@email", value: user.email }] : [])
    ]
  };

  const { resources } = await container.items
    .query(querySpec, { enableCrossPartitionQuery: true })
    .fetchAll();
  return resources[0];
};

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

    const container = getContainer();
    const board = await fetchBoard(container, boardId, user);

    if (!board) {
      context.res = errorResponse(404, "Board not found");
      return;
    }

    if (req.method === "GET") {
      context.res = jsonResponse(200, board);
      return;
    }

    if (req.method === "PATCH") {
      const updates = req.body || {};
      const updatedBoard = {
        ...board,
        updatedAt: new Date().toISOString()
      };

      if (typeof updates.result !== "undefined") {
        updatedBoard.result = updates.result;
      }

      if (typeof updates.title === "string" && updates.title.trim()) {
        updatedBoard.title = updates.title.trim();
      }

      await container.items.upsert(updatedBoard);
      context.res = jsonResponse(200, updatedBoard);
      return;
    }

    if (req.method === "DELETE") {
      if (board.owner !== user.id) {
        context.res = errorResponse(403, "Only owners can delete boards");
        return;
      }

      await container.item(board.id, board.owner).delete();
      context.res = jsonResponse(204, {});
      return;
    }

    context.res = errorResponse(405, "Method not allowed");
  } catch (error) {
    context.log.error("Board API error", error);
    context.res = errorResponse(500, "Board API error", error);
  }
};
