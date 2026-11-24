import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "@/server/domain/common/context";
import { mapDomainErrors } from "./middleware/domain-errors";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;
export const baseProcedure = t.procedure.use(mapDomainErrors);
export { TRPCError };
