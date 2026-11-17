import { generateObject } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import type { z } from "zod";
import { envVars } from "../env";

/**
 * Parses an image with a prompt into an object matching the schema, using the
 * Vercel AI Gateway model when one is set, otherwise Ollama's vision model.
 * @param imageBase64 - Base64 encoded image string
 * @param prompt - Prompt with instructions
 * @param schema - The shape the model's answer is held to
 * @returns The model's answer, parsed by the schema
 */
export async function parseImage<T>({
	imageBase64,
	prompt,
	schema,
}: {
	imageBase64: string;
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
				content: [
					{ type: "text", text: prompt },
					{
						type: "image",
						image: imageBase64,
					},
				],
			},
		],
		temperature: 0.1,
		abortSignal: AbortSignal.timeout(120000), // 2 minute timeout (first load can be slow)
	});

	return result.object;
}
