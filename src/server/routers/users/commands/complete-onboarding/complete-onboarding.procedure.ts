import { completeOnboardingSchema } from "@/schemas";
import { onboardingProcedure } from "@/server/infra/trpc/procedures/onboarding.procedure";
import { completeOnboardingCommand } from "./complete-onboarding.command";

export const completeOnboardingProcedure = onboardingProcedure
	.input(completeOnboardingSchema)
	.mutation(({ ctx, input }) => completeOnboardingCommand(input, ctx));
