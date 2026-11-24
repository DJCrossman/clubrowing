import { attachActivityScreenshotInputSchema } from "@/schemas";
import { attachActivityScreenshotCommand } from "@/server/domain/activities/commands/attach-activity-screenshot/attach-activity-screenshot.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const attachActivityScreenshotProcedure = protectedProcedure
	.input(attachActivityScreenshotInputSchema)
	.mutation(({ ctx, input }) => attachActivityScreenshotCommand(input, ctx));
