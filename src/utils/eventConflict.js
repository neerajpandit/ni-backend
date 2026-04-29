function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if another Approved upcoming event uses same venue and overlaps [start,end]. */
async function detectVenueConflict(Event, venue, startDate, endDate, excludeId) {
  if (!startDate || !venue) return false;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  const q = {
    status: 'Approved',
    feedType: { $in: ['Upcoming', 'Live'] },
    venue: new RegExp(`^${escapeRegex(venue.trim())}$`, 'i'),
  };
  if (excludeId) q._id = { $ne: excludeId };

  const others = await Event.find(q).select('startDate endDate').lean();
  for (const o of others) {
    const os = o.startDate ? new Date(o.startDate) : null;
    if (!os) continue;
    const oe = o.endDate ? new Date(o.endDate) : os;
    if (start <= oe && end >= os) return true;
  }
  return false;
}

module.exports = { escapeRegex, detectVenueConflict };
