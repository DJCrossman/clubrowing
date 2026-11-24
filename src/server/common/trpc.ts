import { initTRPC, TRPCError } from "@trpc/server";
import type { RequestContext } from "./context";
import { mapDomainErrors } from "./middleware/domain-errors";

const t = initTRPC.context<RequestContext>().create();

export const router = t.router;
export const middleware = t.middleware;
export const baseProcedure = t.procedure.use(mapDomainErrors);
export { TRPCError };
