import type { UnauthenticatedContext } from "@/domain/common/context";
import { type PermissionBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";

export const publicProcedure: PermissionBuilder<
	UnauthenticatedContext,
	undefined
> = wrapBuilder<UnauthenticatedContext, undefined>(baseProcedure);
