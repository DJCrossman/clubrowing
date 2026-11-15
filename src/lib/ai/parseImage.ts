import { generateText } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { envVars } from "../env";

/**
 * Parses an image with a prompt using the Vercel AI Gateway model when one is
 * set, otherwise Ollama's vision model.
 * @param imageBase64 - Base64 encoded image string
 * @param prompt - Prompt with instructions and schema
 * @returns Raw text response from the model
 */
export async function parseImage({
	imageBase64,
	prompt,
}: {
	imageBase64: string;
	prompt: string;
}): Promise<string> {
	const ollama = createOllama({
		baseURL: envVars.OLLAMA_HOST,
		headers: {
			Authorization: `Bearer ${envVars.OLLAMA_API_KEY}`,
		},
	});

	const result = await generateText({
		model: envVars.AI_GATEWAY_MODEL ?? ollama(envVars.OLLAMA_MODEL),
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

	return result.text;
}
