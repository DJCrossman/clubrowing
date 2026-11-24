import type { TRPCMutationProcedure, TRPCQueryProcedure } from "@trpc/server";
import type { z } from "zod";
import type { Permission } from "@/domain/common/permission";
import { type baseProcedure, TRPCError } from "./init";

type Handler<TContext, TInput, TResult> = (opts: {
	ctx: TContext;
	input: TInput;
}) => Promise<TResult> | TResult;

export type PermissionBuilder<TContext, TInput> = {
	input<TSchema extends z.ZodType>(
		schema: TSchema,
	): PermissionBuilder<TContext, z.infer<TSchema>>;
	use(
		mw: Parameters<typeof baseProcedure.use>[0],
	): PermissionBuilder<TContext, TInput>;
	/** Throws the permission's error unless its check passes. */
	permission(
		rule: Permission<TContext, TInput>,
	): PermissionBuilder<TContext, TInput>;
	mutation<TResult>(
		handler: Handler<TContext, TInput, TResult>,
	): TRPCMutationProcedure<{ meta: object; input: TInput; output: TResult }>;
	query<TResult>(
		handler: Handler<TContext, TInput, TResult>,
	): TRPCQueryProcedure<{ meta: object; input: TInput; output: TResult }>;
};

// Internal helper: wraps a tRPC builder to add `.permission()` and forwards
// everything else to tRPC's underlying builder. The inner builder is typed
// broadly with `any` because tRPC's `ProcedureBuilder` has eight generic
// parameters that change on every chain step; the public types above do all
// the constraint work.
export function wrapBuilder<TContext, TInput>(
	// biome-ignore lint/suspicious/noExplicitAny: tRPC's builder has 8 generics that change per chain step; runtime safety comes from tRPC itself.
	builder: any,
): PermissionBuilder<TContext, TInput> {
	return {
		input<TSchema extends z.ZodType>(schema: TSchema) {
			return wrapBuilder<TContext, z.infer<TSchema>>(builder.input(schema));
		},
		use(mw) {
			return wrapBuilder<TContext, TInput>(builder.use(mw));
		},
		permission(rule) {
			return wrapBuilder<TContext, TInput>(
				builder.use(
					async (opts: {
						ctx: TContext;
						input: TInput;
						next: () => Promise<unknown>;
					}) => {
						if (!(await rule.check({ ctx: opts.ctx, input: opts.input }))) {
							throw new TRPCError(rule.error);
						}
						return opts.next();
					},
				),
			);
		},
		mutation(handler) {
			return builder.mutation(handler);
		},
		query(handler) {
			return builder.query(handler);
		},
	};
}
