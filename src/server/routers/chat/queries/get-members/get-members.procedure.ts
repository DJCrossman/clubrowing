import { getMembersInputSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getMembersQuery } from "./get-members.query";

export const getMembersProcedure = viewerProcedure
	.input(getMembersInputSchema)
	.query(({ input, ctx }) => getMembersQuery(input, ctx));
