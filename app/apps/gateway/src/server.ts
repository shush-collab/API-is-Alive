import { createApp } from "./app";
import { config } from "./config";

createApp().listen(config.port, () => {
  console.log(`Gateway running on http://localhost:${config.port}`);
});
