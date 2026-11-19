import { describe, expect, it } from "vitest";
import { concept2StrokesSchema } from "./concept2Strokes.schema";

describe("concept2StrokesSchema", () => {
	it("reads the strokes Concept2 sends", () => {
		const strokes = [
			{ t: 0, d: 0, p: 1180, spm: 0, hr: 0 },
			{ t: 25, d: 107, p: 1172, spm: 24, hr: 131 },
		];
		expect(concept2StrokesSchema.parse(strokes)).toEqual(strokes);
	});

	it("reads a stroke without a heart rate as 0", () => {
		expect(
			concept2StrokesSchema.parse([{ t: 25, d: 107, p: 1172, spm: 24 }]),
		).toEqual([{ t: 25, d: 107, p: 1172, spm: 24, hr: 0 }]);
	});
});
