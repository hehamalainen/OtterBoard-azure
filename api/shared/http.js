const jsonResponse = (status, body) => ({
  status,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json"
  }
});

const errorResponse = (status, message, error = null) => {
  const body = { error: message };
  if (error && (process.env.NODE_ENV === "development" || true)) { // Always include for now to debug
    body.details = error.message;
    body.stack = error.stack;
  }
  return jsonResponse(status, body);
};

module.exports = {
  jsonResponse,
  errorResponse
};
