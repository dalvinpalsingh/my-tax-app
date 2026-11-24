import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

export function localStateRoot() {
  const file = resolve(".env.local");
  const settings = existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {};
  const configured =
    process.env.MY_TAX_APP_LOCAL_STATE ?? settings.MY_TAX_APP_LOCAL_STATE;
  return resolve(configured?.trim() || ".cloudflare/state");
}
