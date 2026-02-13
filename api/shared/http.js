const jsonResponse = (status, body) => ({
  status,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json"
  }
});

const errorResponse = (status, message, error = null) => {
  const body = { error: message };
  if (error) {
    try {
      body.details = error.message || String(error);
      if (error.stack) body.stack = error.stack;
      if (error.code) body.code = error.code;
    } catch (e) {
      body.details = "Error occurred but could not be fully serialized.";
    }
  }
  return jsonResponse(status, body);
};

module.exports = {
  jsonResponse,
  errorResponse
};
