"use client";

import { useState } from "react";
import useCheatCode from "~/app/_components/DevDashboard/useCheatCode";
import ModalBase from "~/app/_components/ModalBase";

function DevDashboardModal({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(true);

	const cheatCode = ["ArrowUp", "ArrowDown", "ArrowDown"];

	useCheatCode(cheatCode, () => setIsOpen(true));

	return (
		<ModalBase open={isOpen} onClose={() => setIsOpen(false)} showCloseButton>
			{children}
		</ModalBase>
	);
}

export default DevDashboardModal;
