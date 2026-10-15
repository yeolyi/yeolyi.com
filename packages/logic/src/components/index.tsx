import type { ComponentType } from "react";
import type { RegistryKey } from "../atoms";
import { BooleanNode } from "./BooleanNode";
import {
  DecoderNode,
  DLatchNode,
  FullAdderNode,
  HalfAdderNode,
  MuxNode,
} from "./BoxNode";
import { AndNode, NandNode, NorNode, NotNode, OrNode } from "./GateNode";
import { LabelNode } from "./LabelNode";
import type { NodeProps } from "./type";

export const nodeTypes = {
  number: BooleanNode,
  nand: NandNode,
  halfAdder: HalfAdderNode,
  or: OrNode,
  fullAdder: FullAdderNode,
  label: LabelNode,
  nor: NorNode,
  and: AndNode,
  not: NotNode,
  dLatch: DLatchNode,
  mux: MuxNode,
  decoder: DecoderNode,
} satisfies Record<RegistryKey, ComponentType<NodeProps<RegistryKey>>>;
