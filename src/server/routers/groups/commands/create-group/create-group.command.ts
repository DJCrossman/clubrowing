import type { CreateGroup } from "@/schemas";
import type { Context } from "@/server/domain/common/context";

export async function createGroupCommand(input: CreateGroup, { db }: Context) {
	return db.group.create({
		data: {
			name: input.name,
			programs: {
				create: (input.programIds ?? []).map((programId) => ({ programId })),
			},
		},
		select: { id: true, name: true },
	});
}
