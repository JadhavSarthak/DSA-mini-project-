import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { SearchService } from './src/backend/searchService.ts';
import { EvaluationEngine } from './src/backend/evaluation.ts';
import { BenchmarkRunner } from './src/backend/benchmarks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Initialize SearchService
  const sampleCorpusDir = path.resolve(__dirname, 'data/sample');
  const searchService = new SearchService(sampleCorpusDir);
  console.log(`[Nexora] Initialized engine with ${searchService.getStats().documentCount} documents.`);

  // API Endpoints

  // 1. Trie Autocomplete Suggestions
  app.get('/api/suggest', (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const suggestions = searchService.getSuggestions(q, limit);
    res.json({ prefix: q, suggestions });
  });

  // 2. Synchronous Search with BM25 / TF ranking & Bounded Min-Heap Top-K
  app.get('/api/search', (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const mode = (req.query.mode as 'OR' | 'AND') || 'OR';
    const ranking = (req.query.ranking as 'BM25' | 'TF') || 'BM25';
    const k = req.query.k ? parseInt(req.query.k as string, 10) : 5;
    const trace = req.query.trace === 'true';

    const output = searchService.searchSync(q, mode, ranking, k, trace);
    res.json(output);
  });

  app.post('/api/search', (req: Request, res: Response) => {
    const { q = '', mode = 'OR', ranking = 'BM25', k = 5, trace = false } = req.body;
    const output = searchService.searchSync(q, mode, ranking, k, trace);
    res.json(output);
  });

  // 3. FIFO Query Queue submission and inspection
  app.post('/api/queue/submit', (req: Request, res: Response) => {
    const { query = '', mode = 'OR', ranking = 'BM25', k = 5 } = req.body;
    const result = searchService.enqueueSearch(query, mode, ranking, k);
    res.json(result);
  });

  app.get('/api/queue/jobs', (_req: Request, res: Response) => {
    const queue = searchService.getQueryQueue();
    res.json({
      length: queue.length,
      pending: queue.getPendingJobs(),
      history: queue.getJobHistory(30),
    });
  });

  app.get('/api/queue/jobs/:id', (req: Request, res: Response) => {
    const queue = searchService.getQueryQueue();
    const job = queue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });

  // 4. Documents & Relationships
  app.get('/api/documents', (_req: Request, res: Response) => {
    const docs = searchService.getAllDocuments().map((d) => ({
      id: d.id,
      title: d.title,
      filename: d.filename,
      length: d.length,
      path: d.path,
    }));
    res.json({ documents: docs });
  });

  app.get('/api/documents/:id', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const doc = searchService.getDocument(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  });

  app.get('/api/documents/:id/related', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    const related = searchService.getRelatedDocuments(id, limit);
    res.json({ docId: id, related });
  });

  app.get('/api/documents/:id/reachable', (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const depth = req.query.depth ? parseInt(req.query.depth as string, 10) : 2;
    const levels = searchService.getReachableDocuments(id, depth);
    res.json({ docId: id, maxDepth: depth, levels });
  });

  // 5. Full Document Relationship Graph
  app.get('/api/graph', (_req: Request, res: Response) => {
    const graphData = searchService.getGraphData();
    res.json(graphData);
  });

  // 6. System & DSA Stats
  app.get('/api/stats', (_req: Request, res: Response) => {
    res.json(searchService.getStats());
  });

  // 7. Information Retrieval Evaluation (Precision@K, Recall@K, MRR)
  app.get('/api/eval', (req: Request, res: Response) => {
    const k = req.query.k ? parseInt(req.query.k as string, 10) : 3;
    const tsvPath = path.resolve(__dirname, 'data/sample/queries.tsv');
    try {
      const evalResult = EvaluationEngine.evaluate(searchService, tsvPath, k);
      res.json(evalResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Performance Benchmark Runner
  app.get('/api/benchmarks', (_req: Request, res: Response) => {
    try {
      const benchmarkResult = BenchmarkRunner.run(searchService);
      res.json(benchmarkResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Inspect internal data structures (Trie subtree, Inverted index postings)
  app.get('/api/inspect/trie', (req: Request, res: Response) => {
    const prefix = (req.query.prefix as string) || '';
    const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : 3;
    const tree = searchService.getAutocompleteTrie().inspectTree(prefix, maxDepth);
    res.json(tree);
  });

  app.get('/api/inspect/index', (req: Request, res: Response) => {
    const prefix = (req.query.prefix as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 60;
    const terms = searchService.getInvertedIndex().inspectTerms(limit, prefix);
    res.json({ terms });
  });

  // Reload corpus
  app.post('/api/corpus/reload', (_req: Request, res: Response) => {
    const result = searchService.reloadCorpus(sampleCorpusDir);
    res.json(result);
  });

  // Add custom document
  app.post('/api/documents/custom', (req: Request, res: Response) => {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }
    const cleanFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    const targetPath = path.join(sampleCorpusDir, cleanFilename);
    fs.writeFileSync(targetPath, content, 'utf-8');
    const result = searchService.reloadCorpus(sampleCorpusDir);
    res.json({ success: true, filename: cleanFilename, reloadResult: result });
  });

  // 10. Native C++17 Binary Execution Endpoints
  app.get('/api/cpp/test', async (_req: Request, res: Response) => {
    const { exec } = await import('child_process');
    exec('./run_tests', { cwd: __dirname }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        error: err ? err.message : null,
      });
    });
  });

  app.get('/api/cpp/benchmark', async (_req: Request, res: Response) => {
    const { exec } = await import('child_process');
    exec('./benchmark', { cwd: __dirname }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        error: err ? err.message : null,
      });
    });
  });

  app.get('/api/cpp/eval', async (req: Request, res: Response) => {
    const k = req.query.k ? parseInt(req.query.k as string, 10) : 3;
    const { exec } = await import('child_process');
    exec(`./evaluate ${k}`, { cwd: __dirname }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        error: err ? err.message : null,
      });
    });
  });

  app.get('/api/cpp/demo', async (_req: Request, res: Response) => {
    const { exec } = await import('child_process');
    exec('./nexora demo', { cwd: __dirname }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        error: err ? err.message : null,
      });
    });
  });

  app.get('/api/cpp/check', async (_req: Request, res: Response) => {
    const { exec } = await import('child_process');
    exec('make check', { cwd: __dirname }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        error: err ? err.message : null,
      });
    });
  });

  // Mount Vite or static server
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'))) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[Nexora] dist/ not found, using Vite middleware fallback');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexora] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Nexora] Failed to start server:', err);
  process.exit(1);
});
