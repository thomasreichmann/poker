import { useEffect, useState } from "react";

const useCheatCode = (sequence: string[], onSuccess: () => void) => {
	const [input, setInput] = useState<string[]>([]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			setInput((prev) => [...prev, event.key].slice(-sequence.length));

			if ([...input, event.key].slice(-sequence.length).join(",") === sequence.join(",")) {
				onSuccess();
				setInput([]);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [input, sequence, onSuccess]);
};

export default useCheatCode;
