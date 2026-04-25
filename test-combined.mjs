import { runCombined } from "./routes/combined.mjs";

runCombined()
  .then(() => {
    console.log("Combined run finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Combined run failed:", err);
    process.exit(1);
  });
