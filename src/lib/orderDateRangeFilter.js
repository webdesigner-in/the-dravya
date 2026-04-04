/**
 * Adds a date preset filter to an orders query filter (deliveryDate in range,
 * or createdAt when deliveryDate is missing). Preset: today | week | month.
 */
export function appendOrdersDatePresetFilter(filter, preset) {
  if (!preset || preset === 'all') return;

  const now = new Date();
  let start;
  let end;

  if (preset === 'today') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'week') {
    start = new Date(now);
    const dow = start.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    start.setDate(start.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    return;
  }

  const rangeCond = {
    $or: [
      { deliveryDate: { $gte: start, $lte: end } },
      {
        $and: [
          { $or: [{ deliveryDate: null }, { deliveryDate: { $exists: false } }] },
          { createdAt: { $gte: start, $lte: end } },
        ],
      },
    ],
  };

  if (!filter.$and) {
    filter.$and = [];
  }
  filter.$and.push(rangeCond);
}
