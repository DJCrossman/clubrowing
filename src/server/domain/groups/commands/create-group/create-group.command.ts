import type { Context } from "@/domain/common/context";
import type { CreateGroup } from "@/schemas";

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
