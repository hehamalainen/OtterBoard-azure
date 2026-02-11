const jsonResponse = (status, body) => ({
  status,
  body: JSON.stringify(body),
  headers: {
    "Content-Type": "application/json"
  }
});

const errorResponse = (status, message) => jsonResponse(status, { error: message });

module.exports = {
  jsonResponse,
  errorResponse
};
