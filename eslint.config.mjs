import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTs, globalIgnores([".next/**", "src/generated/**", "next-env.d.ts"]),
  // The WhatsApp worker is plain Node: Baileys' useMultiFileAuthState is not a React hook.
  { files: ["whatsapp/**/*.mts"], rules: { "react-hooks/rules-of-hooks": "off" } }]);
