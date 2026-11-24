import { TRPCError, type TRPCMiddlewareFunction } from "@trpc/server";
import { DomainError } from "@/server/domain/common/domain-error";
import type { RequestContext } from "../context";

export const mapDomainErrors: TRPCMiddlewareFunction<
	RequestContext,
	object,
	object,
	object,
	unknown
> = async ({ next }) => {
	const result = await next();
	if (!result.ok && result.error.cause instanceof DomainError) {
		const { code, message } = result.error.cause;
		throw new TRPCError({ code, message, cause: result.error.cause });
	}
	return result;
};
