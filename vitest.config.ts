import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		globals: true,
		include: ["src/**/*.test.{ts,tsx}"],
	},
	resolve: {
		alias: {
			"@/trpc": path.resolve(__dirname, "./src/server/infra/trpc"),
			"@/domain": path.resolve(__dirname, "./src/server/domain"),
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
