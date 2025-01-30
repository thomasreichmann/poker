"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Backdrop, Fade, IconButton, LinearProgress, Modal, Paper } from "@mui/material";
import React, { useRef } from "react";

function ModalBase(props: {
	open: boolean;
	onClose?: () => void;
	children: React.ReactNode;
	loading?: boolean;
	showCloseButton?: boolean;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	return (
		<Modal
			open={props.open ?? false}
			onClose={props.onClose}
			aria-labelledby="modal-modal-title"
			aria-describedby="modal-modal-description"
			closeAfterTransition
			slots={{ backdrop: Backdrop }}
			slotProps={{
				backdrop: {
					timeout: 500,
				},
			}}
		>
			<Fade in={props.open}>
				<Paper
					className="absolute left-1/2 top-1/2 max-h-[80vh] w-max max-w-[80vw] -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto p-3 focus-visible:outline-none"
					component="div"
					ref={containerRef}
				>
					<div className="absolute left-0 top-0 flex w-full flex-col">
						<Fade in={props.loading}>
							<LinearProgress />
						</Fade>
						{props.showCloseButton && props.onClose && (
							<IconButton
								onClick={props.onClose}
								className="ml-auto mr-2 mt-2"
								aria-label="close"
								size="small"
							>
								<CloseIcon fontSize="inherit" />
							</IconButton>
						)}
					</div>

					{props.children}
				</Paper>
			</Fade>
		</Modal>
	);
}

export default ModalBase;
