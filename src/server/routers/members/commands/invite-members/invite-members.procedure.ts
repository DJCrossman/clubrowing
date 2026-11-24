import { inviteMembersSchema } from "@/schemas";
import { adminProcedure } from "@/server/infra/trpc/procedures/admin.procedure";
import { inviteMembersCommand } from "./invite-members.command";

export const inviteMembersProcedure = adminProcedure
	.input(inviteMembersSchema)
	.mutation(({ ctx, input }) => inviteMembersCommand(input, ctx));
