#!/usr/bin/env bun

/**
 * Stand-in for the Vercel Blob API on a dummy instance, so it never talks to
 * a real Vercel store. Serves at VERCEL_BLOB_API_URL. Started by
 * docker/dev-entrypoint.sh in the app container; uploads are held in memory,
 * so they last only as long as the container.
 */

import { createServer, serve } from "@emulators/core";
import { vercelPlugin } from "@emulators/vercel";

const apiUrl = process.env.VERCEL_BLOB_API_URL;
if (!apiUrl) {
	console.error("❌ VERCEL_BLOB_API_URL is not set.");
	process.exit(1);
}
const { origin: baseUrl, hostname, port } = new URL(apiUrl);

const { app } = createServer(vercelPlugin, { port: Number(port), baseUrl });

serve({
	hostname,
	port: Number(port),
	fetch: (request) => {
		// The emulator refuses private uploads and never checks access on reads, so storing them as public behaves the same.
		// Set in place: under Bun, new Request(request, { headers }) never finishes reading the streamed upload body.
		if (request.headers.get("x-vercel-blob-access") === "private") {
			request.headers.set("x-vercel-blob-access", "public");
		}
		return app.fetch(request);
	},
});
console.log(`▶ Vercel Blob emulator on ${baseUrl}`);
