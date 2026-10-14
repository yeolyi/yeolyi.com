import {
  BaseEdge,
  type EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  useReactFlow,
} from "@xyflow/react";
import { atom, useAtomValue } from "jotai";
import { type CSSProperties, useMemo } from "react";
import { HANDLE_SIZE } from "../constants";
import type { NodeAtoms, OutputValue } from "../model/type";

const NULL_ATOM = atom<OutputValue>(null);

const STRAIGHT_TOLERANCE = 8;

export type EdgeStyle = "step" | "bezier";

// 신호값을 선 모양으로 표현한다 — 1은 잉크색 실선, 0은 흐린 점선, 미정은 더 흐린 점선.
// 색은 테마 토큰이라 다크 모드에서도 그대로 맞는다. 저장 파일의 animated:true 가
// 점선을 흘려보내지 않게 애니메이션은 끈다.
const signalStyle = (value: OutputValue, selected: boolean): CSSProperties => {
  const extra = selected ? 1 : 0;
  if (value === true) {
    return {
      stroke: "var(--color-foreground)",
      strokeWidth: 2 + extra,
      strokeDasharray: "none",
      animation: "none",
    };
  }
  return {
    stroke: "var(--color-muted-foreground)",
    strokeWidth: 1.5 + extra,
    strokeDasharray: "6 6",
    strokeOpacity: value === false ? 1 : 0.4,
    animation: "none",
  };
};

const createSignalEdge = (edgeStyle: EdgeStyle) => {
  const SignalEdge = (props: EdgeProps) => {
    const { getNode } = useReactFlow();

    const valueAtom = useMemo(() => {
      const source = getNode(props.source);
      const atoms = source?.data?.atoms as NodeAtoms | undefined;
      return atoms?.outputAtoms[props.sourceHandleId ?? ""] ?? NULL_ATOM;
    }, [getNode, props.source, props.sourceHandleId]);
    const value = useAtomValue(valueAtom);

    // 핸들은 노드 바깥에 붙어 있고 평소 숨겨져 있다. 끝점을 핸들 폭만큼 노드 쪽으로
    // 당겨 선이 노드 테두리에 바로 닿게 한다(출력은 오른쪽, 입력은 왼쪽 고정).
    const ends = {
      ...props,
      sourceX: props.sourceX - HANDLE_SIZE,
      targetX: props.targetX + HANDLE_SIZE,
    };
    // 저장된 배치는 곡선 기준이라 거의 같은 높이의 두 끝이 몇 px 어긋나 있다. 직각선은
    // 그 어긋남을 작은 계단으로 키우므로, 그 정도면 그냥 곧게 잇는다.
    const nearlyLevel =
      Math.abs(ends.sourceY - ends.targetY) <= STRAIGHT_TOLERANCE &&
      ends.targetX > ends.sourceX;
    const path =
      edgeStyle === "bezier"
        ? getBezierPath(ends)[0]
        : nearlyLevel
          ? `M${ends.sourceX},${ends.sourceY} L${ends.targetX},${ends.targetY}`
          : getSmoothStepPath({ ...ends, borderRadius: 0 })[0];

    return (
      <BaseEdge
        id={props.id}
        path={path}
        style={signalStyle(value, !!props.selected)}
      />
    );
  };

  return SignalEdge;
};

// 렌더마다 새 컴포넌트를 만들면 React Flow 가 엣지를 다시 마운트하므로 모듈 상수로 둔다.
export const StepSignalEdge = createSignalEdge("step");
export const BezierSignalEdge = createSignalEdge("bezier");
