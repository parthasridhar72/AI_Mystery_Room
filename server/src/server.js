import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI;

async function startServer() {
  if (process.env.NODE_ENV === "production" && !mongoUri) {
    throw new Error("MONGODB_URI must be configured in production.");
  }

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected");
    } catch (error) {
      if (process.env.NODE_ENV === "production") throw error;
      console.error(
        `MongoDB unavailable; using temporary in-memory cases: ${error.message}`,
      );
    }
  }

  app.listen(port, "0.0.0.0", () =>
    console.log(`AI Mystery Room API listening on port ${port}`),
  );
}

startServer().catch((error) => {
  console.error(`Could not start AI Mystery Room API: ${error.message}`);
  process.exitCode = 1;
});
