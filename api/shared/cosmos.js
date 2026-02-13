const { CosmosClient } = require("@azure/cosmos");

let client;

const getContainer = () => {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Environment variable COSMOS_CONNECTION_STRING is missing in Azure Configuration.");
  }

  if (!client) {
    try {
      client = new CosmosClient(connectionString);
    } catch (err) {
      throw new Error(`Failed to initialize CosmosClient: ${err.message}`);
    }
  }

  const databaseId = process.env.COSMOS_DATABASE_ID || "boards";
  const containerId = process.env.COSMOS_CONTAINER_ID || "boards";
  return client.database(databaseId).container(containerId);
};

module.exports = {
  getContainer
};
