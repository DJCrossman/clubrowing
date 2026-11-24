import { setNotificationPreferenceSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { setPreferenceCommand } from "./set-preference.command";

export const setPreferenceProcedure = protectedProcedure
	.input(setNotificationPreferenceSchema)
	.mutation(({ ctx, input }) => setPreferenceCommand(input, ctx));
