import { completeOnboardingCommand } from "@/domain/users/commands/complete-onboarding/complete-onboarding.command";
import { completeOnboardingSchema } from "@/schemas";
import { onboardingProcedure } from "@/trpc/procedures/onboarding.procedure";

export const completeOnboardingProcedure = onboardingProcedure
	.input(completeOnboardingSchema)
	.mutation(({ ctx, input }) => completeOnboardingCommand(input, ctx));
