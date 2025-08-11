export type User = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown> & {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
};

export type AuthError = {
  message: string;
  status?: number;
  cause?: unknown;
};
