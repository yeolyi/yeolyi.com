/**
 * Generates a 4×4 bit multiplier circuit using only NAND gates.
 * Output is a ReactFlow JSON compatible with the flow component.
 *
 * Architecture: Array Multiplier (purely combinational)
 *
 *         A3 A2 A1 A0
 *     ×   B3 B2 B1 B0
 *     ────────────────────
 *                  a0b0                    → P0
 *             a1b0 a0b1                    → add → P1
 *        a2b0 a1b1 a0b2                   → add → P2
 *   a3b0 a2b1 a1b2 a0b3                   → add → P3
 *   a3b1 a2b2 a1b3                        → add → P4
 *   a3b2 a2b3                             → add → P5
 *   a3b3                                  → add → P6, P7
 *
 * Components:
 *   16 AND gates (2 NANDs each) = 32 NANDs
 *   4 Half Adders (5 NANDs each) = 20 NANDs
 *   8 Full Adders (9 NANDs each) = 72 NANDs
 *   Total: 124 NAND gates + 8 inputs + 8 labels = 140 nodes
 *
 * Usage: npx tsx scripts/nand-circuits/generate-multiplier.ts
 */

import {
  addBoolean,
  addLabel,
  createAND,
  createFA,
  createHA,
  fanout,
  type Out,
  toJSON,
  wire,
} from "./helpers";

// ═══════════════════════════════════════════
// Layout constants
// ═══════════════════════════════════════════

const AND_W = 400; // horizontal spacing between AND columns
const AND_H = 200; // vertical spacing between AND rows
const ADDER_X = 1200; // x offset for adder array
const ADDER_ROW_Y = 300; // vertical spacing between adder rows

// ═══════════════════════════════════════════
// Inputs: A0–A3, B0–B3
// ═══════════════════════════════════════════

const A: Out[] = [];
const B: Out[] = [];

for (let i = 0; i < 4; i++) {
  const id = addBoolean(0, i * 100, false, `A${i}`);
  A.push({ nodeId: id, handle: "out" });
}
for (let i = 0; i < 4; i++) {
  const id = addBoolean(0, 400 + i * 100, false, `B${i}`);
  B.push({ nodeId: id, handle: "out" });
}

// ═══════════════════════════════════════════
// Partial products: pp[i][j] = Ai AND Bj
// ═══════════════════════════════════════════

const pp: Out[][] = Array.from({ length: 4 }, () => []);

for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    const and = createAND(300 + j * AND_W, i * AND_H);
    fanout(A[i], and.a);
    fanout(B[j], and.b);
    pp[i][j] = and.out;
  }
}

// ═══════════════════════════════════════════
// Addition array
// ═══════════════════════════════════════════

// P0 = a0*b0 (direct)
const P: Out[] = [];
P[0] = pp[0][0];

// ─── Row 1: combine partial products where i+j = 1,2,3,4 ───

// Pos 1: HA(a1b0, a0b1) → P1
const r1ha1 = createHA(ADDER_X, 0);
fanout(pp[1][0], r1ha1.a);
fanout(pp[0][1], r1ha1.b);
P[1] = r1ha1.sum;

// Pos 2: FA(a2b0, a1b1, carry_from_pos1)
const r1fa2 = createFA(ADDER_X, ADDER_ROW_Y);
fanout(pp[2][0], r1fa2.a);
fanout(pp[1][1], r1fa2.b);
fanout(r1ha1.carry, r1fa2.cin);

// Pos 3: FA(a3b0, a2b1, carry_from_pos2)
const r1fa3 = createFA(ADDER_X, ADDER_ROW_Y * 2);
fanout(pp[3][0], r1fa3.a);
fanout(pp[2][1], r1fa3.b);
fanout(r1fa2.cout, r1fa3.cin);

// Pos 4: HA(a3b1, carry_from_pos3)
const r1ha4 = createHA(ADDER_X, ADDER_ROW_Y * 3);
fanout(pp[3][1], r1ha4.a);
fanout(r1fa3.cout, r1ha4.b);

// ─── Row 2: add PP[2] (a0b2, a1b2, a2b2, a3b2) ───

// Pos 2: HA(r1fa2.sum, a0b2) → P2
const r2ha2 = createHA(ADDER_X + 1200, 0);
fanout(r1fa2.sum, r2ha2.a);
fanout(pp[0][2], r2ha2.b);
P[2] = r2ha2.sum;

// Pos 3: FA(r1fa3.sum, a1b2, carry_from_pos2)
const r2fa3 = createFA(ADDER_X + 1200, ADDER_ROW_Y);
fanout(r1fa3.sum, r2fa3.a);
fanout(pp[1][2], r2fa3.b);
fanout(r2ha2.carry, r2fa3.cin);

// Pos 4: FA(r1ha4.sum, a2b2, carry_from_pos3)
const r2fa4 = createFA(ADDER_X + 1200, ADDER_ROW_Y * 2);
fanout(r1ha4.sum, r2fa4.a);
fanout(pp[2][2], r2fa4.b);
fanout(r2fa3.cout, r2fa4.cin);

// Pos 5: FA(r1ha4.carry, a3b2, carry_from_pos4)
const r2fa5 = createFA(ADDER_X + 1200, ADDER_ROW_Y * 3);
fanout(r1ha4.carry, r2fa5.a);
fanout(pp[3][2], r2fa5.b);
fanout(r2fa4.cout, r2fa5.cin);

// ─── Row 3: add PP[3] (a0b3, a1b3, a2b3, a3b3) ───

// Pos 3: HA(r2fa3.sum, a0b3) → P3
const r3ha3 = createHA(ADDER_X + 2400, 0);
fanout(r2fa3.sum, r3ha3.a);
fanout(pp[0][3], r3ha3.b);
P[3] = r3ha3.sum;

// Pos 4: FA(r2fa4.sum, a1b3, carry_from_pos3) → P4
const r3fa4 = createFA(ADDER_X + 2400, ADDER_ROW_Y);
fanout(r2fa4.sum, r3fa4.a);
fanout(pp[1][3], r3fa4.b);
fanout(r3ha3.carry, r3fa4.cin);
P[4] = r3fa4.sum;

// Pos 5: FA(r2fa5.sum, a2b3, carry_from_pos4) → P5
const r3fa5 = createFA(ADDER_X + 2400, ADDER_ROW_Y * 2);
fanout(r2fa5.sum, r3fa5.a);
fanout(pp[2][3], r3fa5.b);
fanout(r3fa4.cout, r3fa5.cin);
P[5] = r3fa5.sum;

// Pos 6: FA(r2fa5.carry, a3b3, carry_from_pos5) → P6, P7=carry
const r3fa6 = createFA(ADDER_X + 2400, ADDER_ROW_Y * 3);
fanout(r2fa5.cout, r3fa6.a);
fanout(pp[3][3], r3fa6.b);
fanout(r3fa5.cout, r3fa6.cin);
P[6] = r3fa6.sum;
P[7] = r3fa6.cout;

// ═══════════════════════════════════════════
// Output labels: P0–P7
// ═══════════════════════════════════════════

const labelX = ADDER_X + 3600;
for (let i = 0; i < 8; i++) {
  const id = addLabel(labelX, i * 80, `P${i}`);
  wire(P[i], { nodeId: id, handle: "in" });
}

console.log(toJSON());
