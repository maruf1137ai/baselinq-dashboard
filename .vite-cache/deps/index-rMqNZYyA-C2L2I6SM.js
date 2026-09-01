import {
  $o,
  Tt
} from "./chunk-Q4HQBDAW.js";
import "./chunk-FCFTFNRK.js";
import {
  Jv
} from "./chunk-PZN2HW6T.js";
import "./chunk-D3ZPDWR2.js";
import "./chunk-QVPYKWD5.js";
import "./chunk-HXA6O6EE.js";

// ../../../Users/davidzeeman/Projects/baselinq-frontend/node_modules/@cyntler/react-doc-viewer/dist/index-rMqNZYyA.js
function h(i, o) {
  for (var f = 0; f < o.length; f++) {
    const r = o[f];
    if (typeof r != "string" && !Array.isArray(r)) {
      for (const e in r)
        if (e !== "default" && !(e in i)) {
          const n = Object.getOwnPropertyDescriptor(r, e);
          n && Object.defineProperty(i, e, n.get ? n : {
            enumerable: true,
            get: () => r[e]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(i, Symbol.toStringTag, { value: "Module" }));
}
var c = { exports: {} };
(function(i) {
  var o = Tt, f = $o, r = i.exports;
  for (var e in o)
    o.hasOwnProperty(e) && (r[e] = o[e]);
  r.request = function(t, s) {
    return t = n(t), o.request.call(this, t, s);
  }, r.get = function(t, s) {
    return t = n(t), o.get.call(this, t, s);
  };
  function n(t) {
    if (typeof t == "string" && (t = f.parse(t)), t.protocol || (t.protocol = "https:"), t.protocol !== "https:")
      throw new Error('Protocol "' + t.protocol + '" not supported. Expected "https:"');
    return t;
  }
})(c);
var p = c.exports;
var d = Jv(p);
var y = h({
  __proto__: null,
  default: d
}, [p]);
export {
  y as i
};
//# sourceMappingURL=index-rMqNZYyA-C2L2I6SM.js.map
