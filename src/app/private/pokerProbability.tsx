"use client";

/**
 * weird idea I had to make a poker hand probability calculator,
 * this was all done by chatgpt, but it does work
 * even though it looks ugly as hell
 */

import { Box, Button, FormControl, TextField, Typography } from "@mui/material";
import React, { useState } from "react";

// Predefined table sizes
const tableSizes = [2, 3, 6, 8, 9];

// Function to calculate probability of a hand combination for a specific table size
const calculateProbability = (handProbability: number, tableSize: number): number => {
	const noHandProb = Math.pow(1 - handProbability, tableSize);
	return (1 - noHandProb) * 100;
};

// Get the number of combinations for a given hand
const getHandCombinations = (hand: string): number => {
	if (hand.length === 2) {
		// Pocket pair (e.g., "AA")
		return 6; // 6 combinations
	} else if (hand.length === 3 && hand.toLowerCase().endsWith("s")) {
		// Suited hand (e.g., "AKs")
		return 4; // 4 combinations
	} else if (hand.length === 3 && hand.toLowerCase().endsWith("o")) {
		// Offsuit hand (e.g., "AKo")
		return 12; // 12 combinations
	} else {
		// Invalid format
		throw new Error(`Invalid hand format: ${hand}`);
	}
};

// Main component
const PokerProbability: React.FC = () => {
	const [handInput, setHandInput] = useState<string>("");
	const [results, setResults] = useState<Record<number, number> | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Function to parse hand combinations and calculate probabilities
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Clear previous errors
		setError(null);

		// Split and validate hand combinations
		const hands = handInput.split(",").map((hand) => hand.trim().toUpperCase());

		let totalCombinations = 0;

		try {
			// Calculate total combinations based on valid hands
			hands.forEach((hand) => {
				totalCombinations += getHandCombinations(hand);
			});
		} catch (err) {
			// Handle invalid hand format error
			setError((err as Error).message);
			return;
		}

		// Total number of starting hand combinations in poker is 1326
		const handProbability = totalCombinations / 1326;

		// Calculate probabilities for each table size
		const probabilities = tableSizes.reduce(
			(acc, size) => {
				acc[size] = calculateProbability(handProbability, size);
				return acc;
			},
			{} as Record<number, number>,
		);

		setResults(probabilities);
	};

	return (
		<Box className="rounded-lg">
			<Typography variant="h5" className="mb-4 font-semibold">
				Poker Hand Probability Calculator
			</Typography>

			<form onSubmit={handleSubmit}>
				<FormControl fullWidth className="mb-4">
					<TextField
						label="Enter Hand Combinations (e.g., AA, AKs, QJo)"
						variant="outlined"
						value={handInput}
						onChange={(e) => setHandInput(e.target.value)}
						placeholder="AA, AKs, QJo"
					/>
				</FormControl>

				<Button variant="contained" color="primary" fullWidth type="submit">
					Calculate Probabilities
				</Button>
			</form>

			{error && (
				<Typography color="error" className="mt-4 text-center">
					{error}
				</Typography>
			)}

			{results && (
				<Box className="mt-4">
					<Typography variant="h6" className="text-center">
						Probabilities for Different Table Sizes:
					</Typography>
					{tableSizes.map((size) => (
						<Typography key={size} className="mt-2 text-center">
							{size} Players: {results[size]?.toFixed(2)}%
						</Typography>
					))}
				</Box>
			)}
		</Box>
	);
};

export default PokerProbability;
