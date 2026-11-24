import { addDmMembersSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { addDmMembersCommand } from "./add-dm-members.command";

export const addDmMembersProcedure = viewerProcedure
	.input(addDmMembersSchema)
	.mutation(({ ctx, input }) => addDmMembersCommand(input, ctx));
