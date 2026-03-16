/* Google Picker & GIS type stubs */

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClient {
        requestAccessToken(overrideConfig?: { prompt?: string }): void;
        callback: (response: TokenResponse) => void;
      }

      interface TokenResponse {
        access_token: string;
        error?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        prompt?: string;
      }): TokenClient;
    }
  }

  namespace picker {
    enum ViewId {
      DOCS = 'all',
      DOCS_IMAGES = 'docs-images',
      DOCS_VIDEOS = 'docs-videos',
      DOCUMENTS = 'documents',
      DRAWINGS = 'drawings',
      FOLDERS = 'folders',
      FORMS = 'forms',
      PDFS = 'pdfs',
      PRESENTATIONS = 'presentations',
      SPREADSHEETS = 'spreadsheets',
    }

    enum Action {
      CANCEL = 'cancel',
      PICKED = 'picked',
    }

    enum Feature {
      NAV_HIDDEN = 'navHidden',
      MULTISELECT_ENABLED = 'multiselectEnabled',
    }

    interface DocumentObject {
      id: string;
      name: string;
      mimeType: string;
      url: string;
      sizeBytes?: number;
      lastEditedUtc?: number;
      iconUrl?: string;
      description?: string;
      type?: string;
      parentId?: string;
    }

    interface ResponseObject {
      action: string;
      docs?: DocumentObject[];
      viewToken?: string[];
    }

    class DocsView {
      constructor(viewId?: ViewId);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
      setQuery(query: string): DocsView;
      setMode(mode: string): DocsView;
    }

    class DocsUploadView {
      constructor();
      setIncludeFolders(include: boolean): DocsUploadView;
    }

    class PickerBuilder {
      enableFeature(feature: Feature): PickerBuilder;
      disableFeature(feature: Feature): PickerBuilder;
      setDeveloperKey(key: string): PickerBuilder;
      setAppId(appId: string): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      addView(view: DocsView | DocsUploadView): PickerBuilder;
      setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      setLocale(locale: string): PickerBuilder;
      setSize(width: number, height: number): PickerBuilder;
      build(): Picker;
    }

    interface Picker {
      setVisible(visible: boolean): void;
      dispose(): void;
    }
  }
}

declare function gapi_load(api: string, callback: () => void): void;

declare namespace gapi {
  function load(api: string, callback: () => void): void;
}
