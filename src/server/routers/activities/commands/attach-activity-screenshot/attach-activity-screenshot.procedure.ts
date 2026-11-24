import { attachActivityScreenshotInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { attachActivityScreenshotCommand } from "./attach-activity-screenshot.command";

export const attachActivityScreenshotProcedure = protectedProcedure
	.input(attachActivityScreenshotInputSchema)
	.mutation(({ ctx, input }) => attachActivityScreenshotCommand(input, ctx));
