/** The first `n` characters and an ellipsis. A figure that shortens a value gives it in full elsewhere (a disclosure or its text equivalent). */
export const short = (s: string, n = 8) => `${s.slice(0, n)}…`;
