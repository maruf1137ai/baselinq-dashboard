import {
  require_react
} from "./chunk-QVPYKWD5.js";
import {
  __toESM
} from "./chunk-HXA6O6EE.js";

// ../../../Users/davidzeeman/Projects/baselinq-frontend/node_modules/@radix-ui/react-use-previous/dist/index.mjs
var React = __toESM(require_react(), 1);
function usePrevious(value) {
  const ref = React.useRef({ value, previous: value });
  return React.useMemo(() => {
    if (ref.current.value !== value) {
      ref.current.previous = ref.current.value;
      ref.current.value = value;
    }
    return ref.current.previous;
  }, [value]);
}

export {
  usePrevious
};
//# sourceMappingURL=chunk-VTHKKB5Z.js.map
