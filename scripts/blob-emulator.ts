#!/usr/bin/env bun

/**
 * Stand-in for the Vercel Blob API on a dummy instance, so it never talks to
 * a real Vercel store. Serves at VERCEL_BLOB_API_URL. Started by
 * docker/dev-entrypoint.sh in the app container; uploads are held in memory,
 * so they last only as long as the container.
 */

import {
	authMiddleware,
	cors,
	createApiErrorHandler,
	createErrorHandler,
	Hono,
	Store,
	serve,
	WebhookDispatcher,
} from "@emulators/core";
import { vercelPlugin } from "@emulators/vercel";

const apiUrl = process.env.VERCEL_BLOB_API_URL;
if (!apiUrl) {
	console.error("❌ VERCEL_BLOB_API_URL is not set.");
	process.exit(1);
}
const { origin: baseUrl, port } = new URL(apiUrl);

// createServer's app without its fixed cap of 5,000 requests an hour, which a few
// parallel e2e runs use up; past the cap every upload is refused with a 403.
const app = new Hono();
app.onError(createApiErrorHandler("https://emulate.dev/vercel"));
app.use("*", cors());
app.use("*", createErrorHandler("https://emulate.dev/vercel"));
app.use("*", authMiddleware(new Map()));
vercelPlugin.register(
	app,
	new Store(),
	new WebhookDispatcher(),
	baseUrl,
	new Map(),
);

serve({
	// All interfaces, so the port docker-compose.yml publishes reaches it.
	hostname: "0.0.0.0",
	port: Number(port),
	fetch: async (request) => {
		// The emulator has no /signed-token and signs nothing: the delegation carries only the scope presignUrl reads back.
		if (
			request.method === "POST" &&
			new URL(request.url).pathname === "/api/blob/signed-token"
		) {
			const {
				pathname,
				operations = ["get"],
				validUntil = Date.now() + 3_600_000,
			} = await request.json();
			return Response.json({
				delegationToken: `${Buffer.from(JSON.stringify({ storeId: "dummy", pathname, operations, validUntil })).toString("base64url")}.emulator`,
				clientSigningToken: "emulator",
				validUntil,
			});
		}
		// The emulator refuses private uploads and never checks access on reads, so storing them as public behaves the same.
		// Set in place: under Bun, new Request(request, { headers }) never finishes reading the streamed upload body.
		if (request.headers.get("x-vercel-blob-access") === "private") {
			request.headers.set("x-vercel-blob-access", "public");
		}
		return app.fetch(request);
	},
});
console.log(`▶ Vercel Blob emulator on ${baseUrl}`);
