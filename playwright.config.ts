import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
	throw new Error(
		"E2E_BASE_URL is not set. Run the suite against a dummy instance with `bun run instance:e2e`.",
	);
}

const recordingSpecs = /\/e2e\/recordings\/.+\.spec\.ts$/;

export default defineConfig({
	testDir: "e2e",
	outputDir: "e2e/.output",
	fullyParallel: true,
	expect: { timeout: 15_000 },
	use: {
		baseURL,
		headless: true,
	},
	projects: [
		// A test that needs only one width carries that project's tag (`@desktop` or `@phone`); untagged tests run on both.
		{
			name: "desktop",
			testIgnore: recordingSpecs,
			grepInvert: /@phone/,
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
			},
		},
		{
			name: "phone",
			testIgnore: recordingSpecs,
			grepInvert: /@desktop/,
			use: {
				...devices["Pixel 7"],
				viewport: { width: 390, height: 844 },
			},
		},
		// Throwaway before/after specs in e2e/recordings/ record every test; the committed suite records none.
		{
			name: "desktop-recording",
			testMatch: recordingSpecs,
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
				video: { mode: "on", size: { width: 1280, height: 800 } },
			},
		},
		{
			name: "phone-recording",
			testMatch: recordingSpecs,
			use: {
				...devices["Pixel 7"],
				viewport: { width: 390, height: 844 },
				video: { mode: "on", size: { width: 390, height: 844 } },
			},
		},
	],
});
