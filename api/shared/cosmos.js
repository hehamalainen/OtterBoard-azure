const { CosmosClient } = require("@azure/cosmos");

let client;

const getContainer = () => {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("COSMOS_CONNECTION_STRING is not set");
  }

  if (!client) {
    client = new CosmosClient(connectionString);
  }

  const databaseId = process.env.COSMOS_DATABASE_ID || "boards";
  const containerId = process.env.COSMOS_CONTAINER_ID || "boards";
  return client.database(databaseId).container(containerId);
};

module.exports = {
  getContainer
};
