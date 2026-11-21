import { getMembersInputSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/server/procedures";
import { getMembersQuery } from "./get-members.query";

export const getMembersProcedure = viewerProcedure
	.input(getMembersInputSchema)
	.query(({ input, ctx }) => getMembersQuery(input, ctx));
