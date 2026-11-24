import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { rotateCalendarTokenCommand } from "./rotate-calendar-token.command";

export const rotateCalendarTokenProcedure = viewerProcedure.mutation(
	({ ctx }) => rotateCalendarTokenCommand(undefined, ctx),
);
