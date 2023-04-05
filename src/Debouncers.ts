import { MaybeWait, OnlyOneActiveQueue } from './Sync.js';
import { MaybeAsyncFunc } from './Utils.js';

/**
 * This invokes func no *sooner* than `timeout` milliseconds in the future, but
 * will restarts the timer every time the function is invoked, so if you call it
 * every timeout-1 milliseconds, it will never invoke the function
 * @param  {MaybeAsyncFunc<void>} func
 * @param  {number} timeout
 */
export function DebouncedDelay(
  func: MaybeAsyncFunc<void>,
  timeout: number,
): () => void {
  let debounceTimer: any = null;
  const doWork = OnlyOneActiveQueue(func);
  function ping() {
    if (debounceTimer !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      doWork().finally(() => '');
    }, timeout);
  }
  return ping;
}

/**
 * This invokes func every `timeout` milliseconds in the future, so if you call
 * it before the timer has completed, it does nothing. Logically, it "buffers"
 * invocations, flushing the buffer every X ms.
 *
 * WARNING: func must be re-entrant-safe!
 * @param  {MaybeAsyncFunc<void>} func
 * @param  {number} timeout
 */
export function DebouncedEvery(
  func: MaybeAsyncFunc<void>,
  timeout: number,
): () => void {
  let debounceTimer: any = null;
  function ping() {
    if (debounceTimer !== null) {
      return;
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      MaybeWait(func).catch(() => {});
    }, timeout);
  }
  return ping;
}
