// Overall, I think I'd rather pass in a function to be invoked, rather than
// expect the caller gets the cleanup right

import { Sleep, Waiter } from './Utils.js';
import SeqNum from '@freik/seqnum';
import { Container, MakeQueue } from '@freik/containers';

// This is a non-prioritized "maybe you'll eventually get the token" waiter
export function MakeWaiter(delay = 10): Waiter {
  let busy = false;
  async function wait(): Promise<boolean> {
    while (!block()) {
      await Sleep(delay);
    }
    return true;
  }
  function leave() {
    busy = false;
  }
  function blocked() {
    return busy;
  }
  function block() {
    if (busy) {
      return false;
    }
    busy = true;
    return true;
  }
  return { wait, leave, blocked, block };
}

// This is just a linear queue of waiters
export function MakeWaitingQueue(delay = 10): Waiter {
  const getNextID = SeqNum();
  const queue: Container<string> = MakeQueue<string>();
  let active = '';
  async function wait(): Promise<boolean> {
    const myID = getNextID();
    queue.push(myID);
    while (active !== '' && queue.peek() !== myID) {
      await Sleep(delay);
    }
    active = myID;
    const theID = queue.pop();
    if (theID !== myID) {
      throw new Error("This situation shouldn't ever occur");
    }
    return true;
  }
  function leave() {
    active = '';
  }
  function blocked() {
    return active !== '';
  }
  function block() {
    if (blocked()) {
      return false;
    }
    active = getNextID();
    return true;
  }
  return { wait, leave, blocked, block };
}

// This will keep one caller "in the queue" and everyone else drops out
export function MakeSingleWaiter(delay = 10): Waiter {
  let busy = false;
  let someoneWaiting = false;
  async function wait(): Promise<boolean> {
    // Hurray for simple non-atomic synchronization :)
    if (busy) {
      if (someoneWaiting) {
        return false;
      }
      someoneWaiting = true;
      while (busy) {
        await Sleep(delay);
      }
    }
    busy = true;
    someoneWaiting = false;
    return true;
  }
  function leave() {
    busy = false;
  }
  function blocked() {
    return busy || someoneWaiting;
  }
  function block() {
    if (!blocked()) {
      busy = true;
      return true;
    }
    return false;
  }
  return { wait, leave, blocked, block };
}
