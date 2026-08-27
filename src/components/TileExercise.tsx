import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionExercise } from '../api/types';
import { parseExercise, wordsMatch, type BlankSegment } from '../lib/exercise';

interface Props {
  exercise: SessionExercise;
  fullText: string;
  /** Fired once every blank is filled; correct = no wrong taps along the way. */
  onComplete: (correct: boolean) => void;
}

/** Pause after the last blank fills so the completed verse registers. */
const COMPLETE_DELAY_MS = 700;
const WRONG_FLASH_MS = 350;

/**
 * Tile exercise: validates on tap. A correct tile fills the next empty blank
 * and is dimmed out; a wrong tile shakes and changes nothing. With
 * every blank filled the exercise auto-submits — correctness per-tap is already
 * known, so "correct" means a clean run with zero wrong taps.
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
  const mistakes = useRef(0);
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
      const nextFilled = filledCount + 1;
      setFilledCount(nextFilled);
      if (nextFilled >= blanks.length) {
        const clean = mistakes.current === 0;
        timers.current.push(setTimeout(() => onComplete(clean), COMPLETE_DELAY_MS));
      }
    } else {
      mistakes.current += 1;
      setWrongTile(index);
      timers.current.push(setTimeout(() => setWrongTile(null), WRONG_FLASH_MS));
    }
  }

  return (
    <div>
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
    </div>
  );
}
