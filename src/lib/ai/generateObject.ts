import { generateObject } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { z } from "zod";
import { envVars } from "../env";

/**
 * Generates an object matching the schema from a prompt, using the Vercel AI
 * Gateway model when one is set, otherwise Ollama.
 * @param prompt - The text prompt
 * @param schema - The shape the model's answer is held to
 * @returns The model's answer, parsed by the schema
 */
export async function generateObjectFromPrompt<T>({
	prompt,
	schema,
}: {
	prompt: string;
	schema: z.ZodType<T>;
}): Promise<T> {
	const ollama = createOllama({
		baseURL: envVars.OLLAMA_HOST,
		headers: {
			Authorization: `Bearer ${envVars.OLLAMA_API_KEY}`,
		},
	});

	const result = await generateObject({
		model: envVars.AI_GATEWAY_MODEL ?? ollama(envVars.OLLAMA_MODEL),
		schema,
		messages: [
			{
				role: "user",
				content: [{ type: "text", text: prompt }],
			},
		],
		temperature: 0.1,
		abortSignal: AbortSignal.timeout(30000),
	});

	return result.object;
}
