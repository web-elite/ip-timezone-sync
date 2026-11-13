(() => {
  "use strict";
  const CHANNEL = "__iptz_sync__";
  let currentTimezone = "UTC";
  let applied = false;

  function installTimezoneShim(target, timezone) {
    if (!target || !target.Date || !target.Intl || !timezone) return;
    const NativeDate = target.Date;
    const NativeDTF = target.Intl.DateTimeFormat;
    if (NativeDate.__iptzPatched && NativeDate.__iptzTimezone === timezone) return;

    const nativeResolved = NativeDTF.prototype.resolvedOptions;
    const nativeGetOffset = NativeDate.prototype.getTimezoneOffset;
    const nativeToString = NativeDate.prototype.toString;
    const nativeToDateString = NativeDate.prototype.toDateString;
    const nativeToTimeString = NativeDate.prototype.toTimeString;

    const formatterCache = new Map();
    const formatter = (locale = "en-US", options = {}) => {
      const key = JSON.stringify([locale, options]);
      if (!formatterCache.has(key)) formatterCache.set(key, new NativeDTF(locale, options));
      return formatterCache.get(key);
    };
    const partsAt = (date) => {
      const parts = formatter("en-US", {
        timeZone: timezone, hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit",
        weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit"
      }).formatToParts(date);
      const out = {};
      for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
      return out;
    };
    const offsetAt = (date) => {
      const p = partsAt(date);
      const wallAsUTC = NativeDate.UTC(
        Number(p.year), Number(p.month) - 1, Number(p.day),
        Number(p.hour) === 24 ? 0 : Number(p.hour),
        Number(p.minute), Number(p.second)
      );
      return Math.round((date.getTime() - wallAsUTC) / 60000);
    };
    const weekdayNumber = (short) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(short);
    const pad = n => String(n).padStart(2, "0");
    const tzNameAt = date => {
      try {
        return formatter("en-US", { timeZone: timezone, timeZoneName: "long" })
          .formatToParts(date).find(p => p.type === "timeZoneName")?.value || timezone;
      } catch (_) { return timezone; }
    };

    const DTFProxy = new Proxy(NativeDTF, {
      construct(Ctor, args, NewTarget) {
        const locale = args[0];
        const options = args[1] ? { ...args[1] } : {};
        if (options.timeZone == null) options.timeZone = timezone;
        return Reflect.construct(Ctor, [locale, options], NewTarget === DTFProxy ? Ctor : NewTarget);
      },
      apply(Ctor, thisArg, args) {
        const options = args[1] ? { ...args[1] } : {};
        if (options.timeZone == null) options.timeZone = timezone;
        return Reflect.apply(Ctor, thisArg, [args[0], options]);
      }
    });
    try { target.Intl.DateTimeFormat = DTFProxy; } catch (_) {}

    const proto = NativeDate.prototype;
    const localGetters = {
      getFullYear: d => Number(partsAt(d).year),
      getMonth: d => Number(partsAt(d).month) - 1,
      getDate: d => Number(partsAt(d).day),
      getHours: d => Number(partsAt(d).hour) % 24,
      getMinutes: d => Number(partsAt(d).minute),
      getSeconds: d => Number(partsAt(d).second),
      getDay: d => weekdayNumber(partsAt(d).weekday)
    };
    for (const [name, getter] of Object.entries(localGetters)) {
      try {
        Object.defineProperty(proto, name, {
          configurable: true, writable: true,
          value: function() { return Number.isNaN(this.getTime()) ? NaN : getter(this); }
        });
      } catch (_) {}
    }
    try {
      Object.defineProperty(proto, "getMilliseconds", {
        configurable: true, writable: true,
        value: function() { return this.getUTCMilliseconds(); }
      });
      Object.defineProperty(proto, "getTimezoneOffset", {
        configurable: true, writable: true,
        value: function() { return Number.isNaN(this.getTime()) ? NaN : offsetAt(this); }
      });
    } catch (_) {}

    const dateString = d => {
      if (Number.isNaN(d.getTime())) return "Invalid Date";
      const p = partsAt(d);
      const offset = offsetAt(d);
      const sign = offset <= 0 ? "+" : "-";
      const abs = Math.abs(offset);
      const gmt = `GMT${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
      return `${p.weekday} ${new NativeDTF("en-US", {timeZone: timezone, month:"short"}).format(d)} ${pad(Number(p.day))} ${p.year} ${pad(Number(p.hour)%24)}:${pad(Number(p.minute))}:${pad(Number(p.second))} ${gmt} (${tzNameAt(d)})`;
    };
    try {
      Object.defineProperty(proto, "toString", { configurable: true, writable: true, value: function() { return dateString(this); } });
      Object.defineProperty(proto, "toDateString", { configurable: true, writable: true, value: function() {
        if (Number.isNaN(this.getTime())) return "Invalid Date";
        const p = partsAt(this);
        const month = new NativeDTF("en-US", {timeZone: timezone, month:"short"}).format(this);
        return `${p.weekday} ${month} ${pad(Number(p.day))} ${p.year}`;
      }});
      Object.defineProperty(proto, "toTimeString", { configurable: true, writable: true, value: function() {
        if (Number.isNaN(this.getTime())) return "Invalid Date";
        const p = partsAt(this), offset = offsetAt(this), sign = offset <= 0 ? "+" : "-";
        const abs = Math.abs(offset);
        return `${pad(Number(p.hour)%24)}:${pad(Number(p.minute))}:${pad(Number(p.second))} GMT${sign}${pad(Math.floor(abs/60))}${pad(abs%60)} (${tzNameAt(this)})`;
      }});
    } catch (_) {}

    // Locale formatting uses the chosen timezone unless the caller explicitly supplied one.
    for (const method of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]) {
      const original = proto[method];
      try {
        Object.defineProperty(proto, method, {
          configurable: true, writable: true,
          value: function(locales, options) {
            const opts = options ? { ...options } : {};
            if (opts.timeZone == null) opts.timeZone = timezone;
            return Reflect.apply(original, this, [locales, opts]);
          }
        });
      } catch (_) {}
    }

    try {
      Object.defineProperty(NativeDate, "__iptzPatched", { value: true, configurable: true });
      Object.defineProperty(NativeDate, "__iptzTimezone", { value: timezone, configurable: true });
    } catch (_) {}
  }

  function makeWorkerBootstrap(timezone) {
    return `(${installTimezoneShim.toString()})(self, ${JSON.stringify(timezone)});`;
  }

  function hookWorkers() {
    const NativeBlob = window.Blob;
    const blobSources = window.__iptzBlobSources || new WeakMap();
    const urlSources = window.__iptzUrlSources || new Map();
    try {
      Object.defineProperty(window, "__iptzBlobSources", { value: blobSources, configurable: true });
      Object.defineProperty(window, "__iptzUrlSources", { value: urlSources, configurable: true });
    } catch (_) {}
    if (!NativeBlob.__iptzWrapped) {
      const WrappedBlob = function(parts = [], options = {}) {
        const blob = new NativeBlob(parts, options);
        try {
          const text = parts.map(p => typeof p === "string" ? p : "").join("");
          if (/javascript|ecmascript/i.test(options.type || "")) blobSources.set(blob, text);
        } catch (_) {}
        return blob;
      };
      WrappedBlob.prototype = NativeBlob.prototype;
      Object.setPrototypeOf(WrappedBlob, NativeBlob);
      Object.defineProperty(WrappedBlob, "__iptzWrapped", { value: true });
      try { window.Blob = WrappedBlob; } catch (_) {}
    }

    // Track object URLs made from JavaScript Blobs so Blob-backed workers can
    // receive the same bootstrap where the source was created in this page.
    if (!URL.createObjectURL.__iptzWrapped) {
      const nativeCreateObjectURL = URL.createObjectURL.bind(URL);
      const wrappedCreateObjectURL = function(blob) {
        const url = nativeCreateObjectURL(blob);
        const source = blobSources.get(blob);
        if (typeof source === "string") urlSources.set(url, source);
        return url;
      };
      try {
        Object.defineProperty(wrappedCreateObjectURL, "__iptzWrapped", { value: true });
        URL.createObjectURL = wrappedCreateObjectURL;
      } catch (_) {}
    }

    for (const kind of ["Worker", "SharedWorker"]) {
      const Native = window[kind];
      if (!Native || Native.__iptzWrapped) continue;
      const Wrapped = new Proxy(Native, {
        construct(Ctor, args) {
          const original = args[0];
          const options = args[1] || {};
          let workerUrl;
          try { workerUrl = new URL(original, document.baseURI); } catch (_) {}
          const bootstrap = makeWorkerBootstrap(currentTimezone);
          let finalUrl = original;
          try {
            if (workerUrl?.protocol === "blob:") {
              const source = urlSources.get(workerUrl.href);
              if (typeof source === "string") {
                const blob = new NativeBlob([bootstrap, "\\n", source], { type: "text/javascript" });
                finalUrl = URL.createObjectURL(blob);
              }
            } else if (workerUrl && ["http:", "https:"].includes(workerUrl.protocol)) {
              const suffix = options.type === "module"
                ? `\nimport(${JSON.stringify(workerUrl.href)});`
                : `\nimportScripts(${JSON.stringify(workerUrl.href)});`;
              const blob = new NativeBlob([bootstrap, suffix], { type: "text/javascript" });
              finalUrl = URL.createObjectURL(blob);
            }
          } catch (_) { finalUrl = original; }
          return Reflect.construct(Ctor, [finalUrl, options], Ctor);
        }
      });
      try {
        Object.defineProperty(Wrapped, "__iptzWrapped", { value: true });
        window[kind] = Wrapped;
      } catch (_) {}
    }
  }

  function apply(timezone) {
    if (!timezone || typeof timezone !== "string") return;
    try {
      // Validate IANA timezone before applying it.
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch (_) { return; }
    currentTimezone = timezone;
    installTimezoneShim(window, timezone);
    hookWorkers();
    applied = true;
    window.dispatchEvent(new CustomEvent("iptz:updated", { detail: { timezone } }));
  }

  window.addEventListener("message", event => {
    if (event.source !== window || event.data?.[CHANNEL] !== true) return;
    apply(event.data.timezone);
  });

  // Expose status for diagnostics; this is not a promise of undetectability.
  Object.defineProperty(window, "__IP_TIMEZONE_SYNC__", {
    configurable: false,
    value: { get timezone() { return currentTimezone; }, get applied() { return applied; } }
  });
})();