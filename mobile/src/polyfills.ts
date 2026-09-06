/**
 * Polyfills for Web Standard APIs missing in React Native Hermes runtime.
 * Required by MSW (Mock Service Worker) for request interception on mobile devices.
 */

const g = (typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : window) as any;

if (typeof g.Event === 'undefined') {
  g.Event = class Event {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    composed: boolean;
    defaultPrevented = false;
    constructor(type: string, eventInitDict?: any) {
      this.type = type;
      this.bubbles = Boolean(eventInitDict?.bubbles);
      this.cancelable = Boolean(eventInitDict?.cancelable);
      this.composed = Boolean(eventInitDict?.composed);
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
    stopPropagation() {}
    stopImmediatePropagation() {}
  };
}

if (typeof g.MessageEvent === 'undefined') {
  g.MessageEvent = class MessageEvent extends (g.Event || Object) {
    data: any;
    origin: string;
    lastEventId: string;
    source: any;
    ports: any[];
    constructor(type: string, eventInitDict?: any) {
      super(type, eventInitDict);
      this.data = eventInitDict?.data;
      this.origin = eventInitDict?.origin || '';
      this.lastEventId = eventInitDict?.lastEventId || '';
      this.source = eventInitDict?.source || null;
      this.ports = eventInitDict?.ports || [];
    }
  };
}

if (typeof g.EventTarget === 'undefined') {
  g.EventTarget = class EventTarget {
    private listeners: Record<string, ((...args: any[]) => void)[]> = {};

    addEventListener(type: string, listener: (...args: any[]) => void) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(listener);
    }

    removeEventListener(type: string, listener: (...args: any[]) => void) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }

    dispatchEvent(event: any): boolean {
      if (!event?.type) return true;
      const list = this.listeners[event.type];
      if (!list) return true;
      for (const listener of list) {
        try {
          listener.call(this, event);
        } catch (e) {
          console.error(e);
        }
      }
      return !event.defaultPrevented;
    }
  };
}

if (typeof g.BroadcastChannel === 'undefined') {
  g.BroadcastChannel = class BroadcastChannel {
    name: string;
    onmessage: ((event: any) => void) | null = null;
    onmessageerror: ((event: any) => void) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage(_data: any) {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  };
}

if (typeof g.TransformStream === 'undefined') {
  g.TransformStream = class TransformStream {
    readable = {};
    writable = {};
  };
}

export {};
