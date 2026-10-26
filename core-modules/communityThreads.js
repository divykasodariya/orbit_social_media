export function buildThreadTree(flatItems) {
  const itemMap = new Map();
  const rootItems = [];

  for (const item of flatItems) {
    itemMap.set(item._id.toString(), {
      ...item,
      replies: [],
    });
  }

  for (const item of flatItems) {
    const node = itemMap.get(item._id.toString());
    if (item.parentId && itemMap.has(item.parentId.toString())) {
      const parent = itemMap.get(item.parentId.toString());
      parent.replies.push(node);
    } else {
      rootItems.push(node);
    }
  }

  return rootItems;
}

export function flattenThreadStats(threadNode) {
  let count = 1;
  for (const reply of threadNode.replies || []) {
    count += flattenThreadStats(reply);
  }
  return count;
}
