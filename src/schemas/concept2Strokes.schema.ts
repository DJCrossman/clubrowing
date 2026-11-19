import { z } from "zod";

// Concept2 sends tenths: `t` of a second, `d` of a metre, `p` of a second per
// 500 m. `hr` is 0 when no heart-rate belt was worn.
export const concept2StrokesSchema = z.array(
	z.object({
		t: z.number(),
		d: z.number(),
		p: z.number(),
		spm: z.number(),
		hr: z.number().default(0),
	}),
);

export type Concept2Strokes = z.infer<typeof concept2StrokesSchema>;
