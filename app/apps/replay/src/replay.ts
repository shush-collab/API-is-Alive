import { credentialStuffing } from "./scenarios/credentialStuffing";
import { normal } from "./scenarios/normal";
import { scraper } from "./scenarios/scraper";
import { suspicious } from "./scenarios/suspicious";

const scenarios = { normal, scraper, credentialStuffing, suspicious };
const name = (process.argv[2] ?? "normal") as keyof typeof scenarios;
const scenario = scenarios[name];

if (!scenario) {
  console.error(`Unknown scenario: ${name}`);
  process.exit(1);
}

scenario().catch((error) => {
  console.error(error);
  process.exit(1);
});
