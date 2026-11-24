import type { ViewerContext } from "@/domain/common/context";
import { type PermissionBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndAthleteOrAdmin } from "../middleware/auth";

export const viewerProcedure: PermissionBuilder<ViewerContext, undefined> =
	wrapBuilder<ViewerContext, undefined>(
		baseProcedure.use(requireAuthAndAthleteOrAdmin),
	);
