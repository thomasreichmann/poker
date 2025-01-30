"use client";

import { Typography } from "@mui/material";
import { useState } from "react";
import useCheatCode from "~/app/_components/DevDashboard/useCheatCode";
import ModalBase from "~/app/_components/ModalBase";

function DevDashboardComponent() {
	const [isOpen, setIsOpen] = useState(true);

	const cheatCode = ["ArrowUp", "ArrowDown", "ArrowDown"];

	useCheatCode(cheatCode, () => setIsOpen(true));

	return (
		<ModalBase open={isOpen} onClose={() => setIsOpen(false)} showCloseButton>
			<Typography id="modal-modal-title" variant="h6" component="h2">
				Text in a modal
			</Typography>
			<Typography id="modal-modal-description" className="mt-2">
				Duis mollis, est non commodo luctus, nisi erat porttitor ligula.
			</Typography>
		</ModalBase>
	);
}

export default DevDashboardComponent;
