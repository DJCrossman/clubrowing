import { TRPCError } from "@trpc/server";
import { setActivityHiddenInputSchema } from "@/schemas";
import { authenticatedProcedure } from "@/server/common/procedures/authenticated.procedure";
import { setActivityHiddenCommand } from "./set-activity-hidden.command";

export const setActivityHiddenProcedure = authenticatedProcedure
	.input(setActivityHiddenInputSchema)
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
				message: "Cannot hide another athlete's activity",
			});
		}
		return setActivityHiddenCommand(input, ctx);
	});
