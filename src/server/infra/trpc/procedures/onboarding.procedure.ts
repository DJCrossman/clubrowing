import type { OnboardingContext } from "@/domain/common/context";
import { type PermissionBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndNoAthlete } from "../middleware/auth";

export const onboardingProcedure: PermissionBuilder<
	OnboardingContext,
	undefined
> = wrapBuilder<OnboardingContext, undefined>(
	baseProcedure.use(requireAuthAndNoAthlete),
);
