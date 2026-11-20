import { TRPCError } from "@trpc/server";
import { attachActivityScreenshotInputSchema } from "@/schemas";
import { authenticatedProcedure } from "@/server/common/procedures/authenticated.procedure";
import { attachActivityScreenshotCommand } from "./attach-activity-screenshot.command";

export const attachActivityScreenshotProcedure = authenticatedProcedure
	.input(attachActivityScreenshotInputSchema)
	.mutation(async ({ ctx, input }) => {
		const existing = await ctx.db.activity.findUnique({
			where: { id: input.id },
			select: { athleteId: true },
		});
		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Activity not found",
			});
		}
		if (existing.athleteId !== ctx.athlete.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Cannot attach a screenshot to another athlete's activity",
			});
		}
		return attachActivityScreenshotCommand(input, ctx);
	});
