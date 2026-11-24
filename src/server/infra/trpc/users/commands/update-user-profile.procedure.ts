import { updateUserProfileCommand } from "@/domain/users/commands/update-user-profile/update-user-profile.command";
import { athleteProfileSchema } from "@/schemas";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const updateUserProfileProcedure = protectedProcedure
	.input(athleteProfileSchema)
	.mutation(({ ctx, input }) => updateUserProfileCommand(input, ctx));
