import dotenv from "dotenv";
dotenv.config();

import { authorize } from "./youtubeClient.js";

authorize().catch((err) => {
  console.error(`\n💥 Authorization failed: ${err.message}\n`);
  process.exit(1);
});
