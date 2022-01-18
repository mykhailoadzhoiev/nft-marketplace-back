import { dumpCacheItemsStats } from '@/lib_ipfs/ipfs_cache';

function startQueueDumpCacheItemsStats() {
  const delayMs = 60 * 5 * 1000;

  function handleQueue() {
    dumpCacheItemsStats();

    setTimeout(handleQueue, delayMs);
  }

  setTimeout(handleQueue, delayMs);
}

export default function InitCron() {
  // testCron();

  startQueueDumpCacheItemsStats();
}
