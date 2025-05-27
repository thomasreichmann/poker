"use client";

import AnalyticsIcon from "@mui/icons-material/Analytics";
import UserIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import UserManagement from "./UserManagement";

const SettingsContent = UserManagement;
const AnalyticsContent = UserManagement;

interface NavItem {
	label: string;
	icon: React.ElementType;
	content: React.ElementType;
}

const navItems: NavItem[] = [
	{ label: "Users", icon: UserIcon, content: UserManagement },
	{ label: "Settings", icon: SettingsIcon, content: SettingsContent },
	{ label: "Analytics", icon: AnalyticsIcon, content: AnalyticsContent },
];

function DevDashboardComponent() {
	const [selectedItem, setSelectedItem] = useState<NavItem>(navItems[0]!);

	return (
		<div className="flex">
			<div id="dev-dashboard-drawer" className="flex flex-col">
				<Typography variant="h5" className="mr-12 p-4 font-bold">
					Dev Dashboard
				</Typography>
				<List component="nav">
					{navItems.map(({ label, icon: Icon }) => (
						<ListItemButton key={label}>
							<ListItemIcon sx={{ minWidth: 36 }}>
								<Icon />
							</ListItemIcon>
							<ListItemText primary={label} />
						</ListItemButton>
					))}
				</List>
			</div>
			<div id="dev-dashboard-content">
				<selectedItem.content />
			</div>
		</div>
	);
}

export default DevDashboardComponent;
