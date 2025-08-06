type Fiber = {
  value: number;
  sibling: Fiber | null;
  index: number;
};

const currentFirstChild: Fiber = {
  value: 1,
  index: 0,
  sibling: {
    value: 2,
    index: 1,
    sibling: {
      value: 3,
      index: 2,
      sibling: {
        value: 4,
        index: 3,
        sibling: {
          value: 5,
          index: 4,
          sibling: { value: 6, index: 5, sibling: null },
        },
      },
    },
  },
};

const newChildren = [1, 6, null, 5, 4, 3];

let resultingFirstChild: Fiber | null = null;
let previousNewFiber: Fiber | null = null;

let oldFiber: Fiber | null = currentFirstChild;
let lastPlacedIndex = 0;
let newIdx = 0;
let nextOldFiber = null;

for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
  if (oldFiber.index > newIdx) {
    nextOldFiber = oldFiber;
    oldFiber = null;
  } else {
    nextOldFiber = oldFiber.sibling;
  }

  const newFiber =
    newChildren[newIdx] === null
      ? null
      : {
          value: newChildren[newIdx]!,
          index: newIdx,
          sibling: null,
        };

  // 뭔가 지워졌으면 for문 탈출함
  if (newFiber === null) {
    if (oldFiber === null) {
      oldFiber = nextOldFiber;
    }
    break;
  }

  if (previousNewFiber === null) {
    resultingFirstChild = newFiber;
  } else {
    previousNewFiber.sibling = newFiber;
  }

  previousNewFiber = newFiber;
  oldFiber = nextOldFiber;
}

console.log(newIdx, oldFiber);
