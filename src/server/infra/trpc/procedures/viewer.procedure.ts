import type { ViewerContext } from "@/server/domain/common/context";
import { type AfterableBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndAthleteOrAdmin } from "../middleware/auth";

export const viewerProcedure: AfterableBuilder<ViewerContext, undefined> =
	wrapBuilder<ViewerContext, undefined>(
		baseProcedure.use(requireAuthAndAthleteOrAdmin),
	);
