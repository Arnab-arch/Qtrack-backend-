export const ROLES = {
  VISITOR: "visitor",
  STAFF: "staff",
  ADMIN: "admin",
};

export const ROLE_HIERARCHY = {
  [ROLES.VISITOR]: 1,
  [ROLES.STAFF]: 2,
  [ROLES.ADMIN]: 3,
};

export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

export const hasHigherOrEqualRole = (roleA, roleB) => {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
};

export const getAllRoles = () => {
  return Object.values(ROLES);
};