import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLoadTester } from './useLoadTester';

const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  default: apiClientMock,
}));

describe('useLoadTester', () => {
  it('records successful request logs', async () => {
    apiClientMock.mockResolvedValue({
      status: 200,
      headers: { 'x-cache-status': 'HIT' },
    });

    const { result } = renderHook(() => useLoadTester());

    await act(async () => {
      await result.current.sendRequests('/api/products/all', 'GET', 3, 1);
    });

    expect(result.current.logs).toHaveLength(3);
    expect(result.current.logs.every((log) => log.status === 200)).toBe(true);
  });

  it('records failed request logs', async () => {
    apiClientMock.mockRejectedValue({
      response: { status: 401 },
    });

    const { result } = renderHook(() => useLoadTester());

    await act(async () => {
      await result.current.sendRequests('/api/products/all', 'GET', 2, 1);
    });

    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs.every((log) => log.status === 401)).toBe(true);
  });
});
