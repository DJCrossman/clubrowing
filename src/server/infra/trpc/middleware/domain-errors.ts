import { TRPCError, type TRPCMiddlewareFunction } from "@trpc/server";
import type { Context } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";

export const mapDomainErrors: TRPCMiddlewareFunction<
	Context,
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
