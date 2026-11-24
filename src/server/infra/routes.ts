import { bulkCreateBoatsProcedure } from "@/server/infra/trpc/boats/commands/bulk-create-boats.procedure";
import { createBoatProcedure } from "@/server/infra/trpc/boats/commands/create-boat.procedure";
import { updateBoatProcedure } from "@/server/infra/trpc/boats/commands/update-boat.procedure";
import { getBoatByIdProcedure } from "@/server/infra/trpc/boats/queries/get-boat-by-id.procedure";
import { getBoatsProcedure } from "@/server/infra/trpc/boats/queries/get-boats.procedure";
import { createErgProcedure } from "@/server/infra/trpc/ergs/commands/create-erg.procedure";
import { deleteErgProcedure } from "@/server/infra/trpc/ergs/commands/delete-erg.procedure";
import { markErgProcedure } from "@/server/infra/trpc/ergs/commands/mark-erg.procedure";
import { updateErgProcedure } from "@/server/infra/trpc/ergs/commands/update-erg.procedure";
import { getErgByIdProcedure } from "@/server/infra/trpc/ergs/queries/get-erg-by-id.procedure";
import { getErgsProcedure } from "@/server/infra/trpc/ergs/queries/get-ergs.procedure";
import { router } from "@/server/infra/trpc/init";
import { getProgramsProcedure } from "@/server/infra/trpc/programs/queries/get-programs.procedure";
import { createWorkoutProcedure } from "@/server/infra/trpc/workouts/commands/create-workout.procedure";
import { updateWorkoutProcedure } from "@/server/infra/trpc/workouts/commands/update-workout.procedure";
import { getWorkoutByIdProcedure } from "@/server/infra/trpc/workouts/queries/get-workout-by-id.procedure";
import { getWorkoutsProcedure } from "@/server/infra/trpc/workouts/queries/get-workouts.procedure";
import { attachActivityScreenshotProcedure } from "@/server/routers/activities/commands/attach-activity-screenshot/attach-activity-screenshot.procedure";
import { connectConcept2Procedure } from "@/server/routers/activities/commands/connect-concept2/connect-concept2.procedure";
import { connectRcaProcedure } from "@/server/routers/activities/commands/connect-rca/connect-rca.procedure";
import { connectStravaProcedure } from "@/server/routers/activities/commands/connect-strava/connect-strava.procedure";
import { createActivityAdminProcedure } from "@/server/routers/activities/commands/create-activity/create-activity.admin.procedure";
import { createActivityProcedure } from "@/server/routers/activities/commands/create-activity/create-activity.procedure";
import { deleteActivityAdminProcedure } from "@/server/routers/activities/commands/delete-activity/delete-activity.admin.procedure";
import { deleteActivityProcedure } from "@/server/routers/activities/commands/delete-activity/delete-activity.procedure";
import { disconnectConcept2Procedure } from "@/server/routers/activities/commands/disconnect-concept2/disconnect-concept2.procedure";
import { disconnectRcaProcedure } from "@/server/routers/activities/commands/disconnect-rca/disconnect-rca.procedure";
import { disconnectStravaProcedure } from "@/server/routers/activities/commands/disconnect-strava/disconnect-strava.procedure";
import { processConcept2InboxBatchProcedure } from "@/server/routers/activities/commands/process-concept2-inbox-batch/process-concept2-inbox-batch.procedure";
import { processStravaInboxBatchProcedure } from "@/server/routers/activities/commands/process-strava-inbox-batch/process-strava-inbox-batch.procedure";
import { syncConcept2ActivitiesProcedure } from "@/server/routers/activities/commands/sync-concept2-activities/sync-concept2-activities.procedure";
import { syncRcaProcedure } from "@/server/routers/activities/commands/sync-rca/sync-rca.procedure";
import { syncStravaActivitiesProcedure } from "@/server/routers/activities/commands/sync-strava-activities/sync-strava-activities.procedure";
import { updateActivityAdminProcedure } from "@/server/routers/activities/commands/update-activity/update-activity.admin.procedure";
import { updateActivityProcedure } from "@/server/routers/activities/commands/update-activity/update-activity.procedure";
import { getActivitiesAdminProcedure } from "@/server/routers/activities/queries/get-activities/get-activities.admin.procedure";
import { getActivitiesProcedure } from "@/server/routers/activities/queries/get-activities/get-activities.procedure";
import { getActivityByIdAdminProcedure } from "@/server/routers/activities/queries/get-activity-by-id/get-activity-by-id.admin.procedure";
import { getActivityByIdProcedure } from "@/server/routers/activities/queries/get-activity-by-id/get-activity-by-id.procedure";
import { getActivityStrokesProcedure } from "@/server/routers/activities/queries/get-activity-strokes/get-activity-strokes.procedure";
import { getConcept2ResultsProcedure } from "@/server/routers/activities/queries/get-concept2-results/get-concept2-results.procedure";
import { getConcept2UserProcedure } from "@/server/routers/activities/queries/get-concept2-user/get-concept2-user.procedure";
import { getPendingInboxBatchesProcedure } from "@/server/routers/activities/queries/get-pending-inbox-batches/get-pending-inbox-batches.procedure";
import { getStravaActivitiesProcedure } from "@/server/routers/activities/queries/get-strava-activities/get-strava-activities.procedure";
import { getStravaAthleteProcedure } from "@/server/routers/activities/queries/get-strava-athlete/get-strava-athlete.procedure";
import { getAnalyticsProcedure } from "@/server/routers/analytics/queries/get-analytics/get-analytics.procedure";
import { getGroupMetersProcedure } from "@/server/routers/analytics/queries/get-group-meters/get-group-meters.procedure";
import { getLeaderboardProcedure } from "@/server/routers/analytics/queries/get-leaderboard/get-leaderboard.procedure";
import { bulkCreateAthletesProcedure } from "@/server/routers/athletes/commands/bulk-create-athletes/bulk-create-athletes.procedure";
import { createAthleteProcedure } from "@/server/routers/athletes/commands/create-athlete/create-athlete.procedure";
import { updateAthleteProcedure } from "@/server/routers/athletes/commands/update-athlete/update-athlete.procedure";
import { getAthleteByIdProcedure } from "@/server/routers/athletes/queries/get-athlete-by-id/get-athlete-by-id.procedure";
import { getAthleteStatsProcedure } from "@/server/routers/athletes/queries/get-athlete-stats/get-athlete-stats.procedure";
import { getAthletesProcedure } from "@/server/routers/athletes/queries/get-athletes/get-athletes.procedure";
import { getCurrentAthleteProcedure } from "@/server/routers/athletes/queries/get-current-athlete/get-current-athlete.procedure";
import { addDmMembersProcedure } from "@/server/routers/chat/commands/add-dm-members/add-dm-members.procedure";
import { deleteMessageProcedure } from "@/server/routers/chat/commands/delete-message/delete-message.procedure";
import { editMessageProcedure } from "@/server/routers/chat/commands/edit-message/edit-message.procedure";
import { forwardMessageProcedure } from "@/server/routers/chat/commands/forward-message/forward-message.procedure";
import { leaveDmProcedure } from "@/server/routers/chat/commands/leave-dm/leave-dm.procedure";
import { markReadProcedure } from "@/server/routers/chat/commands/mark-read/mark-read.procedure";
import { markUnreadProcedure } from "@/server/routers/chat/commands/mark-unread/mark-unread.procedure";
import { replyInThreadProcedure } from "@/server/routers/chat/commands/reply-in-thread/reply-in-thread.procedure";
import { sendMessageProcedure } from "@/server/routers/chat/commands/send-message/send-message.procedure";
import { startDmProcedure } from "@/server/routers/chat/commands/start-dm/start-dm.procedure";
import { toggleReactionProcedure } from "@/server/routers/chat/commands/toggle-reaction/toggle-reaction.procedure";
import { getChannelsProcedure } from "@/server/routers/chat/queries/get-channels/get-channels.procedure";
import { getMembersProcedure as getChatMembersProcedure } from "@/server/routers/chat/queries/get-members/get-members.procedure";
import { getMessagesProcedure } from "@/server/routers/chat/queries/get-messages/get-messages.procedure";
import { getThreadProcedure } from "@/server/routers/chat/queries/get-thread/get-thread.procedure";
import { submitProcedure } from "@/server/routers/feedback/commands/submit/submit.procedure";
import { createGroupProcedure } from "@/server/routers/groups/commands/create-group/create-group.procedure";
import { deleteGroupProcedure } from "@/server/routers/groups/commands/delete-group/delete-group.procedure";
import { updateGroupProcedure } from "@/server/routers/groups/commands/update-group/update-group.procedure";
import { getGroupByIdProcedure } from "@/server/routers/groups/queries/get-group-by-id/get-group-by-id.procedure";
import { getGroupsProcedure } from "@/server/routers/groups/queries/get-groups/get-groups.procedure";
import { getMyGroupsProcedure } from "@/server/routers/groups/queries/get-my-groups/get-my-groups.procedure";
import { inviteMembersProcedure } from "@/server/routers/members/commands/invite-members/invite-members.procedure";
import { resendInvitationProcedure } from "@/server/routers/members/commands/resend-invitation/resend-invitation.procedure";
import { revokeInvitationProcedure } from "@/server/routers/members/commands/revoke-invitation/revoke-invitation.procedure";
import { getMembersProcedure } from "@/server/routers/members/queries/get-members/get-members.procedure";
import { sendTestProcedure } from "@/server/routers/notifications/commands/send-test/send-test.procedure";
import { setPreferenceProcedure } from "@/server/routers/notifications/commands/set-preference/set-preference.procedure";
import { subscribeProcedure } from "@/server/routers/notifications/commands/subscribe/subscribe.procedure";
import { unsubscribeProcedure } from "@/server/routers/notifications/commands/unsubscribe/unsubscribe.procedure";
import { getStatusProcedure } from "@/server/routers/notifications/queries/get-status/get-status.procedure";
import { createEventProcedure } from "@/server/routers/schedule/commands/create-event/create-event.procedure";
import { createEventsProcedure } from "@/server/routers/schedule/commands/create-events/create-events.procedure";
import { deleteEventProcedure } from "@/server/routers/schedule/commands/delete-event/delete-event.procedure";
import { getCalendarTokenProcedure } from "@/server/routers/schedule/commands/get-calendar-token/get-calendar-token.procedure";
import { nudgeProcedure } from "@/server/routers/schedule/commands/nudge/nudge.procedure";
import { rotateCalendarTokenProcedure } from "@/server/routers/schedule/commands/rotate-calendar-token/rotate-calendar-token.procedure";
import { rsvpProcedure } from "@/server/routers/schedule/commands/rsvp/rsvp.procedure";
import { saveTrainingWeekProcedure } from "@/server/routers/schedule/commands/save-training-week/save-training-week.procedure";
import { updateEventProcedure } from "@/server/routers/schedule/commands/update-event/update-event.procedure";
import { getEventByIdProcedure } from "@/server/routers/schedule/queries/get-event-by-id/get-event-by-id.procedure";
import { getResponsesProcedure } from "@/server/routers/schedule/queries/get-responses/get-responses.procedure";
import { getUpcomingProcedure } from "@/server/routers/schedule/queries/get-upcoming/get-upcoming.procedure";
import { getWeekProcedure } from "@/server/routers/schedule/queries/get-week/get-week.procedure";
import { completeOnboardingProcedure } from "@/server/routers/users/commands/complete-onboarding/complete-onboarding.procedure";
import { updateUserProfileProcedure } from "@/server/routers/users/commands/update-user-profile/update-user-profile.procedure";
import { getCurrentUserProcedure } from "@/server/routers/users/queries/get-current-user/get-current-user.procedure";
import { getUserByIdProcedure } from "@/server/routers/users/queries/get-user-by-id/get-user-by-id.procedure";
import { getUserByUserIdProcedure } from "@/server/routers/users/queries/get-user-by-user-id/get-user-by-user-id.procedure";

export const appRouter = router({
	athletes: router({
		getAthletes: getAthletesProcedure,
		getAthleteById: getAthleteByIdProcedure,
		getCurrentAthlete: getCurrentAthleteProcedure,
		getAthleteStats: getAthleteStatsProcedure,
		createAthlete: createAthleteProcedure,
		createAthletes: bulkCreateAthletesProcedure,
		updateAthlete: updateAthleteProcedure,
	}),
	groups: router({
		getGroups: getGroupsProcedure,
		getGroupById: getGroupByIdProcedure,
		getMyGroups: getMyGroupsProcedure,
		createGroup: createGroupProcedure,
		updateGroup: updateGroupProcedure,
		deleteGroup: deleteGroupProcedure,
	}),
	members: router({
		getMembers: getMembersProcedure,
		invite: inviteMembersProcedure,
		resendInvitation: resendInvitationProcedure,
		revokeInvitation: revokeInvitationProcedure,
	}),
	activities: router({
		getActivities: getActivitiesProcedure,
		getActivityById: getActivityByIdProcedure,
		getActivityStrokes: getActivityStrokesProcedure,
		createActivity: createActivityProcedure,
		updateActivity: updateActivityProcedure,
		deleteActivity: deleteActivityProcedure,
		attachActivityScreenshot: attachActivityScreenshotProcedure,
		getStravaAthlete: getStravaAthleteProcedure,
		getStravaActivities: getStravaActivitiesProcedure,
		connectStrava: connectStravaProcedure,
		disconnectStrava: disconnectStravaProcedure,
		syncStravaActivities: syncStravaActivitiesProcedure,
		getConcept2User: getConcept2UserProcedure,
		getConcept2Results: getConcept2ResultsProcedure,
		connectConcept2: connectConcept2Procedure,
		disconnectConcept2: disconnectConcept2Procedure,
		syncConcept2Activities: syncConcept2ActivitiesProcedure,
		connectRca: connectRcaProcedure,
		disconnectRca: disconnectRcaProcedure,
		syncRca: syncRcaProcedure,
		getPendingInboxBatches: getPendingInboxBatchesProcedure,
		processStravaInboxBatch: processStravaInboxBatchProcedure,
		processConcept2InboxBatch: processConcept2InboxBatchProcedure,
	}),
	boats: router({
		getBoats: getBoatsProcedure,
		getBoatById: getBoatByIdProcedure,
		createBoat: createBoatProcedure,
		createBoats: bulkCreateBoatsProcedure,
		updateBoat: updateBoatProcedure,
	}),
	workouts: router({
		getWorkouts: getWorkoutsProcedure,
		getWorkoutById: getWorkoutByIdProcedure,
		createWorkout: createWorkoutProcedure,
		updateWorkout: updateWorkoutProcedure,
	}),
	ergs: router({
		getErgs: getErgsProcedure,
		getErgById: getErgByIdProcedure,
		createErg: createErgProcedure,
		updateErg: updateErgProcedure,
		deleteErg: deleteErgProcedure,
		markErg: markErgProcedure,
	}),
	programs: router({
		getPrograms: getProgramsProcedure,
	}),
	users: router({
		getCurrentUser: getCurrentUserProcedure,
		getUserById: getUserByIdProcedure,
		getUserByUserId: getUserByUserIdProcedure,
		updateUserProfile: updateUserProfileProcedure,
		completeOnboarding: completeOnboardingProcedure,
	}),
	analytics: router({
		getAnalytics: getAnalyticsProcedure,
		getLeaderboard: getLeaderboardProcedure,
		getGroupMeters: getGroupMetersProcedure,
	}),
	admin: router({
		activities: router({
			getActivities: getActivitiesAdminProcedure,
			getActivityById: getActivityByIdAdminProcedure,
			createActivity: createActivityAdminProcedure,
			updateActivity: updateActivityAdminProcedure,
			deleteActivity: deleteActivityAdminProcedure,
		}),
	}),
	schedule: router({
		getWeek: getWeekProcedure,
		getEventById: getEventByIdProcedure,
		getResponses: getResponsesProcedure,
		getUpcoming: getUpcomingProcedure,
		rsvp: rsvpProcedure,
		nudge: nudgeProcedure,
		createEvent: createEventProcedure,
		createEvents: createEventsProcedure,
		updateEvent: updateEventProcedure,
		deleteEvent: deleteEventProcedure,
		saveTrainingWeek: saveTrainingWeekProcedure,
		getCalendarToken: getCalendarTokenProcedure,
		rotateCalendarToken: rotateCalendarTokenProcedure,
	}),
	notifications: router({
		getStatus: getStatusProcedure,
		subscribe: subscribeProcedure,
		unsubscribe: unsubscribeProcedure,
		setPreference: setPreferenceProcedure,
		sendTest: sendTestProcedure,
	}),
	chat: router({
		getChannels: getChannelsProcedure,
		getMembers: getChatMembersProcedure,
		getMessages: getMessagesProcedure,
		getThread: getThreadProcedure,
		sendMessage: sendMessageProcedure,
		replyInThread: replyInThreadProcedure,
		toggleReaction: toggleReactionProcedure,
		forwardMessage: forwardMessageProcedure,
		markRead: markReadProcedure,
		markUnread: markUnreadProcedure,
		startDm: startDmProcedure,
		addDmMembers: addDmMembersProcedure,
		leaveDm: leaveDmProcedure,
		deleteMessage: deleteMessageProcedure,
		editMessage: editMessageProcedure,
	}),
	feedback: router({
		submit: submitProcedure,
	}),
});

export type AppRouter = typeof appRouter;
