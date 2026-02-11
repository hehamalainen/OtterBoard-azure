const { getUser } = require("../shared/auth");
const { errorResponse } = require("../shared/http");

module.exports = async function (context, req) {
  const user = getUser(req);
  if (!user) {
    context.res = errorResponse(401, "Unauthorized");
    return;
  }

  context.res = errorResponse(
    501,
    "Video generation is not supported by Azure OpenAI in this deployment."
  );
};
