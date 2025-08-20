import * as actions from "./actions";
import * as actionTypes from "./actionTypes";
import * as cards from "./cards";
import * as games from "./games";
import * as players from "./players";
import * as timeouts from "./timeouts";
import * as userRoles from "./userRoles";
import * as users from "./users";

export const schema = {
  ...actions,
  ...cards,
  ...games,
  ...players,
  ...timeouts,
  ...users,
  ...userRoles,
  ...actionTypes,
};
