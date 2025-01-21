"use client";

import Button from "@mui/material/Button";
import Input from "@mui/material/Input";
import { useState } from "react";
import { api } from "~/trpc/react";

export const UnsafeCode = () => {
	const [unsafeEvalCode, setUnsafeEvalCode] = useState<string>("");
	const [unsafeEvalResult, setUnsafeEvalResult] = useState<any>(null);
	const a = api.table.hello.useQuery();

	const b = api.useUtils();

	const handleEval = async () => {
		try {
			const evalApi = b;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const result = await eval(unsafeEvalCode);
			setUnsafeEvalResult(result);
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<form
			className="flex flex-col"
			onSubmit={(e) => {
				e.preventDefault();
				void handleEval();
			}}
		>
			<h1>Run unsafe eval code to call any procedure</h1>
			<Input value={unsafeEvalCode} onChange={(e) => setUnsafeEvalCode(e.target.value)} />
			<Button onClick={handleEval}>Eval</Button>

			<pre>{JSON.stringify(unsafeEvalResult, null, 2)}</pre>
		</form>
	);
};
