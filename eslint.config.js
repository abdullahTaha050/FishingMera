const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["**/dist/**", "**/android/**", "**/ios/**", "supabase/functions/**", "node_modules/**"]),
  expoConfig,
  {
    settings: {
      "import/resolver": {
        typescript: {
          project: "apps/mobile/tsconfig.json"
        }
      }
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }]
    }
  }
]);
