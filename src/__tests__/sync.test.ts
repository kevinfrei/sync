// TODO: Add a bunch of tests for the synchronization things

import {
  DebouncedDelay,
  DebouncedEvery,
  MakeReaderWriter,
  MaybeWait,
  Sleep,
} from '../index';

jest.setTimeout(15000);

test('DebouncedEvery testing', async () => {
  let timer = Date.now();
  let callCount = 0;
  let lastDelta = 0;
  function updateTimeDelta() {
    callCount++;
    const newTime = Date.now();
    lastDelta = newTime - timer;
    timer = newTime;
  }
  const everyHundred = DebouncedEvery(updateTimeDelta, 250);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(250);
  expect(callCount).toBe(1);
  expect(lastDelta).toBeGreaterThan(225);
  expect(lastDelta).toBeLessThan(275);
  timer = Date.now();
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(10);
  everyHundred();
  await Sleep(250);
  expect(callCount).toBe(2);
  expect(lastDelta).toBeGreaterThan(249);
  expect(lastDelta).toBeLessThan(275);
});

test('DebouncedDelay testing', async () => {
  let timer = Date.now();
  let callCount = 0;
  let lastDelta = 0;
  function updateTimeDelta() {
    callCount++;
    const newTime = Date.now();
    lastDelta = newTime - timer;
    timer = newTime;
  }
  const everyHundred = DebouncedDelay(updateTimeDelta, 250);
  everyHundred();
  await Sleep(200);
  everyHundred();
  await Sleep(200);
  everyHundred();
  await Sleep(200);
  everyHundred();
  await Sleep(200);
  everyHundred();
  await Sleep(350);
  expect(lastDelta).toBeGreaterThan(1050);
  expect(lastDelta).toBeLessThan(1150);
  expect(callCount).toBe(1);
  timer = Date.now();
  everyHundred();
  await Sleep(200);
  everyHundred();
  await Sleep(100);
  everyHundred();
  await Sleep(100);
  everyHundred();
  await Sleep(100);
  everyHundred();
  await Sleep(300);
  expect(lastDelta).toBeGreaterThan(750);
  expect(lastDelta).toBeLessThan(850);
  expect(callCount).toBe(2);
});

test('ReaderWriter testing', async () => {
  // How should I test this?
  const rw = MakeReaderWriter(1);
  let val = 0;
  let count = 0;
  async function reader(): Promise<void> {
    for (let i = 0; i < 500; i++) {
      await rw.read();
      try {
        await Sleep(Math.floor(Math.random() * 5) + 1);
        if (val !== 0) {
          throw 'Oops Reader';
        }
        count++;
      } finally {
        rw.leaveRead();
      }
    }
  }
  async function writer(): Promise<void> {
    for (let i = 0; i < 100; i++) {
      await rw.write();
      try {
        if (val !== 0) {
          throw 'Oops Writer';
        }
        val = 1;
        await Sleep(Math.floor(Math.random() * 5) + 1);
        val = 0;
        count--;
      } finally {
        rw.leaveWrite();
      }
    }
  }
  await Promise.all([reader(), writer()]);
  expect(count).toEqual(400);
});

test('Random sync stuff', async () => {
  const pfunc = (): Promise<boolean> => {
    return new Promise((resolve) => resolve(true));
  };
  const sfunc = (): boolean => {
    return false;
  };
  expect(await MaybeWait(pfunc)).toBeTruthy();
  expect(await MaybeWait(sfunc)).toBeFalsy();
});
