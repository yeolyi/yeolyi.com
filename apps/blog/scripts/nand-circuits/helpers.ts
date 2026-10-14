// Shared types, state, and subcircuit builders for NAND-based flow diagrams.

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { atoms: Record<string, unknown> };
  measured: { width: number; height: number };
  selected: boolean;
  dragging: boolean;
};

export type FlowEdge = {
  type: string;
  animated: boolean;
  selectable: boolean;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  id: string;
  selected: boolean;
};

export type In = { nodeId: string; handle: string };
export type Out = { nodeId: string; handle: string };

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════

let nc = 0;
let ec = 0;
const nodes: FlowNode[] = [];
const edges: FlowEdge[] = [];
const nodeOutputs: Record<string, Record<string, unknown>> = {};

export function getState() {
  return { nodes, edges, nodeOutputs };
}

export function resetState() {
  nc = 0;
  ec = 0;
  nodes.length = 0;
  edges.length = 0;
  for (const key of Object.keys(nodeOutputs)) delete nodeOutputs[key];
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

const nid = () => `n${nc++}`;
const eid = () => `e${ec++}`;

export function addNand(x: number, y: number): string {
  const id = nid();
  nodes.push({
    id,
    type: "nand",
    position: { x, y },
    data: {
      atoms: {
        type: "nand",
        inputAtoms: { in1: { init: null }, in2: { init: null } },
        outputAtoms: { out: { init: null } },
        effectAtom: {},
        id,
      },
    },
    measured: { width: 96, height: 64 },
    selected: false,
    dragging: false,
  });
  nodeOutputs[id] = { out: null };
  return id;
}

export function addBoolean(
  x: number,
  y: number,
  init: boolean,
  label: string | null,
): string {
  const id = nid();
  nodes.push({
    id,
    type: "number",
    position: { x, y },
    data: {
      atoms: {
        type: "boolean",
        inputAtoms: {},
        outputAtoms: { out: { init }, label: { init: label } },
        id,
      },
    },
    measured: { width: 40, height: 40 },
    selected: false,
    dragging: false,
  });
  nodeOutputs[id] = { out: init, label };
  return id;
}

export function addLabel(x: number, y: number, label: string | null): string {
  const id = nid();
  nodes.push({
    id,
    type: "label",
    position: { x, y },
    data: {
      atoms: {
        type: "label",
        inputAtoms: { in: { init: null } },
        outputAtoms: { label: { init: label }, out: { init: null } },
        effectAtom: {},
        id,
      },
    },
    measured: { width: 40, height: 40 },
    selected: false,
    dragging: false,
  });
  nodeOutputs[id] = { label, out: null };
  return id;
}

export function conn(
  src: string,
  srcH: string,
  tgt: string,
  tgtH: string,
): void {
  edges.push({
    type: "default",
    animated: true,
    selectable: true,
    source: src,
    sourceHandle: srcH,
    target: tgt,
    targetHandle: tgtH,
    id: eid(),
    selected: false,
  });
}

export function wire(src: Out, tgt: In): void {
  conn(src.nodeId, src.handle, tgt.nodeId, tgt.handle);
}

export function fanout(src: Out, targets: In[]): void {
  for (const tgt of targets) wire(src, tgt);
}

// ═══════════════════════════════════════════
// Subcircuit builders
// ═══════════════════════════════════════════

/**
 * D Latch (4 NANDs)
 *
 *   n1 = NAND(E, D) = S'
 *   n2 = NAND(E, S') = R'
 *   n3 = NAND(S', Q') = Q  [cross-coupled]
 *   n4 = NAND(R', Q) = Q'  [cross-coupled]
 */
export function createDLatch(x: number, y: number) {
  const n1 = addNand(x, y);
  const n2 = addNand(x, y + 100);
  const n3 = addNand(x + 160, y);
  const n4 = addNand(x + 160, y + 100);

  conn(n1, "out", n2, "in2");
  conn(n1, "out", n3, "in1");
  conn(n4, "out", n3, "in2");
  conn(n2, "out", n4, "in1");
  conn(n3, "out", n4, "in2");

  return {
    d: [{ nodeId: n1, handle: "in2" }] as In[],
    e: [
      { nodeId: n1, handle: "in1" },
      { nodeId: n2, handle: "in1" },
    ] as In[],
    q: { nodeId: n3, handle: "out" } as Out,
    qBar: { nodeId: n4, handle: "out" } as Out,
    qNodeId: n3,
    qBarNodeId: n4,
  };
}

/**
 * D Flip-Flop (9 NANDs: 1 NOT + 2 D-Latches)
 * Positive-edge triggered (master-slave)
 */
export function createDFF(x: number, y: number) {
  const notClk = addNand(x, y + 50);
  const master = createDLatch(x + 160, y);
  const slave = createDLatch(x + 480, y);

  fanout({ nodeId: notClk, handle: "out" }, master.e);
  fanout(master.q, slave.d);

  return {
    d: master.d,
    clk: [
      { nodeId: notClk, handle: "in1" },
      { nodeId: notClk, handle: "in2" },
      ...slave.e,
    ] as In[],
    q: slave.q,
    qBar: slave.qBar,
    slaveQId: slave.qNodeId,
    slaveQBarId: slave.qBarNodeId,
  };
}

/** N-bit Register (N × DFF = N*9 NANDs) */
export function createReg(x: number, y: number, bits: number) {
  const dffs = Array.from({ length: bits }, (_, i) =>
    createDFF(x, y + i * 250),
  );
  return {
    d: dffs.map((d) => d.d),
    clk: dffs.flatMap((d) => d.clk),
    q: dffs.map((d) => d.q),
    qBar: dffs.map((d) => d.qBar),
    slaveQIds: dffs.map((d) => d.slaveQId),
    slaveQBarIds: dffs.map((d) => d.slaveQBarId),
  };
}

/**
 * Half Adder (5 NANDs)
 *
 *   n1 = NAND(A, B)
 *   n2 = NAND(A, n1)
 *   n3 = NAND(n1, B)
 *   n4 = NAND(n1, n1) = AND(A,B) = Carry
 *   n5 = NAND(n2, n3) = XOR(A,B) = Sum
 */
export function createHA(x: number, y: number) {
  const n1 = addNand(x, y);
  const n2 = addNand(x + 160, y - 50);
  const n3 = addNand(x + 160, y + 50);
  const n4 = addNand(x + 160, y + 140);
  const n5 = addNand(x + 320, y);

  conn(n1, "out", n2, "in2");
  conn(n1, "out", n3, "in1");
  conn(n1, "out", n4, "in1");
  conn(n1, "out", n4, "in2");
  conn(n2, "out", n5, "in1");
  conn(n3, "out", n5, "in2");

  return {
    a: [
      { nodeId: n1, handle: "in1" },
      { nodeId: n2, handle: "in1" },
    ] as In[],
    b: [
      { nodeId: n1, handle: "in2" },
      { nodeId: n3, handle: "in2" },
    ] as In[],
    sum: { nodeId: n5, handle: "out" } as Out,
    carry: { nodeId: n4, handle: "out" } as Out,
  };
}

/**
 * Full Adder (9 NANDs)
 *
 *   n1 = NAND(A, B)
 *   n2 = NAND(A, n1)
 *   n3 = NAND(n1, B)
 *   n4 = NAND(n2, n3) = A XOR B = t
 *   n5 = NAND(t, Cin)
 *   n6 = NAND(t, n5)
 *   n7 = NAND(Cin, n5)
 *   n8 = NAND(n6, n7) = Sum
 *   n9 = NAND(n1, n5) = Cout
 */
export function createFA(x: number, y: number) {
  const n1 = addNand(x, y);
  const n2 = addNand(x + 160, y - 50);
  const n3 = addNand(x + 160, y + 50);
  const n4 = addNand(x + 320, y);
  const n5 = addNand(x + 480, y);
  const n6 = addNand(x + 640, y - 50);
  const n7 = addNand(x + 640, y + 50);
  const n8 = addNand(x + 800, y);
  const n9 = addNand(x + 480, y + 120);

  conn(n1, "out", n2, "in2");
  conn(n1, "out", n3, "in1");
  conn(n2, "out", n4, "in1");
  conn(n3, "out", n4, "in2");
  conn(n4, "out", n5, "in1");
  conn(n4, "out", n6, "in1");
  conn(n5, "out", n6, "in2");
  conn(n5, "out", n7, "in2");
  conn(n6, "out", n8, "in1");
  conn(n7, "out", n8, "in2");
  conn(n1, "out", n9, "in1");
  conn(n5, "out", n9, "in2");

  return {
    a: [
      { nodeId: n1, handle: "in1" },
      { nodeId: n2, handle: "in1" },
    ] as In[],
    b: [
      { nodeId: n1, handle: "in2" },
      { nodeId: n3, handle: "in2" },
    ] as In[],
    cin: [
      { nodeId: n5, handle: "in2" },
      { nodeId: n7, handle: "in1" },
    ] as In[],
    sum: { nodeId: n8, handle: "out" } as Out,
    cout: { nodeId: n9, handle: "out" } as Out,
  };
}

/** N-bit Ripple Carry Adder (5 + 9*(N-1) NANDs) */
export function createAdder(x: number, y: number, bits: number) {
  const ha = createHA(x, y);

  const fas: ReturnType<typeof createFA>[] = [];
  let carry = ha.carry;

  for (let i = 1; i < bits; i++) {
    const fa = createFA(x, y + i * 280);
    fanout(carry, fa.cin);
    carry = fa.cout;
    fas.push(fa);
  }

  return {
    a: [ha.a, ...fas.map((f) => f.a)],
    b: [ha.b, ...fas.map((f) => f.b)],
    sum: [ha.sum, ...fas.map((f) => f.sum)],
    carry,
  };
}

/**
 * AND gate (2 NANDs)
 *   n1 = NAND(A, B)
 *   n2 = NAND(n1, n1) = NOT(NAND(A,B)) = AND(A,B)
 */
export function createAND(x: number, y: number) {
  const n1 = addNand(x, y);
  const n2 = addNand(x + 160, y);

  conn(n1, "out", n2, "in1");
  conn(n1, "out", n2, "in2");

  return {
    a: [{ nodeId: n1, handle: "in1" }] as In[],
    b: [{ nodeId: n1, handle: "in2" }] as In[],
    out: { nodeId: n2, handle: "out" } as Out,
  };
}

/** Output JSON string */
export function toJSON() {
  return JSON.stringify(
    { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.2 }, nodeOutputs },
    null,
    2,
  );
}
