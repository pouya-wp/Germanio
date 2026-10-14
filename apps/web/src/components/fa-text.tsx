import { Fragment } from 'react';

/** A run of Latin script: German words, possibly with spaces, digits and light punctuation inside. */
const LATIN_RUN = /([A-Za-zÄÖÜäöüßẞ][A-Za-zÄÖÜäöüßẞ0-9 .,!?'’…/-]*[A-Za-zÄÖÜäöüßẞ0-9.!?…])/g;

/**
 * Persian prose with German fragments inside ("… → Ich bin zwanzig Jahre alt").
 * Each German run is bidi-isolated and kept on one line, so the Unicode bidi
 * algorithm can't scramble its word order inside the right-to-left sentence.
 */
export function FaText({ children }: { children: string }) {
  const parts = children.split(LATIN_RUN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <bdi key={i} dir="ltr" lang="de" className="whitespace-nowrap font-sans font-medium">
            {part}
          </bdi>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
