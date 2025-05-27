"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, LinearProgress, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { login, signup } from "./actions";

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(3, "Password must be at least 6 characters long"),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function LoginPage() {
	const { register, handleSubmit, formState, setError } = useForm<LoginSchema>({
		resolver: zodResolver(loginSchema),
	});

	const { errors } = formState;

	const handleAuth = async (
		action: (data: LoginSchema) => Promise<string | null>,
		data: LoginSchema,
	) => {
		const error = await action(data);

		if (error) return setError("root.server", { message: error });
	};

	return (
		<main className="flex h-screen flex-col items-center justify-center gap-4">
			<form
				noValidate
				className="flex flex-col gap-2"
				onSubmit={handleSubmit((data) => handleAuth(login, data))}
			>
				{/* display for error messages that happened during server action */}
				{formState.errors.root?.server && (
					<p className="text-red-500">{formState.errors.root.server.message}</p>
				)}
				<TextField
					{...register("email")}
					label="Email"
					id="email"
					name="email"
					type="email"
					required
					fullWidth
					error={!!errors.email}
					helperText={errors.email?.message}
				/>

				<TextField
					{...register("password")}
					label="Password"
					id="password"
					name="password"
					type="password"
					required
					fullWidth
					error={!!errors.password}
					helperText={errors.password?.message}
				/>

				<Button type="submit" variant="contained" fullWidth>
					Login
				</Button>

				<Button
					type="button"
					variant="outlined"
					fullWidth
					onClick={handleSubmit((data) => handleAuth(signup, data))}
				>
					Sign up
				</Button>
				{formState.isSubmitting && <LinearProgress />}
			</form>
		</main>
	);
}
