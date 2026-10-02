/**
 * BIP 342's signature-budget constants, in a module with no imports so that
 * figures can use them without pulling the recorder (and its curve library)
 * into a client bundle. tapscript.ts uses and re-exports them.
 *
 * Each input's budget starts at 50 plus its serialized witness size; each
 * signature opcode run with a non-empty signature costs 50.
 */
export const BUDGET_BASE = 50;
export const SIGOP_COST = 50;
