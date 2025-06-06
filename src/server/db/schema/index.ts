import * as actions from "./actions";
import * as cards from "./cards";
import * as games from "./games";
import * as players from "./players";
import * as timeouts from "./timeouts";
import * as users from "./users";

export const schema = { ...actions, ...cards, ...games, ...players, ...timeouts, ...users };
