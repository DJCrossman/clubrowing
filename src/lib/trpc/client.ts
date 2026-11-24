import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/infra/routes";

export const trpcClient = createTRPCReact<AppRouter>();
