const fs = require("fs");
const admin = require("firebase-admin");
const { CosmosClient } = require("@azure/cosmos");

const loadServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (rawJson) {
    return JSON.parse(rawJson);
  }

  if (filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to authenticate."
  );
};

const normalizeUpdatedAt = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  return null;
};

const main = async () => {
  const serviceAccount = loadServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId
  });

  const firestore = admin.firestore();
  const sourceCollection = process.env.FIRESTORE_COLLECTION || "boards";

  const cosmosConnection = process.env.COSMOS_CONNECTION_STRING;
  if (!cosmosConnection) {
    throw new Error("COSMOS_CONNECTION_STRING is required.");
  }

  const databaseId = process.env.COSMOS_DATABASE_ID || "boards";
  const containerId = process.env.COSMOS_CONTAINER_ID || "boards";
  const cosmos = new CosmosClient(cosmosConnection);
  const container = cosmos.database(databaseId).container(containerId);

  const snapshot = await firestore.collection(sourceCollection).get();
  console.log(`Found ${snapshot.size} Firestore documents to migrate.`);

  let migrated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (!data.owner) {
      console.warn(`Skipping ${doc.id}: missing owner field.`);
      continue;
    }

    const updatedAt = normalizeUpdatedAt(data.updatedAt) || new Date().toISOString();
    const board = {
      id: doc.id,
      ...data,
      updatedAt
    };

    await container.items.upsert(board);
    migrated += 1;
    if (migrated % 25 === 0) {
      console.log(`Migrated ${migrated} boards...`);
    }
  }

  console.log(`Migration complete. Total migrated: ${migrated}`);
};

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
