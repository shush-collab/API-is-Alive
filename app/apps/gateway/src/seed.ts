import { ApiKeyModel } from "./models/ApiKey";
import { hashApiKey } from "./services/apiKeys";
import { connectMongo, disconnectMongo } from "./services/mongo";

const seed = async () => {
  await connectMongo();

  const keys = [
    {
      name: "Demo Free Key",
      rawKey: "demo-free-key",
      plan: "free" as const,
    },
    {
      name: "Demo Pro Key",
      rawKey: "demo-pro-key",
      plan: "pro" as const,
    },
  ];

  for (const key of keys) {
    await ApiKeyModel.findOneAndUpdate(
      { keyHash: hashApiKey(key.rawKey) },
      {
        $set: {
          name: key.name,
          keyHash: hashApiKey(key.rawKey),
          plan: key.plan,
          isActive: true,
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    console.log(`[seed] ${key.name}: ${key.rawKey}`);
  }

  await disconnectMongo();
};

seed().catch(async (error) => {
  console.error("[seed] failed", error);
  await disconnectMongo();
  process.exit(1);
});
