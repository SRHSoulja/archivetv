import React from 'react';
import { X, Tv, ShieldCheck, ExternalLink, Scale, Heart } from 'lucide-react';
import { audio } from '../services/soundEffects';
import { useDialog } from '../hooks/useDialog';

function GithubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function AboutModal({ isOpen, onClose }) {
  const dialogRef = useDialog(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200" onClick={onClose}>
      <div ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="About ArchiveTV"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-[#141211] border-2 border-amber-600/70 rounded-2xl p-5 md:p-6 shadow-2xl text-zinc-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Tv className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-pixel text-amber-400 text-sm md:text-base font-bold tracking-wide">
                ABOUT ARCHIVETV • OPEN SOURCE
              </h3>
              <p className="text-[10px] font-mono text-zinc-400">
                CLIENT-SIDE PUBLIC DOMAIN ARCHIVE BROWSER
              </p>
            </div>
          </div>
          <button
            aria-label="Close about"
            onClick={() => {
              audio.playKnobClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto retro-scroll pr-2 text-xs leading-relaxed">
          {/* Summary Box */}
          <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
            <p className="font-mono text-zinc-200">
              <strong className="text-amber-400">ArchiveTV</strong> is an open-source, client-side web application simulating vintage CRT televisions and VCR decks to experience classic public domain movies, TV shows, serials, and broadcasts.
            </p>
          </div>

          {/* Legal Notice / Safe Harbor */}
          <div className="p-3.5 bg-amber-950/20 border border-amber-600/40 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-pixel text-[11px] font-bold">
              <Scale className="w-4 h-4" />
              <span>LEGAL DISCLAIMER & SAFE HARBOR</span>
            </div>
            <p className="text-zinc-300 text-[11px]">
              <strong>Zero Media Hosted:</strong> ArchiveTV does <em>not</em> host, store, cache, upload, re-encode, or distribute any media files. No video or audio passes through any intermediary server.
            </p>
            <p className="text-zinc-300 text-[11px]">
              <strong>Direct Client Streaming:</strong> All media streams, metadata, and thumbnails are queried directly by your browser from the official public servers of the <a href="https://archive.org" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300">Internet Archive (archive.org)</a> under public domain, Creative Commons, or open access archival metadata.
            </p>
            <p className="text-zinc-300 text-[11px]">
              <strong>Privacy:</strong> All bookmarks, custom dials, and preferences are strictly saved in your browser&apos;s local storage.
            </p>
            <p className="text-zinc-400 text-[10px] pt-1 border-t border-amber-900/40">
              Copyright questions regarding underlying archival items should be directed to the Internet Archive per their <a href="https://archive.org/about/dmca.php" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300 inline-flex items-center gap-0.5">DMCA Policy <ExternalLink className="w-2.5 h-2.5" /></a>.
            </p>
          </div>

          {/* Links & Repository */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <a
              href="https://github.com/SRHSoulja/archivetv"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl font-pixel text-xs transition group cursor-pointer shadow"
            >
              <GithubIcon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>GITHUB REPOSITORY</span>
            </a>

            <div className="flex items-center justify-center gap-2 p-2.5 bg-zinc-900/80 border border-zinc-800 text-zinc-400 rounded-xl font-mono text-xs">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>LICENSE: MIT</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="flex items-center gap-1 font-pixel text-[10px] text-zinc-400">
            MADE WITH <Heart className="w-3 h-3 text-red-500 fill-current inline" /> FOR DIGITAL PRESERVATION
          </span>
          <span className="font-pixel text-amber-500/80 text-[10px]">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
