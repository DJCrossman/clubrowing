"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { generateQueryKey } from "@/lib/keygen";
import { trpcClient } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";
import { ActiveStep } from "./ActiveStep";
import { OnboardingProgress } from "./OnboardingProgress";
import {
	getOnboardingSteps,
	isOnboardingStepId,
	type OnboardingStepId,
} from "./steps";
import type { DetailsStepDefaults } from "./steps/DetailsStep";

type CurrentUserResult = RouterOutputs["users"]["getCurrentUser"];

interface OnboardingSceneProps {
	step?: string;
	defaultFirstName?: string;
	defaultLastName?: string;
	initialUser: CurrentUserResult;
}

export function OnboardingScene({
	step,
	defaultFirstName,
	defaultLastName,
	initialUser,
}: OnboardingSceneProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const utils = trpcClient.useUtils();
	const [isFinishing, setIsFinishing] = useState(false);

	const { data } = trpcClient.users.getCurrentUser.useQuery(undefined, {
		initialData: initialUser,
	});
	const currentUser = data ?? initialUser;
	const { isAdmin, hasAthlete, user } = currentUser;

	const steps = getOnboardingSteps();
	const stepIds = steps.map((entry) => entry.id);

	const requestedStep =
		step && isOnboardingStepId(step) && stepIds.includes(step)
			? step
			: undefined;
	const [activeStep, setActiveStep] = useState<OnboardingStepId>(
		requestedStep ?? "welcome",
	);
	const currentStepId = stepIds.includes(activeStep) ? activeStep : "welcome";

	const completeOnboarding = trpcClient.users.completeOnboarding.useMutation();
	const updateUserProfile = trpcClient.users.updateUserProfile.useMutation();
	const connectRca = trpcClient.activities.connectRca.useMutation();
	const syncRca = trpcClient.activities.syncRca.useMutation({
		onSuccess: (result) => {
			const parts = [
				`${result.programs.upserted} programs`,
				`${result.memberships.upserted} memberships`,
			];
			toast.success("Synced Rowing Canada", { description: parts.join(" · ") });
		},
		onError: (syncError) => {
			toast.error("Rowing Canada sync failed", {
				description: syncError.message,
			});
		},
	});
	const stravaSync = trpcClient.activities.syncStravaActivities.useMutation();
	const concept2Sync =
		trpcClient.activities.syncConcept2Activities.useMutation();
	const notifications = useNotifications({
		enabled: currentStepId === "notifications",
	});

	const goTo = (id: OnboardingStepId) => {
		setActiveStep(id);
		router.replace(`/onboarding?step=${id}`, { scroll: false });
	};

	const goNext = () => {
		const index = stepIds.indexOf(currentStepId);
		goTo(stepIds[index + 1] ?? "done");
	};

	const goBack = () => {
		const index = stepIds.indexOf(currentStepId);
		const previous = stepIds[index - 1];
		if (previous) goTo(previous);
	};

	const refetchUser = async () => {
		await utils.users.getCurrentUser.invalidate();
	};

	const handleDetailsCompleted = async () => {
		await refetchUser();
		goNext();
	};

	const finishOnboarding = async () => {
		setIsFinishing(true);
		await utils.users.getCurrentUser.invalidate();
		await queryClient.invalidateQueries({
			queryKey: generateQueryKey({ type: "currentUser" }),
		});
		router.replace("/");
	};

	// Admins can skip onboarding entirely and use the app without an athlete.
	const skipToApp = () => {
		router.replace("/");
	};

	const detailsDefaults: DetailsStepDefaults =
		hasAthlete && user
			? {
					firstName: user.firstName ?? "",
					lastName: user.lastName ?? "",
					nickname: user.nickname ?? "",
					phone: user.phone ?? "",
					gender: user.gender,
					dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
				}
			: {
					firstName: defaultFirstName ?? "",
					lastName: defaultLastName ?? "",
					nickname: "",
					phone: "",
					gender: undefined,
					dateOfBirth: "",
				};

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center p-6">
			<div className="mb-8">
				<OnboardingProgress steps={steps} currentStepId={currentStepId} />
			</div>
			<div className="rounded-lg border bg-background p-6 shadow-sm">
				<ActiveStep
					stepId={currentStepId}
					welcome={{ isAdmin, onNext: goNext, onSkipToApp: skipToApp }}
					details={{
						defaultValues: detailsDefaults,
						isSubmitting:
							completeOnboarding.isPending || updateUserProfile.isPending,
						onSave: (data) =>
							hasAthlete
								? updateUserProfile.mutateAsync(data)
								: completeOnboarding.mutateAsync(data),
						onCompleted: handleDetailsCompleted,
						onBack: goBack,
					}}
					rca={{
						connected: user?.rcaConnected ?? false,
						isConnecting: connectRca.isPending,
						isSyncing: syncRca.isPending,
						onConnect: (credentials) => connectRca.mutateAsync(credentials),
						onSync: () => syncRca.mutate(),
						onContinue: goNext,
						onSkip: goNext,
						onBack: goBack,
						onConnected: refetchUser,
					}}
					concept2={{
						connected: user?.concept2Connected ?? false,
						isSyncing: concept2Sync.isPending,
						onSync: (options) => concept2Sync.mutate(undefined, options),
						onContinue: goNext,
						onSkip: goNext,
						onBack: goBack,
					}}
					strava={{
						connected: user?.stravaConnected ?? false,
						isSyncing: stravaSync.isPending,
						onSync: (options) => stravaSync.mutate(undefined, options),
						onContinue: goNext,
						onSkip: goNext,
						onBack: goBack,
					}}
					notifications={{
						notifications,
						onContinue: goNext,
						onSkip: goNext,
						onBack: goBack,
					}}
					done={{ isAdmin, isFinishing, onFinish: finishOnboarding }}
				/>
			</div>
		</div>
	);
}
