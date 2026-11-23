import { type SyncSource, useSyncStatus } from "@/hooks/useSyncStatus";
import { trpcClient } from "@/lib/trpc/client";

export function useActivitySync() {
	const { runningSources, cooldownSources } = useSyncStatus();
	const utils = trpcClient.useUtils();

	const onSyncSettled = () => {
		utils.activities.getActivities.invalidate();
		utils.activities.getPendingInboxBatches.invalidate();
	};

	const stravaSync = trpcClient.activities.syncStravaActivities.useMutation({
		onSuccess: onSyncSettled,
		onError: onSyncSettled,
	});
	const concept2Sync = trpcClient.activities.syncConcept2Activities.useMutation(
		{ onSuccess: onSyncSettled, onError: onSyncSettled },
	);

	const isSyncing = (source: SyncSource) => {
		if (source === "strava" && stravaSync.isPending) return true;
		if (source === "concept2" && concept2Sync.isPending) return true;
		return runningSources.has(source);
	};
	const isCoolingDown = (source: SyncSource) => cooldownSources.has(source);

	return {
		isSyncing,
		isCoolingDown,
		startSync: (source: SyncSource) => {
			if (isSyncing(source) || isCoolingDown(source)) return;
			if (source === "strava") stravaSync.mutate();
			else if (source === "concept2") concept2Sync.mutate();
		},
	};
}
