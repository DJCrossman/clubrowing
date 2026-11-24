import { attachActivityScreenshotCommand } from "@/domain/activities/commands/attach-activity-screenshot/attach-activity-screenshot.command";
import { attachActivityScreenshotInputSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const attachActivityScreenshotProcedure = protectedProcedure
	.input(attachActivityScreenshotInputSchema)
	.mutation(({ ctx, input }) => attachActivityScreenshotCommand(input, ctx));
