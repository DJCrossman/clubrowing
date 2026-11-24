import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DomainError } from "@/server/domain/common/domain-error";
import { wrapBuilder } from "./builder";
import { definePermission } from "./permission";
import { baseProcedure, router, TRPCError } from "./trpc";

type Ctx = { user: { id: string } };

const onlyOwnNotes = definePermission<Ctx, { ownerId: string }>(
	({ ctx, input }) => ctx.user.id === input.ownerId,
	{ code: "NOT_FOUND", message: "Note not found" },
);

const handler = vi.fn(() => "the note");
const notes = router({
	get: wrapBuilder<Ctx, undefined>(baseProcedure)
		.input(z.object({ ownerId: z.string() }))
		.permission(onlyOwnNotes)
		.query(handler),
	archived: wrapBuilder<Ctx, undefined>(baseProcedure).query(() => {
		throw new DomainError("NOT_FOUND", "Note archived");
	}),
	broken: wrapBuilder<Ctx, undefined>(baseProcedure).query(() => {
		throw new Error("Disk full");
	}),
});
const callerFor = (userId: string) =>
	notes.createCaller({ user: { id: userId } } as never);

describe("permission", () => {
	it("runs the handler when the check passes", async () => {
		await expect(callerFor("user_a").get({ ownerId: "user_a" })).resolves.toBe(
			"the note",
		);
	});

	it("throws the rule's error and skips the handler when it fails", async () => {
		handler.mockClear();
		await expect(
			callerFor("user_b").get({ ownerId: "user_a" }),
		).rejects.toMatchObject({ code: "NOT_FOUND", message: "Note not found" });
		expect(handler).not.toHaveBeenCalled();
	});

	it("defaults to forbidden", async () => {
		const rule = definePermission<Ctx, undefined>(() => false);
		expect(rule.error.code).toBe("FORBIDDEN");
	});
});

describe("domain errors", () => {
	it("reach the caller as a TRPCError with the same code and message", async () => {
		const archived = callerFor("user_a").archived();

		await expect(archived).rejects.toBeInstanceOf(TRPCError);
		await expect(archived).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Note archived",
			cause: expect.any(DomainError),
		});
	});

	it("leave any other error an internal server error", async () => {
		await expect(callerFor("user_a").broken()).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
			message: "Disk full",
		});
	});
});
