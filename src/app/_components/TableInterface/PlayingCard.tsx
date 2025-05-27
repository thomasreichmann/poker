import { styled } from "@mui/material";
import { type Card as CardType } from "~/server/db/schema/cards";

const SUIT_SYMBOLS = {
	hearts: "♥",
	diamonds: "♦",
	clubs: "♣",
	spades: "♠",
} as const;

const CardContainer = styled("div")(({ theme }) => ({
	position: "relative",
	width: "60px",
	height: "84px",
	backgroundColor: "white",
	borderRadius: "6px",
	boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	padding: "6px",
	transition: "transform 0.2s ease-in-out",
	"&:hover": {
		transform: "translateY(-4px)",
		boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
	},
}));

const CardCorner = styled("div")<{ position: "top-left" | "bottom-right" }>(({ position }) => ({
	position: "absolute",
	...(position === "top-left" && {
		top: "6px",
		left: "6px",
	}),
	...(position === "bottom-right" && {
		bottom: "6px",
		right: "6px",
		transform: "rotate(180deg)",
	}),
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: "4px",
}));

const CardRank = styled("div")<{ color: "red" | "black" }>(({ color }) => ({
	fontSize: "1.1rem",
	fontWeight: "bold",
	color,
	fontFamily: "Georgia, serif",
	lineHeight: 1,
	letterSpacing: "-0.5px",
}));

const CardSuit = styled("div")<{ color: "red" | "black" }>(({ color }) => ({
	fontSize: "1.1rem",
	color,
	fontFamily: "Georgia, serif",
	lineHeight: 1,
	marginTop: "1px",
}));

const CardCenter = styled("div")<{ color: "red" | "black" }>(({ color }) => ({
	fontSize: "2.2rem",
	color,
	fontFamily: "Georgia, serif",
	position: "absolute",
	top: "50%",
	left: "50%",
	transform: "translate(-50%, -50%)",
	lineHeight: 1,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: "100%",
	height: "100%",
}));

const CardBack = styled("div")({
	position: "relative",
	width: "60px",
	height: "84px",
	backgroundColor: "#2c3e50",
	borderRadius: "6px",
	boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	"&::before": {
		content: '""',
		position: "absolute",
		top: "4px",
		left: "4px",
		right: "4px",
		bottom: "4px",
		border: "2px solid #34495e",
		borderRadius: "4px",
	},
	"&::after": {
		content: '""',
		position: "absolute",
		top: "8px",
		left: "8px",
		right: "8px",
		bottom: "8px",
		background: "linear-gradient(45deg, #3498db, #2980b9)",
		borderRadius: "2px",
	},
});

interface PlayingCardProps {
	card?: CardType;
	showBack?: boolean;
}

export default function PlayingCard({ card, showBack = false }: PlayingCardProps) {
	if (showBack || !card) {
		return <CardBack />;
	}

	const isRed = card.suit === "hearts" || card.suit === "diamonds";
	const color = isRed ? "red" : "black";
	const suitSymbol = SUIT_SYMBOLS[card.suit];

	return (
		<CardContainer>
			<CardCorner position="top-left">
				<CardRank color={color}>{card.rank}</CardRank>
				<CardSuit color={color}>{suitSymbol}</CardSuit>
			</CardCorner>
			<CardCenter color={color}>{suitSymbol}</CardCenter>
			<CardCorner position="bottom-right">
				<CardRank color={color}>{card.rank}</CardRank>
				<CardSuit color={color}>{suitSymbol}</CardSuit>
			</CardCorner>
		</CardContainer>
	);
}
