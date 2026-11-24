import { deleteActivityInputSchema } from "@/schemas";
import { authenticatedProcedure } from "@/server/common/procedures/authenticated.procedure";
import { deleteActivityMemberCommand } from "./delete-activity.member.command";

export const deleteActivityProcedure = authenticatedProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityMemberCommand(input, ctx));
