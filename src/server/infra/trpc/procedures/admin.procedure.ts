import type { AdminContext } from "@/domain/common/context";
import { type PermissionBuilder, wrapBuilder } from "../builder";
import { baseProcedure } from "../init";
import { requireAuthAndAdmin } from "../middleware/auth";

export const adminProcedure: PermissionBuilder<AdminContext, undefined> =
	wrapBuilder<AdminContext, undefined>(baseProcedure.use(requireAuthAndAdmin));
