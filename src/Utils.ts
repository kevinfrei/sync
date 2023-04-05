export type Waiter = {
  wait: () => Promise<boolean>;
  leave: () => void;
  blocked: () => boolean;
  block: () => boolean;
};

export type ReaderWriter = {
  read: () => Promise<void>;
  write: () => Promise<void>;
  leaveRead: () => void;
  leaveWrite: () => void;
};

export type SyncFunc<T> = {
  (): Promise<T>;
  trigger: () => Promise<void>;
};

export type MaybePromise<T> = T | Promise<T>;
export type MaybeAsyncFunc<T> = () => MaybePromise<T>;

export function Sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, milliseconds)),
  );
}
