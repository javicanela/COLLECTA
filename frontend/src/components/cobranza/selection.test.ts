import { describe, expect, it } from 'vitest';
import { getVisibleOperationIds, getVisibleSelectionState } from './selection';

describe('cobranza selection helpers', () => {
  const visibleOperations = [{ id: 'op-1' }, { id: 'op-2' }];

  it('returns ids only from the visible operation list', () => {
    expect(getVisibleOperationIds(visibleOperations)).toEqual(['op-1', 'op-2']);
  });

  it('marks all selected only when every visible operation is selected', () => {
    expect(getVisibleSelectionState(new Set(['op-1', 'op-2']), visibleOperations)).toEqual({
      visibleIds: ['op-1', 'op-2'],
      allVisibleSelected: true,
    });
  });

  it('does not treat hidden selections as selecting the visible list', () => {
    expect(getVisibleSelectionState(new Set(['archived-1', 'archived-2']), visibleOperations)).toEqual({
      visibleIds: ['op-1', 'op-2'],
      allVisibleSelected: false,
    });
  });
});
