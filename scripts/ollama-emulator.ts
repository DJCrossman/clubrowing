#!/usr/bin/env bun

/**
 * Stand-in for Ollama on a dummy instance, so the e2e suite gets the same
 * answer every time and no model runs. Serves /chat, the only endpoint
 * ollama-ai-provider-v2 calls, at OLLAMA_HOST. Started by
 * docker/dev-entrypoint.sh in the app container. It knows only the requests
 * the suite sends; anything else gets an error that says so.
 */

const host = process.env.OLLAMA_HOST;
if (!host) {
	console.error("❌ OLLAMA_HOST is not set.");
	process.exit(1);
}
const { port, pathname } = new URL(host);

Bun.serve({
	// Loopback only: the app in this container is the one caller.
	hostname: "127.0.0.1",
	port: Number(port),
	fetch: async (request) => {
		if (
			request.method !== "POST" ||
			new URL(request.url).pathname !== `${pathname}/chat`
		) {
			return Response.json(
				{
					error: {
						message: `The Ollama emulator only answers POST ${pathname}/chat.`,
					},
				},
				{ status: 404 },
			);
		}
		const { model, messages } = await request.json();
		const prompt: string = messages.at(-1)?.content ?? "";
		// The app puts the coach's request or the workout description after its instructions, so the end of the prompt picks the answer.
		const answer = [
			{
				// schedule.spec.ts: a coach creates a run of weekly training events without workouts from a prompt
				request: "Placeholder session every Wednesday at 6:00 am",
				answer: {
					events: [
						{
							type: "training",
							title: "Placeholder session",
							days: ["Wednesday"],
							allDay: false,
							startTime: "06:00",
						},
					],
				},
			},
			{
				// schedule.spec.ts: a coach's prompt gives its workout to an empty training event at the same time
				request: "3x1000m @ R20, R22, R24",
				answer: {
					workoutType: "distance",
					distance: 3000,
					intervalCount: 3,
					fragments: [20, 22, 24].map((rate) => ({
						rate,
						distance: 1000,
						relativeTo: "2K",
						relativeSplitMs: 0,
					})),
				},
			},
		].find((canned) => prompt.endsWith(canned.request))?.answer;
		if (!answer) {
			// The error shape ollama-ai-provider-v2 reads its message from, and a 4xx, which the AI SDK doesn't retry.
			return Response.json(
				{
					error: {
						message: `The Ollama emulator has no answer for this prompt. Add one to scripts/ollama-emulator.ts: …${prompt.slice(-200)}`,
					},
				},
				{ status: 404 },
			);
		}
		return Response.json({
			model,
			created_at: new Date().toISOString(),
			done: true,
			done_reason: "stop",
			message: { role: "assistant", content: JSON.stringify(answer) },
		});
	},
});
console.log(`▶ Ollama emulator on ${host}`);
