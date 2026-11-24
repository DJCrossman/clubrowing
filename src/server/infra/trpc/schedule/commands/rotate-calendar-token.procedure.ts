import { rotateCalendarTokenCommand } from "@/domain/schedule/commands/rotate-calendar-token/rotate-calendar-token.command";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const rotateCalendarTokenProcedure = viewerProcedure.mutation(
	({ ctx }) => rotateCalendarTokenCommand(undefined, ctx),
);
