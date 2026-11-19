import { describe, expect, it } from "vitest";
import { createErgSchema, updateErgSchema } from "./erg.schema.";

const erg = { name: "Erg 1", manufacturer: "concept2" } as const;

describe("erg ownership", () => {
	it("asks who owns a personal erg", () => {
		const result = createErgSchema.safeParse({
			...erg,
			ownership: "personal",
			ownerId: null,
		});

		expect(result.error?.issues).toMatchObject([
			{ path: ["ownerId"], message: "Choose who owns this erg" },
		]);
	});

	it("drops the owner from an erg that isn't personal", () => {
		expect(
			updateErgSchema.parse({
				...erg,
				id: "erg_1",
				ownership: "club",
				ownerId: "ath_1",
			}),
		).toMatchObject({ id: "erg_1", ownership: "club", ownerId: null });
	});
});
