import { missingColumns, TRACKER_COLUMNS } from '../schema';

describe('missingColumns', () => {
  it('returns columns present in the spec but absent from the live table', () => {
    // An "old" table created before routine/reminder_time existed.
    const existing = [
      'id', 'name', 'type', 'icon', 'color', 'unit', 'direction',
      'target_value', 'start_value', 'accumulation', 'start_date',
      'deadline', 'period', 'repeat_days', 'created_at', 'archived',
    ];
    expect(missingColumns(existing)).toEqual([
      { name: 'routine', decl: 'routine TEXT' },
      { name: 'reminder_time', decl: 'reminder_time TEXT' },
    ]);
  });

  it('returns an empty array when the table already has every column', () => {
    const existing = TRACKER_COLUMNS.map(c => c.name);
    expect(missingColumns(existing)).toEqual([]);
  });

  it('ignores extra/unknown columns on the live table', () => {
    const existing = [...TRACKER_COLUMNS.map(c => c.name), 'legacy_extra'];
    expect(missingColumns(existing)).toEqual([]);
  });
});
