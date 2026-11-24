import { setPreferenceCommand } from "@/domain/notifications/commands/set-preference/set-preference.command";
import { setNotificationPreferenceSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const setPreferenceProcedure = protectedProcedure
	.input(setNotificationPreferenceSchema)
	.mutation(({ ctx, input }) => setPreferenceCommand(input, ctx));
