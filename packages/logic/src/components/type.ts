import type { RegistryAtoms, RegistryKey } from "../atoms";

export type NodeProps<T extends RegistryKey> = {
  id: string;
  data: { atoms: RegistryAtoms<T> };
  selected: boolean;
};
