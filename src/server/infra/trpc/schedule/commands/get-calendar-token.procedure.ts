import { getCalendarTokenCommand } from "@/domain/schedule/commands/get-calendar-token/get-calendar-token.command";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getCalendarTokenProcedure = viewerProcedure.mutation(({ ctx }) =>
	getCalendarTokenCommand(undefined, ctx),
);
