const OCR_PARSE_ERROR = 'Smart Import OCR failed: local OCR engine could not read the file';

type OcrWorkerRequest = {
  type: 'recognize';
  jobId: string;
  file: File;
};

type OcrWorkerResponse = {
  type: 'result' | 'error';
  jobId: string;
  text?: string;
  confidence?: number;
  errorMessage?: string;
};

type TesseractAdapter = {
  recognize: (image: File, langs?: string) => Promise<{
    data: {
      text?: string;
      confidence?: number;
    };
  }>;
};

type WorkerScope = {
  postMessage: (message: OcrWorkerResponse) => void;
  onmessage: ((event: MessageEvent<OcrWorkerRequest>) => void) | null;
};

async function loadTesseract(): Promise<TesseractAdapter> {
  const tesseractModule = await import('tesseract.js') as unknown as TesseractAdapter & { default?: TesseractAdapter };
  return tesseractModule.default ?? tesseractModule;
}

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = (event) => {
  void (async () => {
    const message = event.data;

    if (message.type !== 'recognize') {
      return;
    }

    try {
      const tesseract = await loadTesseract();
      const result = await tesseract.recognize(message.file, 'spa+eng');

      workerScope.postMessage({
        type: 'result',
        jobId: message.jobId,
        text: result.data.text ?? '',
        confidence: result.data.confidence,
      });
    } catch {
      workerScope.postMessage({
        type: 'error',
        jobId: message.jobId,
        errorMessage: OCR_PARSE_ERROR,
      });
    }
  })();
};

export {};
