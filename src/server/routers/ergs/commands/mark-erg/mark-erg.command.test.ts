import { describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/server/context";
import { markErgCommand } from "./mark-erg.command";

describe("markErgCommand", () => {
	it("makes a club erg the viewer has rowed on their personal erg", async () => {
		const { context, updateMany } = createContext();

		await expect(markErgCommand({ id: "erg_1" }, context)).resolves.toBe(true);

		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: "erg_1",
				ownership: "club",
				activities: { some: { athleteId: "ath_1" } },
			},
			data: { ownership: "personal", ownerId: "ath_1" },
		});
	});

	it("answers not found for an erg that is already personal or that the viewer has not rowed on", async () => {
		const { context } = createContext({ count: 0 });

		await expect(
			markErgCommand({ id: "erg_1" }, context),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("needs an athlete record to mark an erg", async () => {
		const { context, updateMany } = createContext({ athlete: null });

		await expect(
			markErgCommand({ id: "erg_1" }, context),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Athlete account required",
		});
		expect(updateMany).not.toHaveBeenCalled();
	});
});

function createContext({
	athlete = { id: "ath_1" } as { id: string } | null,
	count = 1,
} = {}) {
	const updateMany = vi.fn(async (_args: unknown) => ({ count }));
	const context = {
		user: { id: "user_1", isAdmin: false },
		athlete,
		db: { erg: { updateMany } },
	} as unknown as ViewerContext;
	return { context, updateMany };
}
