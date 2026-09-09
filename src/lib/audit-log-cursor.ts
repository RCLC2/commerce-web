export type AuditCursorState = {
  current?: string;
  previous: Array<string | undefined>;
};

export function initialAuditCursor(): AuditCursorState {
  return { current: undefined, previous: [] };
}

export function advanceAuditCursor(
  state: AuditCursorState,
  nextCursor: string | null | undefined,
): AuditCursorState {
  if (!nextCursor) return state;
  return {
    current: nextCursor,
    previous: [...state.previous, state.current],
  };
}

export function previousAuditCursor(state: AuditCursorState): AuditCursorState {
  if (!state.previous.length) return state;
  return {
    current: state.previous.at(-1),
    previous: state.previous.slice(0, -1),
  };
}
