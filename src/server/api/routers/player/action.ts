import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type TRPCContext, createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { ActionsEnum, publicTables } from "~/server/db/schema";

const actSchema = z.discriminatedUnion("action", [
	z.object({
		action: z.literal(ActionsEnum.enum.bet),
		amount: z.number(),
	}),
	z.object({
		action: z.literal(ActionsEnum.enum.fold),
	}),
	z.object({
		action: z.literal(ActionsEnum.enum.check),
	}),
]);

export type Action = z.infer<typeof actSchema>;

async function getTable(ctx: TRPCContext, tableId: number) {
	const table = await ctx.db.query.publicTables.findFirst({
		where: (table, { eq }) => eq(table.id, tableId),
		with: {
			privatePlayerState: true,
		},
	});

	if (!table) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Table not found",
		});
	}

	return table;
}

type Table = Awaited<ReturnType<typeof getTable>>;

function getPlayer(table: Table, userId: string) {
	const player = table.privatePlayerState.find((player) => player.userId === userId);

	if (!player) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Player not found",
		});
	}

	return player;
}

function isBettingRoundComplete(table: Table) {
	const playersNotFolded = table.privatePlayerState.filter((player) => !player.folded);
	const highestBet = Math.max(...table.bets);

	return playersNotFolded.every((player) => table.bets[player.position] == highestBet);
}

function getNextPlayerPosition(table: Table): number {
	const players = table.privatePlayerState;
	if (players.length === 0) return 0;

	const sortedPlayers = [...players].sort((a, b) => a.position - b.position);
	const currentIndex = sortedPlayers.findIndex((player) => player.position === table.currentTurn);
	const startIndex = currentIndex >= 0 ? currentIndex : 0;
	const nextIndex = (startIndex + 1) % sortedPlayers.length;

	while (nextIndex !== startIndex) {
		if (!sortedPlayers[nextIndex]?.folded) {
			const position = sortedPlayers[nextIndex]?.position;
			if (position === undefined) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Player position not found",
				});
			}
			return position;
		}
	}

	if (!sortedPlayers[startIndex]?.folded) {
		const position = sortedPlayers[startIndex]?.position;
		if (position === undefined) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Player position not found",
			});
		}
		return position;
	}

	return 0;
}

export const actionRouter = createTRPCRouter({
	act: privateProcedure
		.input(z.object({ tableId: z.number() }).and(actSchema))
		.mutation(async ({ ctx, input }) => {
			switch (input.action) {
				case ActionsEnum.enum.bet:
					const table = await getTable(ctx, input.tableId);
					const player = getPlayer(table, ctx.user.id);

					const stack = table.stacks[player.position];
					if (!stack) {
						throw new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: "Stack not found",
						});
					}

					if (input.amount > stack) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Not enough chips to bet",
						});
					}

					let action: z.infer<typeof ActionsEnum>;

					// Check if the player is betting 0 and no one has bet anything yet, if so, it's a check,
					if (input.amount == 0) {
						if (table.bets.every((bet) => bet === 0)) {
							action = "check";
						} else {
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: "Cannot check with 0 bet",
							});
						}
					} else {
						const highestBet = Math.max(...table.bets);
						if (input.amount > highestBet + table.bigBlind) {
							action = "bet";
						} else if (input.amount === highestBet) {
							action = "call";
						} else {
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: "Invalid bet amount",
							});
						}
					}

					let updatedTable = (
						await ctx.db
							.update(publicTables)
							.set({
								actions: table.actions.map((oldAction, index) =>
									index === player.position
										? action
										: (oldAction as string) === "NULL"
											? null!
											: oldAction,
								),
								bets: table.bets.map((bet, index) =>
									index === player.position ? input.amount : bet,
								),
								stacks: table.stacks.map((stack, index) =>
									index === player.position ? stack - input.amount : stack,
								),
								pot: table.pot + input.amount,
								currentTurn: getNextPlayerPosition(table),
							})
							.where(eq(publicTables.id, table.id))
							.returning()
					)[0];

					// TODO:
					/**
					 * BASICAMENTE, a logica ainda precisa ser debugada, nao tenho como ter certeza ainda
					 * se a logica para entrar na mesa esta correta, se ele conseguiria lidar com uma ação, tendo apenas
					 * um jogador na mesa, ou se a logica mesmo com varios jogadores esteja correta, por enquanto, quando
					 * eu tento fazer um bet valido, ele ainda me diz que o valor da bet está invalido.
					 * então nada aqui pode ser considerado funcional e seguro, boa sorte
					 */

					if (!updatedTable) {
						throw new TRPCError({
							code: "INTERNAL_SERVER_ERROR",
							message: "Table not returned after updating",
						});
					}

					if (isBettingRoundComplete(await getTable(ctx, input.tableId))) {
						updatedTable = (
							await ctx.db
								.update(publicTables)
								.set({
									actions: Array(updatedTable.seatCount).fill(null),
									bets: Array(updatedTable.seatCount).fill(null),
								})
								.where(eq(publicTables.id, updatedTable.id))
								.returning()
						)[0];

						if (!updatedTable) {
							throw new TRPCError({
								code: "INTERNAL_SERVER_ERROR",
								message: "Table not returned after updating",
							});
						}
					}

					return updatedTable;
				case ActionsEnum.enum.fold:
					return await handleFold(ctx, input.tableId);
				default:
					throw new Error("Invalid action");
			}
		}),
});

async function handleFold(ctx: TRPCContext, tableId: number) {
	const table = await getTable(ctx, tableId);
	const player = getPlayer(table, ctx.user!.id);

	const updatedTable = await ctx.db
		.update(publicTables)
		.set({
			actions: table.actions.map((action, index) =>
				index === player.position ? "fold" : action,
			),
			currentTurn: getNextPlayerPosition(table),
			bets: table.bets.map((bet, index) => (index === player.position ? -1 : bet)),
		})
		.where(eq(publicTables.id, table.id))
		.returning();

	if (!updatedTable) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Table not returned after updating",
		});
	}

	return updatedTable;
}
