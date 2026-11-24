import { after } from "next/server";

export type TaskManager = {
	runAfterResponse: (task: () => Promise<unknown>) => void;
};

export function createTaskManager(): TaskManager {
	return {
		runAfterResponse: (task) => after(task),
	};
}
