/** Additional microgames. All coordinates use a device-independent 0..100 space. */
export type SkillGameId = "freeze-dance" | "echo-gestures" | "memory-spot" | "red-light" | "shadow-match" | "hold-release" | "crown-control";
export type SkillScore = {
    score: number;
    note: string;
    submittedAt: number;
};
export type SkillRound = {
    gameId: SkillGameId;
    instructionsUntil: number;
    startsAt: number;
    endsAt: number;
    seed: number;
    submissions: Record<string, SkillScore>;
};
export type GestureName = "tap" | "hold" | "left" | "right" | "up" | "down";
export type GestureAttempt = {
    dx: number;
    dy: number;
    duration: number;
    at: number;
    cancelled: boolean;
};
export type MotionSample = {
    x: number;
    y: number;
    at: number;
};
export type PressChange = {
    held: boolean;
    at: number;
};
export type SkillEvidence = {
    kind: "trace";
    samples: MotionSample[];
} | {
    kind: "gestures";
    gestures: GestureAttempt[];
} | {
    kind: "spot";
    x: number;
    y: number;
    at: number;
} | {
    kind: "run";
    changes: PressChange[];
} | {
    kind: "choice";
    choice: string;
    at: number;
} | {
    kind: "release";
    downAt: number;
    upAt: number;
    cancelled: boolean;
};
