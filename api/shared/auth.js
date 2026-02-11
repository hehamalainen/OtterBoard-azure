const getClientPrincipal = (req) => {
  const header = req.headers["x-ms-client-principal"];
  if (!header) return null;
  const decoded = Buffer.from(header, "base64").toString("utf-8");
  try {
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

const getUser = (req) => {
  const principal = getClientPrincipal(req);
  if (!principal || !principal.userId) return null;
  const email = principal.userDetails || "";
  return {
    id: principal.userId,
    email,
    identityProvider: principal.identityProvider || "",
    roles: principal.userRoles || []
  };
};

module.exports = {
  getUser
};
