import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";
import { sendTestCommand } from "./send-test.command";

export const sendTestProcedure = protectedProcedure.mutation(({ ctx }) =>
	sendTestCommand(undefined, ctx),
);
