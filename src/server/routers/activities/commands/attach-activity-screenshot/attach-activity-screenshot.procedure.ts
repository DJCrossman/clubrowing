import { attachActivityScreenshotInputSchema } from "@/schemas";
import { authenticatedProcedure } from "@/server/common/procedures/authenticated.procedure";
import { attachActivityScreenshotCommand } from "./attach-activity-screenshot.command";

export const attachActivityScreenshotProcedure = authenticatedProcedure
	.input(attachActivityScreenshotInputSchema)
	.mutation(({ ctx, input }) => attachActivityScreenshotCommand(input, ctx));
