import MakeSeqNum from '@freik/seqnum';
import { MaybeAsyncFunc, ReaderWriter, Sleep, SyncFunc } from './Utils.js';
import { MakeSingleWaiter, MakeWaiter, MakeWaitingQueue } from './Waiters.js';
import { isPromise } from '@freik/typechk';

export function MakeReaderWriter(delay = 1): ReaderWriter {
  type RWEntry = { id: string; count: number };
  const getNextId = MakeSeqNum();
  const getReadId = () => 'r' + getNextId();
  const getWriteId = () => 'w' + getNextId();
  const rwQueue: RWEntry[] = [];
  let activeCount = 0;
  let activeId = '';
  function isWriterActive() {
    return activeCount === -1;
  }
  function isQueueEmpty() {
    return rwQueue.length === 0;
  }
  function nextQueue() {
    if (activeCount !== 0) {
      throw Error('ReaderWriterLock count inconsistency');
    }
    if (isQueueEmpty()) {
      activeId = '';
    } else {
      const val = rwQueue.shift();
      if (val === undefined) {
        throw Error('ReaderWriter lock queue inconsistency');
      }
      ({ id: activeId, count: activeCount } = val);
    }
  }
  async function read(): Promise<void> {
    // Is there a queue or an active Writer?
    //  For a queue or an activeWriter,
    //    Check the tail:
    //      Writer, add to the queue
    //      Reader, increment the tail count
    //    then wait until we're up
    //  For an empty queue, nothing to do
    // add to the 'activeReaders' count and continue
    if (isWriterActive() || !isQueueEmpty()) {
      let myId: string;
      if (isQueueEmpty() || rwQueue[rwQueue.length - 1].count === -1) {
        // Writer!
        myId = getReadId();
        rwQueue.push({ id: myId, count: 1 });
      } else {
        // Reader at the end of the queue!
        const tail = rwQueue[rwQueue.length - 1];
        myId = tail.id;
        tail.count++;
      }
      do {
        await Sleep(delay);
      } while (activeId !== myId);
      // activeCount is set to all the active readers, so no incrementing is necessary
    } else {
      activeCount++;
    }
  }
  function leaveRead() {
    // Decrease the activeReaders count
    // If it's zero, slide the queue
    activeCount--;
    if (activeCount < 0) {
      throw Error('ReaderWriterLock read inconsistency');
    }
    if (activeCount === 0) {
      nextQueue();
    }
  }
  async function write(): Promise<void> {
    // Is there a queue?
    //  Yes: add to the queue and wait
    //  No: Are there active readers?
    //    Yes: add to the queue and wait
    //    No:  don't do anything
    // Now, set the active writer
    if (!isQueueEmpty() || activeCount !== 0) {
      const id = getWriteId();
      rwQueue.push({ id, count: -1 });
      do {
        await Sleep(delay);
      } while (activeId !== id);
    } else {
      activeCount = -1;
    }
  }
  function leaveWrite() {
    // Clear the active writer and slide the queue
    activeCount++;
    if (activeCount !== 0) {
      throw Error('ReaderWriterLock write inconsistency');
    }
    nextQueue();
  }
  return { read, leaveRead, write, leaveWrite };
}

export function OnlyOneActive(
  func: MaybeAsyncFunc<void>,
  delay = 10,
): SyncFunc<void> {
  const waiter = MakeWaiter(delay);
  async function invoke() {
    if (await waiter.wait()) {
      try {
        await MaybeWait(func);
      } finally {
        waiter.leave();
      }
    }
  }
  invoke.trigger = async () => {
    await MaybeWait(func);
  };
  return invoke;
}

export function OnlyOneActiveQueue(
  func: MaybeAsyncFunc<void>,
  delay = 10,
): SyncFunc<void> {
  const waiter = MakeWaitingQueue(delay);
  async function invoke() {
    if (await waiter.wait()) {
      try {
        await MaybeWait(func);
      } finally {
        waiter.leave();
      }
    }
  }
  invoke.trigger = async () => {
    await MaybeWait(func);
  };
  return invoke;
}

export function OnlyOneWaiting(
  func: MaybeAsyncFunc<void>,
  delay = 10,
): SyncFunc<boolean> {
  const waiter = MakeSingleWaiter(delay);
  async function invoke() {
    if (await waiter.wait()) {
      try {
        await MaybeWait(func);
      } finally {
        waiter.leave();
      }
      return true;
    } else {
      return false;
    }
  }
  invoke.trigger = async () => {
    await MaybeWait(func);
  };
  return invoke;
}

// If the result is a promise, await it, otherwise don't
export async function MaybeWait<T>(func: MaybeAsyncFunc<T>): Promise<T> {
  const res = func();
  if (isPromise(res)) {
    return await res;
  } else {
    return res;
  }
}
