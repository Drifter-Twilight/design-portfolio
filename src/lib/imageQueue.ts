/**
 * 图片加载限流。
 * 作品图按原图直引（单张可达 7MB），若让浏览器按视口一次性解码几十张，
 * 低端设备会掉帧甚至崩溃。这里用全局队列把并发压在 4 张以内，
 * 加载完成（或失败）后再放行下一张。
 */

const MAX_CONCURRENT = 6;

let active = 0;
const waiting: (() => void)[] = [];

export function acquireSlot(task: () => void) {
  if (active < MAX_CONCURRENT) {
    active += 1;
    task();
    return;
  }
  waiting.push(task);
}

export function releaseSlot() {
  active = Math.max(0, active - 1);
  const next = waiting.shift();
  if (next) {
    active += 1;
    next();
  }
}

/** 页面卸载时重置，避免 HMR 后计数错乱 */
export function resetQueue() {
  active = 0;
  waiting.length = 0;
}
