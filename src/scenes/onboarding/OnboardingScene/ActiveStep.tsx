import type { ComponentProps } from "react";
import type { OnboardingStepId } from "./steps";
import { DetailsStep } from "./steps/DetailsStep";
import { DoneStep } from "./steps/DoneStep";
import { NotificationsStep } from "./steps/NotificationsStep";
import { OAuthIntegrationStep } from "./steps/OAuthIntegrationStep";
import { RowingCanadaStep } from "./steps/RowingCanadaStep";
import { WelcomeStep } from "./steps/WelcomeStep";

type OAuthStepProps = Omit<
	ComponentProps<typeof OAuthIntegrationStep>,
	"provider"
>;

interface ActiveStepProps {
	stepId: OnboardingStepId;
	welcome: ComponentProps<typeof WelcomeStep>;
	details: ComponentProps<typeof DetailsStep>;
	rca: ComponentProps<typeof RowingCanadaStep>;
	concept2: OAuthStepProps;
	strava: OAuthStepProps;
	notifications: ComponentProps<typeof NotificationsStep>;
	done: ComponentProps<typeof DoneStep>;
}

export function ActiveStep({
	stepId,
	welcome,
	details,
	rca,
	concept2,
	strava,
	notifications,
	done,
}: ActiveStepProps) {
	switch (stepId) {
		case "welcome":
			return <WelcomeStep {...welcome} />;
		case "details":
			return <DetailsStep {...details} />;
		case "rca":
			return <RowingCanadaStep {...rca} />;
		case "concept2":
			return <OAuthIntegrationStep provider="concept2" {...concept2} />;
		case "strava":
			return <OAuthIntegrationStep provider="strava" {...strava} />;
		case "notifications":
			return <NotificationsStep {...notifications} />;
		case "done":
			return <DoneStep {...done} />;
	}
}
