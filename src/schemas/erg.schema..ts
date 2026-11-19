import { z } from "zod";

const ergFieldsSchema = z.object({
	name: z.string().min(1, { message: "Name is required" }),
	manufacturer: z.literal("concept2"),
	firmwareVersion: z.string().optional(),
	hardwareVersion: z.string().optional(),
	serialNumber: z.string().optional(),
	dataCode: z.string().optional(),
	ownership: z.enum(["club", "personal"]),
	ownerId: z.string().nullable(),
});

export const createErgSchema = ergFieldsSchema.transform(
	onlyPersonalErgsHaveAnOwner,
);

export type CreateErg = z.infer<typeof createErgSchema>;

export const updateErgSchema = ergFieldsSchema
	.extend({ id: z.string() })
	.transform(onlyPersonalErgsHaveAnOwner);

export type UpdateErg = z.infer<typeof updateErgSchema>;

export const getErgByIdInputSchema = z.object({ id: z.string() });
export type GetErgByIdInput = z.infer<typeof getErgByIdInputSchema>;

export const deleteErgInputSchema = z.object({ id: z.string() });
export type DeleteErgInput = z.infer<typeof deleteErgInputSchema>;

export const markErgSchema = z.object({ id: z.string() });
export type MarkErg = z.infer<typeof markErgSchema>;

function onlyPersonalErgsHaveAnOwner<T extends z.infer<typeof ergFieldsSchema>>(
	erg: T,
	ctx: z.RefinementCtx<T>,
): T {
	if (erg.ownership !== "personal") return { ...erg, ownerId: null };
	if (!erg.ownerId) {
		ctx.addIssue({
			code: "custom",
			message: "Choose who owns this erg",
			path: ["ownerId"],
		});
		return z.NEVER;
	}
	return erg;
}
