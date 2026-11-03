'use client';

/**
 * React Bits — CountUp
 * 来源：reactbits.dev/r/CountUp-TS-TW
 * 说明：本项目只用递增计数场景，保留官方 count 渲染路径与缓动体系，
 *       移除未使用的 roll（翻牌）分支以控制包体积。props 保持向后兼容。
 *
 * 与官方实现的差异：触发改用原生 IntersectionObserver 并增加 3s 兜底，
 * 避免观察器异常时数字永远停在 0。
 */
import { animate, cubicBezier } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

type Easing = 'easeOut' | 'linear' | 'expo' | 'spring';

interface CountUpProps {
  to: number;
  from?: number;
  direction?: 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  startWhen?: boolean;
  separator?: string;
  prefix?: string;
  suffix?: string;
  easing?: Easing;
  trigger?: 'view' | 'load';
  /** 整数位最小长度，个位数补前导零用于对齐（如 pad=2 → 03） */
  pad?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const makeSpring = (overshoot: number) => {
  const log = Math.log(Math.min(0.5, Math.max(0.001, overshoot)));
  const zeta = -log / Math.sqrt(Math.PI * Math.PI + log * log);
  const damped = Math.PI / 0.52;
  const natural = damped / Math.sqrt(1 - zeta * zeta);
  const raw = (t: number) =>
    1 - Math.exp(-zeta * natural * t) * (Math.cos(damped * t) + ((zeta * natural) / damped) * Math.sin(damped * t));
  const residual = 1 - raw(1);
  return (t: number) => (t >= 1 ? 1 : raw(t) + residual * t * t * t);
};

const EASINGS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  easeOut: cubicBezier(0.33, 1, 0.68, 1),
  expo: (t) => (t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10))),
  spring: makeSpring(0.06),
};

const getDecimalPlaces = (num: number): number => {
  const str = num.toString();
  if (str.includes('.')) {
    const decimals = str.split('.')[1];
    if (parseInt(decimals, 10) !== 0) return decimals.length;
  }
  return 0;
};

const group = (int: string, separator: string) => (separator ? int.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : int);

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  style,
  startWhen = true,
  separator = '',
  prefix = '',
  suffix = '',
  easing = 'easeOut',
  trigger = 'view',
  pad,
  onStart,
  onEnd,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef(direction === 'down' ? to : from);
  const [play, setPlay] = useState<{ id: number; from: number; to: number } | null>(null);

  const startValue = direction === 'down' ? to : from;
  const endValue = direction === 'down' ? from : to;
  const places = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const abs = Math.abs(latest).toFixed(places);
      const [int, frac = ''] = abs.split('.');
      const whole = group(int, separator);
      const body = `${latest < 0 ? '-' : ''}${pad && pad > 0 ? whole.padStart(pad, '0') : whole}${
        frac ? `.${frac}` : ''
      }`;
      return `${prefix}${body}${suffix}`;
    },
    [places, separator, prefix, suffix, pad],
  );

  const latestRef = useRef({ formatValue, onStart, onEnd, easing, duration, delay });
  latestRef.current = { formatValue, onStart, onEnd, easing, duration, delay };

  // 减少动态偏好下首帧直接是终值，避免依赖动画启动时序
  const [initialText] = useState(() => {
    const reduced =
      typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    return formatValue(reduced ? endValue : startValue);
  });

  // 起始值先写进 DOM，动画启动后再由 render 接管；减少动态时不要覆盖终值
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (textRef.current && !play) textRef.current.textContent = formatValue(startValue);
  }, [formatValue, startValue, play]);

  // 触发：进入视口就从头数一遍；离开不清零（避免边界抖动误判），
  // 下次重新进入时先把值复位再开数，视觉上就是「又数了一次」。
  useEffect(() => {
    if (!startWhen) return undefined;
    let cancelled = false;
    let started = false;
    let visible = false;

    const start = (fresh: boolean) => {
      if (cancelled) return;
      started = true;
      if (fresh) {
        valueRef.current = startValue;
        if (textRef.current) textRef.current.textContent = formatValue(startValue);
      }
      setPlay((previous) => ({ id: (previous?.id || 0) + 1, from: startValue, to: endValue }));
    };

    if (trigger === 'load' || typeof IntersectionObserver === 'undefined') {
      start(false);
      return () => {
        cancelled = true;
      };
    }

    const el = ref.current;
    if (!el) {
      start(false);
      return () => {
        cancelled = true;
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry.isIntersecting) {
          visible = false;
          return;
        }
        if (visible) return;
        visible = true;
        start(started);
      },
      { rootMargin: '0px 0px 96px 0px', threshold: 0 },
    );
    io.observe(el);

    // 兜底：观察器一次都没触发时，1.2 秒内也要开始
    const fallback = window.setTimeout(() => {
      if (!started) start(false);
    }, 1200);

    return () => {
      cancelled = true;
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [startWhen, trigger, endValue, formatValue, startValue]);

  useEffect(() => {
    if (!play) return undefined;
    const live = latestRef.current;
    const ease = EASINGS[live.easing] || EASINGS.easeOut;
    const total = live.duration;

    const render = (t: number) => {
      const progress = total > 0 ? clamp01(t / total) : 1;
      const value = play.from + (play.to - play.from) * ease(progress);
      valueRef.current = value;
      if (textRef.current) textRef.current.textContent = live.formatValue(value);
    };

    live.onStart?.();

    const finish = () => {
      render(Number.POSITIVE_INFINITY);
      valueRef.current = play.to;
      live.onEnd?.();
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return undefined;
    }

    const controls = animate(0, total, {
      duration: total,
      delay: live.delay,
      ease: 'linear',
      onUpdate: render,
      onComplete: finish,
    });

    return () => controls.stop();
  }, [play]);

  return (
    <span className={`tabular-nums ${className}`} ref={ref} style={style}>
      {/* 可见文本即终值，不再额外放一份 sr-only，否则读屏会把数字重复朗读 */}
      <span ref={textRef}>{initialText}</span>
    </span>
  );
}
