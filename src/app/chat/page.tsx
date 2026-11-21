import type { Metadata } from "next";
import { ChatListScene } from "@/scenes/chat";

export const metadata: Metadata = {
	title: "Chat · Club Rowing",
};

export default function ChatPage() {
	return <ChatListScene />;
}
