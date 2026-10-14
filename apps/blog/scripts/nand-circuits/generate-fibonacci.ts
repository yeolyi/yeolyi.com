/**
 * Generates an N-bit fibonacci calculator circuit using only NAND gates.
 * Output is a ReactFlow JSON compatible with the flow component.
 *
 * Architecture:
 *   Reg A = F(n-1), Reg B = F(n-2)
 *   Each clock cycle: Sum = A + B → Reg A, old A → Reg B
 *   Initial: A=1, B=1
 *
 * Components (all from NAND gates):
 *   8-bit Adder:  1 HA(5) + 7 FA(9×7) = 68 NANDs
 *   Reg A:        8 DFF × 9 = 72 NANDs
 *   Reg B:        8 DFF × 9 = 72 NANDs
 *   Total:        212 NAND gates + 1 CLK input + 9 labels = 222 nodes
 *
 * Usage: npx tsx scripts/nand-circuits/generate-fibonacci.ts [bits]
 */

import {
  addBoolean,
  addLabel,
  createAdder,
  createReg,
  fanout,
  getState,
  type Out,
  toJSON,
  wire,
} from "./helpers";

const BITS = Number(process.argv[2]) || 8;

// ═══════════════════════════════════════════
// Main assembly
// ═══════════════════════════════════════════

const regHeight = BITS * 250;
const clkId = addBoolean(0, regHeight / 2, false, "CLK");
const clk: Out = { nodeId: clkId, handle: "out" };

const regA = createReg(300, 0, BITS);
const regB = createReg(300, regHeight + 200, BITS);
const adder = createAdder(1200, 0, BITS);

// CLK → both registers
fanout(clk, regA.clk);
fanout(clk, regB.clk);

// RegA.Q → Adder.A and RegA.Q → RegB.D
for (let i = 0; i < BITS; i++) {
  fanout(regA.q[i], adder.a[i]);
  fanout(regA.q[i], regB.d[i]);
}

// RegB.Q → Adder.B
for (let i = 0; i < BITS; i++) {
  fanout(regB.q[i], adder.b[i]);
}

// Adder.Sum → RegA.D (feedback)
for (let i = 0; i < BITS; i++) {
  fanout(adder.sum[i], regA.d[i]);
}

// Labels for RegA output (current fibonacci number)
for (let i = BITS - 1; i >= 0; i--) {
  const id = addLabel(2300, (BITS - 1 - i) * 80, `bit${i}`);
  wire(regA.q[i], { nodeId: id, handle: "in" });
}

// Overflow label
const ovfId = addLabel(2300, BITS * 80, "overflow");
wire(adder.carry, { nodeId: ovfId, handle: "in" });

// Initial register values: RegA = 00000001 (1), RegB = 00000001 (1)
const { nodeOutputs } = getState();
const initBits = Array.from({ length: BITS }, (_, i) => i === 0);
for (let i = 0; i < BITS; i++) {
  nodeOutputs[regA.slaveQIds[i]] = { out: initBits[i] };
  nodeOutputs[regA.slaveQBarIds[i]] = { out: !initBits[i] };
  nodeOutputs[regB.slaveQIds[i]] = { out: initBits[i] };
  nodeOutputs[regB.slaveQBarIds[i]] = { out: !initBits[i] };
}

console.log(toJSON());
