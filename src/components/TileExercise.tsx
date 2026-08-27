import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionExercise } from '../api/types';
import { STAGE_LABELS, parseExercise, wordsMatch, type BlankSegment } from '../lib/exercise';

interface Props {
  exercise: SessionExercise;
  fullText: string;
  /** Fired once every blank is filled; correct = no wrong taps along the way. */
  onComplete: (correct: boolean) => void;
}

/** Pause after the last blank fills so the completed verse registers. */
const COMPLETE_DELAY_MS = 900;
const WRONG_FLASH_MS = 400;

/**
 * Tile exercise: validates on tap. A correct tile fills the next empty blank
 * (a green pill popping into place) and its tile hollows out; a wrong tile
 * shakes, breaks the combo and changes nothing. With every blank filled the
 * exercise auto-submits — correctness per-tap is already known, so "correct"
 * means a clean run with zero wrong taps.
 */
export default function TileExercise({ exercise, fullText, onComplete }: Props) {
  // Each segment paired with its position among the blanks (null for text),
  // computed once so render itself mutates nothing.
  const { segments, blanks } = useMemo(() => {
    const parsed = parseExercise(exercise.blankedText, fullText);
    let counter = 0;
    const indexed = parsed.map((segment) => ({
      segment,
      blankIndex: segment.kind === 'blank' ? counter++ : null,
    }));
    return {
      segments: indexed,
      blanks: parsed.filter((s): s is BlankSegment => s.kind === 'blank'),
    };
  }, [exercise.blankedText, fullText]);

  const [filledCount, setFilledCount] = useState(0);
  const [usedTiles, setUsedTiles] = useState<ReadonlySet<number>>(new Set());
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const complete = filledCount >= blanks.length;

  function tapTile(index: number, word: string) {
    if (complete || usedTiles.has(index)) return;
    const target = blanks[filledCount];

    if (wordsMatch(word, target.answer)) {
      const nextUsed = new Set(usedTiles);
      nextUsed.add(index);
      setUsedTiles(nextUsed);
      setCombo((c) => c + 1);
      setWrongTile(null);
      const nextFilled = filledCount + 1;
      setFilledCount(nextFilled);
      if (nextFilled >= blanks.length) {
        const clean = misses === 0;
        timers.current.push(setTimeout(() => onComplete(clean), COMPLETE_DELAY_MS));
      }
    } else {
      setMisses((m) => m + 1);
      setCombo(0);
      setWrongTile(index);
      timers.current.push(setTimeout(() => setWrongTile(null), WRONG_FLASH_MS));
    }
  }

  const hint = complete
    ? misses === 0
      ? { className: 'hint hint-good', icon: '🎉', text: 'Clean run — no misses. That one counts.' }
      : { className: 'hint hint-good', icon: '✓', text: 'Filled in. Read it once more before moving on.' }
    : combo >= 2
      ? { className: 'hint hint-combo', icon: '🔥', text: `${combo} in a row — keep going.` }
      : misses > 0 && combo === 0
        ? { className: 'hint hint-bad', icon: '↺', text: 'Not that one. Read the line again and try.' }
        : { className: 'hint hint-neutral', icon: '👆', text: 'Fill the blanks in order. A clean run scores the verse.' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className={exercise.queue === 'review' ? 'chip chip-review' : 'chip chip-active'}>
          {exercise.queue === 'review' ? 'Review' : STAGE_LABELS[exercise.stage]}
        </span>
        <span className="chip chip-streak">
          {combo >= 2 ? `🔥 ${combo} in a row` : `${filledCount} of ${blanks.length} blanks`}
        </span>
      </div>

      <div className="verse-card">
        <p className="verse-ref">{exercise.reference}</p>
        <p className="verse-text">
          {segments.map(({ segment, blankIndex }, i) => {
            const space = i > 0 ? ' ' : '';
            if (segment.kind === 'text' || blankIndex === null) {
              return (
                <span key={i}>
                  {space}
                  {segment.kind === 'text' ? segment.raw : segment.filledRaw}
                </span>
              );
            }
            const filled = blankIndex < filledCount;
            const current = blankIndex === filledCount;
            if (filled) {
              return (
                <span key={i}>
                  {space}
                  <span className="blank-filled">{segment.filledRaw}</span>
                </span>
              );
            }
            return (
              <span key={i}>
                {space}
                {segment.punctBefore}
                {segment.shownLetter && <span className="blank-prefix">{segment.shownLetter}</span>}
                <span className={current ? 'blank blank-current' : 'blank'} aria-label="blank">
                  {segment.hidden}
                </span>
                {segment.punctAfter}
              </span>
            );
          })}
        </p>
      </div>

      <p className="bank-label">Tap the missing words</p>
      <div className="word-bank" role="group" aria-label="Word bank">
        {exercise.wordBank.map((word, i) => {
          const used = usedTiles.has(i);
          const className = used ? 'tile tile-used' : wrongTile === i ? 'tile tile-wrong' : 'tile';
          return (
            <button
              key={`${word}-${i}`}
              type="button"
              className={className}
              disabled={used || complete}
              onClick={() => tapTile(i, word)}
            >
              {word}
            </button>
          );
        })}
      </div>

      <div className={hint.className} role="status">
        <span className="hint-icon" aria-hidden="true">
          {hint.icon}
        </span>
        <span>{hint.text}</span>
      </div>
    </div>
  );
}
