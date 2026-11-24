"use client";

import { useMutation } from "@tanstack/react-query";
import type { ParseDescriptionResult } from "@/app/api/v1/workouts/parse-description/route";

export function useReadWorkoutDescription() {
	const { mutateAsync, isPending } = useMutation({
		mutationFn: parseWorkoutDescription,
	});

	return {
		readWorkoutDescription: mutateAsync,
		isReadingWorkoutDescription: isPending,
	};
}

async function parseWorkoutDescription(
	description: string,
): Promise<ParseDescriptionResult> {
	const response = await fetch("/api/v1/workouts/parse-description", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ description }),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body?.error || "Failed to parse description");
	}
	return response.json();
}
