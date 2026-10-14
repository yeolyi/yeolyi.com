import {
  type Edge,
  type Node,
  type ReactFlowInstance,
  useOnSelectionChange,
} from "@xyflow/react";
import IconButton from "@yeolyi/ui/IconButton";
import {
  Folder,
  Lock,
  LockOpen,
  Maximize,
  Minus,
  Plus,
  Save,
  Trash,
} from "lucide-react";
import { useCallback, useState } from "react";
import { minZoomOptions } from "../constants";
import type { TouchDeviceState } from "../hooks/useMobileState";

interface ControlsProps {
  rfInstance: ReactFlowInstance | null;
  touchOnlyState: TouchDeviceState;
  setTouchOnlyState: (value: TouchDeviceState) => void;
  onSave: () => void;
  onRestore: () => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

export function Controls({
  rfInstance,
  touchOnlyState,
  setTouchOnlyState,
  onSave,
  onRestore,
  onDeleteNode,
  onDeleteEdge,
}: ControlsProps) {
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  const onChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNodes(nodes.map((node) => node.id));
      setSelectedEdges(edges.map((edge) => edge.id));
    },
    [],
  );

  useOnSelectionChange({ onChange });

  const onDelete = () => {
    for (const node of selectedNodes) {
      onDeleteNode(node);
    }
    for (const edge of selectedEdges) {
      onDeleteEdge(edge);
    }
  };

  if (touchOnlyState.type === "loading") {
    return null;
  }

  const isEnabled =
    touchOnlyState.type === "desktop" ||
    (touchOnlyState.type === "mobile" && touchOnlyState.value);

  return (
    <div className="flex shrink-0 gap-1">
      {touchOnlyState.type === "desktop" && (
        <>
          <IconButton
            className="shrink-0"
            aria-label="확대"
            onClick={() => rfInstance?.zoomIn()}
          >
            <Plus />
          </IconButton>
          <IconButton
            className="shrink-0"
            aria-label="축소"
            onClick={() => rfInstance?.zoomOut()}
          >
            <Minus />
          </IconButton>
        </>
      )}

      <IconButton
        className="shrink-0"
        aria-label="화면에 맞추기"
        onClick={() => rfInstance?.fitView(minZoomOptions)}
        disabled={!isEnabled}
      >
        <Maximize />
      </IconButton>

      {touchOnlyState.type === "mobile" && (
        <>
          <IconButton
            className="shrink-0"
            aria-label="선택 삭제"
            onClick={onDelete}
            disabled={
              !touchOnlyState.value ||
              (selectedNodes.length === 0 && selectedEdges.length === 0)
            }
          >
            <Trash />
          </IconButton>
          <IconButton
            className="shrink-0"
            aria-label={touchOnlyState.value ? "편집 잠그기" : "편집 잠금 풀기"}
            onClick={() =>
              setTouchOnlyState({
                type: "mobile",
                value: !touchOnlyState.value,
              })
            }
          >
            {touchOnlyState.value ? <LockOpen /> : <Lock />}
          </IconButton>
        </>
      )}

      <IconButton className="shrink-0" aria-label="저장" onClick={onSave}>
        <Save />
      </IconButton>
      <IconButton
        className="shrink-0"
        aria-label="불러오기"
        onClick={onRestore}
      >
        <Folder />
      </IconButton>
    </div>
  );
}
