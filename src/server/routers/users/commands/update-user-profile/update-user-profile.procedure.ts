import { athleteProfileSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { updateUserProfileCommand } from "./update-user-profile.command";

export const updateUserProfileProcedure = protectedProcedure
	.input(athleteProfileSchema)
	.mutation(({ ctx, input }) => updateUserProfileCommand(input, ctx));
