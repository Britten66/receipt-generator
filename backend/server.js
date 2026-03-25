import "dotenv/config";
import app from "./src/app.js";

console.log("DB:", process.env.DATABASE_URL);

import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config();

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`),
);
