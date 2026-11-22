export interface GridPoint {
  x: number;
  y: number;
}

/**
 * Breadth-First Search pathfinder on the 2D tile grid.
 * Supports clicking/tapping directly onto a solid interactable tile by routing
 * to the closest walkable cardinal neighbor (so mobile tap-to-interact feels effortless).
 */
export function findPath(
  start: GridPoint,
  goal: GridPoint,
  width: number,
  height: number,
  isBlocked: (x: number, y: number) => boolean,
  allowAdjacentToBlocked = true
): GridPoint[] {
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) return [];

  let targets: GridPoint[] = [];
  if (!isBlocked(goal.x, goal.y)) {
    targets = [goal];
  } else if (allowAdjacentToBlocked) {
    const dirs: GridPoint[] = [
      { x: 0, y: 1 }, // prefer standing right below wall frames / north objects
      { x: 0, y: -1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    for (const d of dirs) {
      const nx = goal.x + d.x;
      const ny = goal.y + d.y;
      if (inBounds(nx, ny) && !isBlocked(nx, ny)) {
        targets.push({ x: nx, y: ny });
      }
    }
  }

  if (targets.length === 0) return [];
  if (targets.some((t) => t.x === start.x && t.y === start.y)) return [];

  const targetKeys = new Set(targets.map((t) => `${t.x},${t.y}`));
  const queue: GridPoint[] = [start];
  const visited = new Set<string>([`${start.x},${start.y}`]);
  const parent = new Map<string, GridPoint>();

  const neighbors: GridPoint[] = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  let found: GridPoint | null = null;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currKey = `${curr.x},${curr.y}`;
    if (targetKeys.has(currKey)) {
      found = curr;
      break;
    }

    for (const d of neighbors) {
      const nx = curr.x + d.x;
      const ny = curr.y + d.y;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny) || visited.has(key) || isBlocked(nx, ny)) continue;
      visited.add(key);
      parent.set(key, curr);
      queue.push({ x: nx, y: ny });
    }
  }

  if (!found) return [];

  const path: GridPoint[] = [];
  let cursor: GridPoint | undefined = found;
  while (cursor && !(cursor.x === start.x && cursor.y === start.y)) {
    path.push(cursor);
    cursor = parent.get(`${cursor.x},${cursor.y}`);
  }
  path.reverse();
  return path;
}
