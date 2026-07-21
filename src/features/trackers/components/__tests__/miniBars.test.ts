import { normalizeBars } from '../MiniBars'

describe('normalizeBars', () => {
  it('scales each value to a 0..1 fraction of scaleMax', () => {
    expect(normalizeBars([0, 2, 4], 4)).toEqual([0, 0.5, 1])
  })
  it('clamps values above scaleMax to 1', () => {
    expect(normalizeBars([8], 4)).toEqual([1])
  })
  it('returns all-zero heights when scaleMax is 0 (no divide-by-zero)', () => {
    expect(normalizeBars([0, 1], 0)).toEqual([0, 0])
  })
  it('handles an empty series', () => {
    expect(normalizeBars([], 5)).toEqual([])
  })
})
