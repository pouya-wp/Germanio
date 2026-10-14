import { createBrainClient, DEFAULT_BRAIN_URL } from '@germanio/client';

/** Brain lives on the learner's own machine; the web app talks to it from the browser. */
export const brain = createBrainClient(process.env.NEXT_PUBLIC_BRAIN_URL ?? DEFAULT_BRAIN_URL);
