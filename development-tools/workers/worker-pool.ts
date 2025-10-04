import { existsSync } from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { BoardGroupVersion } from '../../src/app/model/grouping';
import { ModelJson } from '../../src/app/model/ml-types';
import { MsgFromMain } from './predict-pull.worker';

export type Prediction = { gameNumber: number; predictedMs: number };

type WorkerMsg =
  | { t: 'ready' }
  | { t: 'result'; gameNumber: number; predictedMs: number };

export class WorkerPool {
  private readonly workerPathTs: string;
  private readonly workerPathJs: string | null;
  private readonly threads: number;
  private readonly model: ModelJson;
  private readonly queue: number[];
  private readonly results: Prediction[] = [];
  private activeWorkers = 0;
  private resolveFn?: (res: Prediction[]) => void;
  private rejectFn?: (err: unknown) => void;
  private boardGeneratorVersion: BoardGroupVersion;

  constructor(opts: { workerPath: string; threads: number; model: ModelJson; numbers: number[], boardGeneratorVersion: BoardGroupVersion}) {
    this.boardGeneratorVersion = opts.boardGeneratorVersion;
    this.workerPathTs = path.resolve(opts.workerPath);
    const relFromRoot = path.relative(path.resolve('.'), this.workerPathTs).replace(/\\/g, '/');
    const compiled = path.resolve('out-tsc/node', relFromRoot.replace(/\.ts$/, '.js'));
    // Always compile dev-tools once per process to ensure module settings are correct
    try {
      compileDevToolsOnce();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to precompile worker; parallel run may be unavailable.', err);
    }
    this.workerPathJs = existsSync(compiled) ? compiled : null;
    this.threads = Math.max(1, opts.threads | 0);
    this.model = opts.model;
    this.queue = opts.numbers.slice();
  }

  async run(): Promise<Prediction[]> {
    return new Promise<Prediction[]>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
      const spawnCount = Math.min(this.threads, this.queue.length || this.threads);
      for (let i = 0; i < spawnCount; i++) this.spawnWorker();
      if (spawnCount === 0) resolve([]);
    });
  }

  private spawnWorker(): void {
    if (!this.workerPathJs) throw new Error('Compiled worker not available');
    const worker = new Worker(this.workerPathJs, {
      workerData: { model: this.model },
      execArgv: [],
    });
    this.activeWorkers++;
    worker.on('message', (msg: WorkerMsg) => this.onMessage(worker, msg));
    worker.on('error', (err) => this.onError(err));
    worker.on('exit', () => this.onExit());
  }

  private onMessage(worker: Worker, msg: WorkerMsg): void {
    if (msg.t === 'ready') {
      const next = this.queue.shift();
      let message: MsgFromMain;
      if (next == null)
        message = { t: 'no-more' }
      else
        message = { t: 'task', gameNumber: next, boardGeneratorVersion: this.boardGeneratorVersion };

      worker.postMessage(message);
    } else if (msg.t === 'result') {
      this.results.push({ gameNumber: msg.gameNumber, predictedMs: msg.predictedMs });
    }
  }

  private onError(err: unknown): void {
    if (this.rejectFn) this.rejectFn(err);
  }

  private onExit(): void {
    this.activeWorkers--;
    if (this.activeWorkers === 0 && this.resolveFn) {
      this.resolveFn(this.results);
    }
  }
}

let compiledOnce = false;
function compileDevToolsOnce(): void {
  if (compiledOnce) return;
  compiledOnce = true;
  try {
    // Dynamically import TypeScript to avoid impacting normal runtime
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ts: typeof import('typescript') = require('typescript');
    const configPath = path.resolve('development-tools/tsconfig.json');
    const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
    if (cfg.error) throw new Error(ts.formatDiagnosticsWithColorAndContext([cfg.error], {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }));
    const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, path.dirname(configPath));
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
    const emitResult = program.emit();
    const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diagnostics.length) {
      const text = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
      });
      // eslint-disable-next-line no-console
      console.warn('TypeScript compile diagnostics for development-tools:\n' + text);
    }
  } catch (err) {
    throw err;
  }
}
