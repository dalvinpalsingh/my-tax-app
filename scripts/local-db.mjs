import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { localDatabaseId } from "./local-simulator.ts";
import { localStateRoot } from "./local-state.ts";

const commands = {
  migrate: ["migrations", "apply"],
  seed: ["raw"],
};
const action = process.argv[2];
if (action !== "migrate" && action !== "seed") {
  throw new Error("Expected migrate or seed.");
}

const require = createRequire(import.meta.url);
const cf = join(dirname(require.resolve("cf/package.json")), "bin/cf");
const result = spawnSync(
  process.execPath,
  [
    cf,
    "d1",
    ...commands[action],
    localDatabaseId,
    "--local",
    "--persist-to",
    localStateRoot(),
    ...(action === "seed" ? ["--batch", "@fixtures/accounts.json"] : []),
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
