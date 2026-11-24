import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/infra/routes";
import { createRequestContext } from "@/trpc/request-context";

const handler = (req: Request) =>
	fetchRequestHandler({
		endpoint: "/api/v1/trpc",
		req,
		router: appRouter,
		createContext: () => createRequestContext({ req }),
		onError: ({ error, path }) => console.error(`[trpc] ${path}:`, error),
	});

export { handler as GET, handler as POST };
