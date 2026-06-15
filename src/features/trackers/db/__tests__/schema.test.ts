import {
  missingColumns,
  TRACKER_COLUMNS,
  ENTRY_COLUMNS,
  MILESTONE_COLUMNS,
} from '../schema';

describe('missingColumns', () => {
  it('returns spec columns absent from the live trackers table', () => {
    // An "old" table created before routine/reminder_time existed.
    const existing = [
      'id', 'name', 'type', 'icon', 'color', 'unit', 'direction',
      'target_value', 'start_value', 'accumulation', 'start_date',
      'deadline', 'period', 'repeat_days', 'created_at', 'archived',
    ];
    expect(missingColumns(TRACKER_COLUMNS, existing)).toEqual([
      { name: 'routine', decl: 'routine TEXT' },
      { name: 'reminder_time', decl: 'reminder_time TEXT' },
    ]);
  });

  it('returns an empty array when the table already has every column', () => {
    const existing = TRACKER_COLUMNS.map(c => c.name);
    expect(missingColumns(TRACKER_COLUMNS, existing)).toEqual([]);
  });

  it('ignores extra/unknown columns on the live table', () => {
    const existing = [...TRACKER_COLUMNS.map(c => c.name), 'legacy_extra'];
    expect(missingColumns(TRACKER_COLUMNS, existing)).toEqual([]);
  });

  it('works the same for the entries spec', () => {
    // An "old" entries table missing the later-added `note` column.
    const existing = ['id', 'tracker_id', 'date', 'value'];
    expect(missingColumns(ENTRY_COLUMNS, existing)).toEqual([
      { name: 'note', decl: 'note TEXT' },
    ]);
  });

  it('works the same for the milestones spec', () => {
    // An "old" milestones table missing `progress` and `order_index`.
    const existing = ['id', 'tracker_id', 'title', 'due_date'];
    expect(missingColumns(MILESTONE_COLUMNS, existing)).toEqual([
      { name: 'progress', decl: 'progress REAL NOT NULL DEFAULT 0' },
      { name: 'order_index', decl: 'order_index INTEGER NOT NULL DEFAULT 0' },
    ]);
  });

  it('every column spec is internally consistent (decl starts with name)', () => {
    for (const spec of [TRACKER_COLUMNS, ENTRY_COLUMNS, MILESTONE_COLUMNS]) {
      for (const col of spec) {
        expect(col.decl.startsWith(col.name)).toBe(true);
      }
    }
  });
});
