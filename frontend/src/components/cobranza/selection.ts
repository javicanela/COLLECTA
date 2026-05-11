type OperationWithId = {
  id: string;
};

export function getVisibleOperationIds(operations: OperationWithId[]) {
  return operations.map(operation => operation.id);
}

export function getVisibleSelectionState(selectedIds: Set<string>, operations: OperationWithId[]) {
  const visibleIds = getVisibleOperationIds(operations);

  return {
    visibleIds,
    allVisibleSelected: visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id)),
  };
}
