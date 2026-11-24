import type { AuthenticatedContext } from "@/domain/common/context";
import { type PermissionBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndAthlete } from "../middleware/auth";

export const protectedProcedure: PermissionBuilder<
	AuthenticatedContext,
	undefined
> = wrapBuilder<AuthenticatedContext, undefined>(
	baseProcedure.use(requireAuthAndAthlete),
);
