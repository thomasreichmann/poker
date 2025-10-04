export const queryKeys = {
  game: {
    getById: (id: string) => [{ scope: "trpc", route: "game.getById", id }],
  },
} as const;
