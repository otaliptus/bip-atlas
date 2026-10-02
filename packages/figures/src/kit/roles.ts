/**
 * Fixed meanings shared by every figure on the site (spec §4.3). A role sets
 * a fill colour through CSS (`k-fill--<role>` pastel, `k-mark--<role>`
 * saturated); figures must also carry a second cue (a label or pattern).
 */
export type Role = "secret" | "public" | "hash" | "sig" | "check" | "net" | "time" | "hidden" | "plain";
