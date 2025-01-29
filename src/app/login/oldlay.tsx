import { type Metadata } from "next";
import "~/styles/globals.css";
import Providers from "../_components/Providers";

export const metadata: Metadata = {
	title: "Login - Poker",
	description: "Login to Poker",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
	return <Providers>{children}</Providers>;
}
