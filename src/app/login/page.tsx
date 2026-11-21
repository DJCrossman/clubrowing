import type { Metadata } from "next";
import { LoginScene } from "@/scenes/auth/LoginScene/LoginScene";

export const metadata: Metadata = {
	title: "Login · Club Rowing",
	description: "The Club Rowing app",
};

export default function LoginPage() {
	return <LoginScene />;
}
