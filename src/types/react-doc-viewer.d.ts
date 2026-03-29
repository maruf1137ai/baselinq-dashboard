declare module "@cyntler/react-doc-viewer" {
  import { FC, CSSProperties } from "react";

  export interface IDocument {
    uri: string;
    fileType?: string;
    fileName?: string;
  }

  export interface IConfig {
    header?: {
      disableHeader?: boolean;
      disableFileName?: boolean;
      retainURLParams?: boolean;
    };
    loadingRenderer?: {
      overrideComponent?: FC;
      showLoadingTimeout?: number;
    };
    noRenderer?: {
      overrideComponent?: FC;
    };
  }

  export interface ITheme {
    primary?: string;
    secondary?: string;
    tertiary?: string;
    textPrimary?: string;
    textSecondary?: string;
    textTertiary?: string;
    disableThemeScrollbar?: boolean;
  }

  export interface DocViewerProps {
    documents: IDocument[];
    pluginRenderers?: any[];
    config?: IConfig;
    theme?: ITheme;
    style?: CSSProperties;
    className?: string;
  }

  const DocViewer: FC<DocViewerProps>;
  export const DocViewerRenderers: any[];
  export default DocViewer;
}
