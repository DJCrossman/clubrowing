import { completeOnboardingSchema } from "@/schemas";
import { completeOnboardingCommand } from "@/server/domain/users/commands/complete-onboarding/complete-onboarding.command";
import { onboardingProcedure } from "@/server/infra/trpc/procedures/onboarding.procedure";

export const completeOnboardingProcedure = onboardingProcedure
	.input(completeOnboardingSchema)
	.mutation(({ ctx, input }) => completeOnboardingCommand(input, ctx));
