import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getCalendarTokenCommand } from "./get-calendar-token.command";

export const getCalendarTokenProcedure = viewerProcedure.mutation(({ ctx }) =>
	getCalendarTokenCommand(undefined, ctx),
);
