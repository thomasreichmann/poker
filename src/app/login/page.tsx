import { TextField } from "@mui/material";
import { login, signup } from "./actions";

export default function LoginPage() {
	return (
		<main className="flex h-screen flex-col items-center justify-center gap-4">
			<form className="flex flex-col gap-2">
				<TextField label="Email" id="email" name="email" type="email" required />
				<TextField
					label="Password"
					id="password"
					name="password"
					type="password"
					required
				/>
				<button formAction={login}>Login</button>
				<button formAction={signup}>Sign up</button>
			</form>
		</main>
	);
}
