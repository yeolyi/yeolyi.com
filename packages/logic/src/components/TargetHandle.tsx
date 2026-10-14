import { Handle, Position, useNodeConnections } from "@xyflow/react";
import { LEFT_HANDLE_STYLE } from "../constants";

// 입력 핸들 — 이미 연결돼 있으면 추가 연결을 막는다.
export const TargetHandle = ({ id, top }: { id: string; top: string }) => {
  const connections = useNodeConnections({
    handleType: "target",
    handleId: id,
  });

  return (
    <Handle
      type="target"
      position={Position.Left}
      id={id}
      style={{ ...LEFT_HANDLE_STYLE, top }}
      isConnectable={connections.length === 0}
    />
  );
};
