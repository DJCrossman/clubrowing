import type { UnauthenticatedContext } from "@/domain/common/context";
import { type AfterableBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";

export const publicProcedure: AfterableBuilder<
	UnauthenticatedContext,
	undefined
> = wrapBuilder<UnauthenticatedContext, undefined>(baseProcedure);
