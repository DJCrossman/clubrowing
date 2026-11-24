import { rotateCalendarTokenCommand } from "@/server/domain/schedule/commands/rotate-calendar-token/rotate-calendar-token.command";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const rotateCalendarTokenProcedure = viewerProcedure.mutation(
	({ ctx }) => rotateCalendarTokenCommand(undefined, ctx),
);
