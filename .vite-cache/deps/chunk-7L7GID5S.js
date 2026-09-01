import {
  require_jsx_runtime
} from "./chunk-D3ZPDWR2.js";
import {
  require_react
} from "./chunk-QVPYKWD5.js";
import {
  __toESM
} from "./chunk-HXA6O6EE.js";

// ../../../Users/davidzeeman/Projects/baselinq-frontend/node_modules/@radix-ui/react-direction/dist/index.mjs
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var DirectionContext = React.createContext(void 0);
function useDirection(localDir) {
  const globalDir = React.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}

export {
  useDirection
};
//# sourceMappingURL=chunk-7L7GID5S.js.map
