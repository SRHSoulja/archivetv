import React from 'react';

/**
 * Top-of-hour station identification.
 *
 * American stations identified themselves on the hour because they were
 * required to, which is why it is one of the few pieces of broadcast ritual
 * that genuinely happened everywhere rather than only in memory. It runs only
 * in live mode: in start-from-the-beginning mode there is no clock fiction for
 * it to belong to, and an ident announcing an hour you are not in would be
 * worse than none.
 */
export default function StationIdent({ channel, at }) {
  if (!channel || !at) return null;

  const time = new Date(at);
  const hour = time.getHours();
  const display = `${((hour + 11) % 12) + 1}:00 ${hour < 12 ? 'AM' : 'PM'}`;

  return (
    <div className="station-ident" aria-hidden="true">
      <div className="station-ident-card">
        <div
          className="station-ident-bar"
          style={{ background: channel.themeColor || '#f59e0b' }}
        />
        <div className="station-ident-call">{channel.callsign || 'W-ARCH'}</div>
        <div className="station-ident-sub">
          CHANNEL {channel.number || '02'} — {channel.name || 'ARCHIVETV'}
        </div>
        <div className="station-ident-time">{display}</div>
      </div>
    </div>
  );
}
