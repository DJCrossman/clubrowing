import type { OnboardingContext } from "@/domain/common/context";
import { type AfterableBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndNoAthlete } from "../middleware/auth";

export const onboardingProcedure: AfterableBuilder<
	OnboardingContext,
	undefined
> = wrapBuilder<OnboardingContext, undefined>(
	baseProcedure.use(requireAuthAndNoAthlete),
);
