"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { generateQueryKey } from "@/lib/keygen";
import type { CurrentAthlete } from "@/lib/trpc/types";

type CurrentOrganization = { name: string; logoUrl: string | null };

type AuthBase = {
	error: Error | null;
	isPending: boolean;
	isAdmin: boolean;
	hasAthlete: boolean;
	authenticated: boolean;
	organization: CurrentOrganization | null;
};

type UseAuthResult = AuthBase & { user: CurrentAthlete | null };

type AuthMeResponse = {
	user: CurrentAthlete | null;
	isAdmin: boolean;
	hasAthlete: boolean;
	organization: CurrentOrganization | null;
};

type AuthState = AuthMeResponse & { authenticated: boolean };

const SIGNED_OUT_STATE: AuthState = {
	user: null,
	isAdmin: false,
	hasAthlete: false,
	organization: null,
	authenticated: false,
};

export function useAuth(opts?: { ensureSignedIn?: boolean }): UseAuthResult {
	const { ensureSignedIn = false } = opts ?? {};
	const { data, error, isPending, fetchStatus } = useQuery({
		queryKey: generateQueryKey({ type: "currentUser" }),
		enabled: ensureSignedIn,
		// Coming back to the tab, a refetch goes out before clerk-js has renewed
		// its 60 s session cookie, and that 401 would read as signed out.
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		queryFn: async (): Promise<AuthState> => {
			const response = await fetch("/api/v1/users/me");
			if (response.status === 401) {
				return SIGNED_OUT_STATE;
			}
			if (!response.ok) {
				const errorBody: { message?: string } = await response.json();
				throw new Error(errorBody.message ?? "Failed to fetch user data");
			}
			const body: AuthMeResponse = await response.json();
			return { ...body, authenticated: true };
		},
	});

	return {
		user: data?.user ?? null,
		isAdmin: data?.isAdmin ?? false,
		hasAthlete: data?.hasAthlete ?? false,
		authenticated: data?.authenticated ?? false,
		organization: data?.organization ?? null,
		error,
		isPending: isPending && fetchStatus !== "idle",
	};
}

type CurrentUserContextValue = {
	user: CurrentAthlete;
	isAdmin: boolean;
	hasAthlete: boolean;
	organization: CurrentOrganization | null;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export const CurrentUserProvider = ({
	children,
	user,
	isAdmin,
	hasAthlete,
	organization,
}: React.PropsWithChildren<CurrentUserContextValue>) => (
	<CurrentUserContext.Provider
		value={{ user, isAdmin, hasAthlete, organization }}
	>
		{children}
	</CurrentUserContext.Provider>
);

export const useCurrentUser = (): CurrentUserContextValue => {
	const context = useContext(CurrentUserContext);
	if (!context) {
		throw new Error("useCurrentUser must be used within a CurrentUserProvider");
	}
	return context;
};
