import { deleteActivityInputSchema } from "@/schemas";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { deleteActivityMemberCommand } from "./delete-activity.member.command";

export const deleteActivityProcedure = protectedProcedure
	.input(deleteActivityInputSchema)
	.mutation(({ ctx, input }) => deleteActivityMemberCommand(input, ctx));
