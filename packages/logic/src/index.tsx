import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  ConnectionLineType,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  ReactFlow,
  type ReactFlowInstance,
  type ReactFlowJsonObject,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { createStore, Provider } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type RegistryKey,
  registryKeys,
  registryNames,
} from "./atoms";
import { nodeTypes } from "./components";
import { Controls } from "./components/Controls";
import {
  BezierSignalEdge,
  type EdgeStyle,
  StepSignalEdge,
} from "./components/SignalEdge";
import { minZoomOptions } from "./constants";
import {
  saveJSONToFile,
  selectJSONFromFile,
} from "./file";
import { useTouchDeviceState } from "./hooks/useMobileState";
import type { SaveFile } from "./model/type";
import { useNodeAtom } from "./model/useNodeAtom";
import "@xyflow/react/dist/style.css";

// 저장 파일·defaultEdgeOptions 의 type이 전부 "default"라 "default" 키 하나만
// 갈아끼우면 회로 전체의 선 모양(직각/곡선)이 바뀐다. 저장 파일은 그대로 둔다.
const edgeTypesByStyle = {
  step: { default: StepSignalEdge },
  bezier: { default: BezierSignalEdge },
} satisfies Record<EdgeStyle, unknown>;

const connectionLineTypes = {
  step: ConnectionLineType.Step,
  bezier: ConnectionLineType.Bezier,
} satisfies Record<EdgeStyle, ConnectionLineType>;

// 핸들은 평소 숨긴다. 편집 가능할 때만 보이는데, 데스크톱은 노드 호버 때, 터치는 호버가
// 없으니 잠금을 푼 동안 항상, 연결을 끄는 중에는 어디서든 보여 놓을 곳을 찾게 한다.
// 숨겨도 투명할 뿐 자리를 지켜 연결은 그대로 된다.
const HANDLE_VISIBILITY_CLASS = [
  // [data-handlepos] = 핸들, [data-id] = 노드(밑줄 든 클래스명은 Tailwind 임의 변형에서 공백으로 읽혀 속성으로 고른다).
  "[&_[data-handlepos]]:opacity-0",
  "[&_[data-handlepos]]:transition-opacity",
  "data-[handles=hover]:[&_[data-id]:hover_[data-handlepos]]:opacity-100",
  "data-[handles=always]:[&_[data-handlepos]]:opacity-100",
  "data-[connecting]:[&_[data-handlepos]]:opacity-100",
].join(" ");

type FlowProps = {
  id: string;
  initialJSON?: ReactFlowJsonObject<Node, Edge>;
  height?: number;
  /** true이면 고정 높이 대신 부모 컨테이너를 채운다. */
  fillHeight?: boolean;
  hideNodeButtons?: boolean;
  /** 선 모양. 기본은 직각 꺾은선, 선이 빽빽한 큰 회로는 "bezier"가 읽기 쉽다. */
  edgeStyle?: EdgeStyle;
  /** 보기 전용: 고정된 그림처럼 보여 준다. 스위치만 눌리고, 이동·확대·편집과 아래 버튼 줄은 없다.
   *  높이는 내용에 맞춘다(FitToContent). height·fillHeight 는 쓰지 않는다. */
  viewOnly?: boolean;
  /** 회로를 고칠 때마다(부품 추가·삭제·이동, 선 잇기·끊기, 파일 불러오기) 불린다. 스위치를 누르는 건 고친 게 아니다. */
  onEdit?: () => void;
};

// 처음에는 NAND의 값은 atom으로 해보겠는데 연결이 바뀌는건 어떻게 표현하지? 그때는 어떻게 리렌더링하지? 했었는데
// 연결도 atom으로 표현하면 되겠더라
// 모든걸 atom으로 표현한다는 사고방식이 생각보다 어렵다.
function FlowImpl({
  id,
  initialJSON,
  height = 400,
  fillHeight = false,
  hideNodeButtons = false,
  edgeStyle = "step",
  viewOnly = false,
  onEdit,
}: FlowProps) {
  const store = useMemo(() => createStore(), []);
  const {
    add: addAtom,
    remove: removeAtom,
    connect: connectAtom,
    disconnect: disconnectAtom,
    restore: restoreAtom,
    stringify: stringifyAtom,
  } = useNodeAtom(store);

  const [nodes, setNodes] = useState<Node[]>([]);
  // 보기 전용일 때 FitToContent 가 정한 높이. 재기 전엔 아무 값이나 있어야 React Flow 가 노드를 그린다.
  const [fitHeight, setFitHeight] = useState(320);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [touchOnlyState, setTouchOnlyState] = useTouchDeviceState();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (initialJSON) {
      const { nodes, edges } = restoreAtom(initialJSON as SaveFile);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [initialJSON, restoreAtom]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 노드 삭제 대응
      for (const change of changes) {
        if (change.type === "remove") {
          removeAtom(change.id);
        }
      }
      // 선택·크기 재기는 React Flow 가 알아서 보내는 것이라 고친 게 아니다.
      if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) onEdit?.();
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [removeAtom, onEdit],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === "remove")) onEdit?.();
      // 콜백도 두 번 불린다 아...
      setEdges((eds) => {
        for (const change of changes) {
          if (change.type !== "remove") continue;

          // 엣지 삭제 대응
          const edge = eds.find((e) => e.id === change.id);
          if (!edge || !edge.targetHandle) continue;

          disconnectAtom({
            target: edge.target,
            targetHandle: edge.targetHandle,
          });
        }

        return applyEdgeChanges(changes, eds);
      });
    },
    [disconnectAtom, onEdit],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // 노드 연결 대응
      if (connection.sourceHandle && connection.targetHandle) {
        connectAtom({
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
      }

      onEdit?.();
      setEdges((eds) => addEdge(connection, eds));
    },
    [connectAtom, onEdit],
  );

  const addNode = (type: RegistryKey) => () => {
    const atoms = addAtom(type);
    const position = { x: 0, y: nodes.length * 5 };
    const item = { id: atoms.id, type, position, data: { atoms } };
    onEdit?.();
    setNodes((nds) => [...nds, item]);
  };

  const onSave = () => {
    if (!rfInstance) return;
    const flow = rfInstance.toObject();
    const save: SaveFile = { ...flow, nodeOutputs: stringifyAtom() };
    const json = JSON.stringify(save);
    saveJSONToFile(json, "save.json");
  };

  const onRestore = async () => {
    let flow: SaveFile;
    try {
      const json = await selectJSONFromFile();
      flow = JSON.parse(json) as SaveFile;
      if (!Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
        throw new Error("잘못된 저장 파일");
      }
    } catch (error) {
      // 파일 선택 취소는 무시, 파싱 실패는 로그만
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(error);
      }
      return;
    }

    const { nodes, edges } = restoreAtom(flow);

    onEdit?.();
    setNodes((nds) => [...nds, ...nodes]);
    setEdges((eds) => [...eds, ...edges]);
  };

  const isInteractionEnabled =
    touchOnlyState.type === "desktop" ||
    (touchOnlyState.type === "mobile" && touchOnlyState.value);

  // 보기 전용이면 손으로 고치는 상호작용(이동·끌기·잇기)과 칸 채우기(fillHeight)를 모두 끈다.
  const editable = isInteractionEnabled && !viewOnly;
  const fill = fillHeight && !viewOnly;

  const handleVisibility = !editable
    ? "hidden"
    : touchOnlyState.type === "mobile"
      ? "always"
      : "hover";

  return (
    <Provider store={store}>
      <ReactFlowProvider>
        <div
          className={`flex flex-col ${fill ? "border-border h-full border-t" : ""}`}
        >
          <div
            // touch-none: standalone 캔버스에선 브라우저가 핀치를 페이지 줌으로
            // 가로채지 않아야 캔버스 줌이 동작한다. 인라인은 본문 스크롤이 우선이라 제외.
            className={`overflow-hidden font-sans ${HANDLE_VISIBILITY_CLASS} ${fill ? "min-h-0 flex-1 touch-none" : ""}`}
            data-handles={handleVisibility}
            data-connecting={isConnecting || undefined}
            style={viewOnly ? { height: fitHeight } : fill ? undefined : { height: `${height}px` }}
          >
            <ReactFlow
              onInit={setRfInstance}
              id={id}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={() => setIsConnecting(true)}
              onConnectEnd={() => setIsConnecting(false)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypesByStyle[edgeStyle]}
              defaultEdgeOptions={{
                type: "default",
                selectable: true,
              }}
              connectionLineType={connectionLineTypes[edgeStyle]}
              fitView={!viewOnly}
              fitViewOptions={minZoomOptions}
              // 기본 minZoom(0.5)은 큰 회로가 한 화면에 안 들어온다. 하한을 크게 낮춰 더
              // 축소할 수 있게 한다(fitView 도 이 하한에 묶이므로 함께 완화됨).
              minZoom={0.1}
              proOptions={{ hideAttribution: true }}
              preventScrolling={false}
              // TODO: 노드가 모바일 드래그를 막는 문제 해결
              panOnDrag={editable}
              nodesDraggable={editable}
              nodesConnectable={editable}
              elementsSelectable={!viewOnly}
              // 끌기·선택·잇기를 다 끄면 React Flow 가 노드의 포인터 이벤트를 꺼서 스위치도 안 눌린다. 클릭 처리기가 있으면 살아 있다.
              onNodeClick={viewOnly ? () => {} : undefined}
              zoomOnScroll={!viewOnly}
              zoomOnPinch={!viewOnly}
              deleteKeyCode={viewOnly ? null : undefined}
              zoomOnDoubleClick={false}
              snapToGrid
              snapGrid={[4, 4]}
              // TODO: 왜 필요하지...
              suppressHydrationWarning
            >
              {viewOnly && <FitToContent onHeight={setFitHeight} />}
              {/* 배경 없음 — 투명 캔버스. 인라인은 prose 아일랜드 프레임의 상하 보더로,
                  fillHeight(standalone)는 자체 border-t 로 구분한다(코드블록처럼). */}
            </ReactFlow>
          </div>
          {/* 좁은 화면에선 줄바꿈 대신 가로 스크롤. 끝 항목이 가장자리에 붙지 않게 오른쪽 여백. */}
          {!viewOnly && (
          <div className="bg-background flex max-w-full gap-1 overflow-x-auto pt-2 pr-4">
            <Controls
              rfInstance={rfInstance}
              touchOnlyState={touchOnlyState}
              setTouchOnlyState={setTouchOnlyState}
              onSave={onSave}
              onRestore={onRestore}
              onDeleteNode={(id) => onNodesChange([{ type: "remove", id }])}
              onDeleteEdge={(id) => onEdgesChange([{ type: "remove", id }])}
            />
            {!hideNodeButtons &&
              registryKeys.map((key) => (
                <button
                  type="button"
                  className="focus-fill min-h-control hover:bg-foreground hover:text-background press-down shrink-0 px-2 whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  key={key}
                  onClick={addNode(key)}
                  disabled={
                    touchOnlyState.type === "mobile" && !touchOnlyState.value
                  }
                >
                  {registryNames[key]}
                </button>
              ))}
          </div>
          )}
        </div>
      </ReactFlowProvider>
    </Provider>
  );
}

/** 보기 전용의 크기: 원래 크기(100%)로 그리되 칸 폭을 넘으면 폭에 맞게 줄인다. 칸 높이는 그 결과에 맞추고
 *  가로 가운데에 둔다. 얼마나 크게 보일지는 쓰는 쪽이 칸의 최대 폭으로 정한다. 폭이 바뀌면 다시 잰다. */
function FitToContent({ onHeight }: { onHeight: (h: number) => void }) {
  const ready = useNodesInitialized();
  const { getNodes, getNodesBounds, setViewport } = useReactFlow();
  const width = useStore((s) => s.width);
  useEffect(() => {
    if (!ready || !width) return;
    const b = getNodesBounds(getNodes());
    if (!b.width || !b.height) return;
    const pad = 16;
    const zoom = Math.min(1, (width - 2 * pad) / b.width);
    onHeight(Math.ceil(b.height * zoom + 2 * pad));
    setViewport({ x: (width - b.width * zoom) / 2 - b.x * zoom, y: pad - b.y * zoom, zoom });
  }, [ready, width, getNodes, getNodesBounds, setViewport, onHeight]);
  return null;
}

export default FlowImpl;
