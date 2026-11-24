import type { AuthenticatedContext } from "@/server/domain/common/context";
import { type AfterableBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndAthlete } from "../middleware/auth";

export const protectedProcedure: AfterableBuilder<
	AuthenticatedContext,
	undefined
> = wrapBuilder<AuthenticatedContext, undefined>(
	baseProcedure.use(requireAuthAndAthlete),
);
