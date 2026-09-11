import React, { useEffect, useState } from 'react';

/**
 * The moment a tape goes in.
 *
 * Deliberately not an accurate mechanical simulation -- it plays over the tube
 * rather than in front of a modelled deck, because a modelled deck would be a
 * different app. What it is trying to catch is the pause: you pushed the tape,
 * the machine took it out of your hand, and for a second and a half nothing
 * happened except a noise.
 *
 * Era-aware, because the same gesture felt different on either side of about
 * 1998. The woodgrain and Trinitron cabinets swallow a cassette. The portable
 * and the bare tube get a disc tray, which is quieter and faster and asks for
 * the disc to be set down rather than pushed in.
 */

const CASSETTE_MS = 1500;
const DISC_MS = 1700;

export function loadDurationFor(cabinetStyle) {
  return cabinetStyle === 'portable' || cabinetStyle === 'pure' ? DISC_MS : CASSETTE_MS;
}

export function isDiscEra(cabinetStyle) {
  return cabinetStyle === 'portable' || cabinetStyle === 'pure';
}

function Cassette({ label }) {
  return (
    <div className="media-load-cassette">
      <div className="media-load-cassette-body">
        {/* The label, which on a home tape was handwritten and never straight */}
        <div className="media-load-cassette-label">
          <span className="media-load-cassette-title">{label}</span>
        </div>
        <div className="media-load-cassette-window">
          <span className="media-load-reel media-load-reel-left" />
          <span className="media-load-reel media-load-reel-right" />
        </div>
        <div className="media-load-cassette-notch" />
      </div>
    </div>
  );
}

function Disc({ label }) {
  return (
    <div className="media-load-tray">
      <div className="media-load-disc">
        <div className="media-load-disc-sheen" />
        <div className="media-load-disc-hub" />
      </div>
      <div className="media-load-tray-lip" />
      <span className="media-load-disc-title">{label}</span>
    </div>
  );
}

export default function MediaLoadOverlay({ load, cabinetStyle = 'woodgrain', onDone }) {
  const [phase, setPhase] = useState('idle');

  useEffect(() => {
    if (!load) {
      setPhase('idle');
      return undefined;
    }
    setPhase('in');
    const total = loadDurationFor(cabinetStyle);
    const fade = setTimeout(() => setPhase('out'), total - 260);
    const done = setTimeout(() => onDone?.(), total);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [load, cabinetStyle, onDone]);

  if (!load) return null;

  const disc = isDiscEra(cabinetStyle);
  const label = (load.title || 'UNTITLED').toUpperCase().slice(0, 28);

  return (
    <div
      className={`media-load-stage ${phase === 'out' ? 'media-load-stage-out' : ''}`}
      aria-hidden="true"
    >
      {disc ? <Disc label={label} /> : <Cassette label={label} />}
      <div className="media-load-caption">{disc ? 'READING DISC' : 'LOADING TAPE'}</div>
    </div>
  );
}
