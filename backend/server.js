import { createRequire } from "module";
const require = createRequire(import.meta.url);

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
