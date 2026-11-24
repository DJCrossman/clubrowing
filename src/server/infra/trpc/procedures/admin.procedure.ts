import type { AdminContext } from "@/server/domain/common/context";
import { type AfterableBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndAdmin } from "../middleware/auth";

export const adminProcedure: AfterableBuilder<AdminContext, undefined> =
	wrapBuilder<AdminContext, undefined>(baseProcedure.use(requireAuthAndAdmin));
