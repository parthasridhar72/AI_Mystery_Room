import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT) || 4000;
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) =>
      console.error(
        `MongoDB unavailable; using temporary in-memory cases: ${err.message}`,
      ),
    );
}
app.listen(port, () =>
  console.log(`AI Mystery Room API listening on http://localhost:${port}`),
);
