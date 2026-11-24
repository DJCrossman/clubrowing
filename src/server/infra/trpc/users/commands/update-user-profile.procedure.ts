import { athleteProfileSchema } from "@/schemas";
import { updateUserProfileCommand } from "@/server/domain/users/commands/update-user-profile/update-user-profile.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const updateUserProfileProcedure = protectedProcedure
	.input(athleteProfileSchema)
	.mutation(({ ctx, input }) => updateUserProfileCommand(input, ctx));
