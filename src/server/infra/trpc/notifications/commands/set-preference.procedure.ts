import { setNotificationPreferenceSchema } from "@/schemas";
import { setPreferenceCommand } from "@/server/domain/notifications/commands/set-preference/set-preference.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const setPreferenceProcedure = protectedProcedure
	.input(setNotificationPreferenceSchema)
	.mutation(({ ctx, input }) => setPreferenceCommand(input, ctx));
