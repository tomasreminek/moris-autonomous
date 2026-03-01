/**
 * RAG System - Retrieval Augmented Generation
 * PDF learning and knowledge retrieval for agents
 */

const { logger } = require('./logger');
const fs = require('fs').promises;
const path = require('path');

class RAGSystem {
  constructor(config = {}) {
    this.config = {
      storageDir: config.storageDir || './data/knowledge',
      vectorDb: config.vectorDb || './data/vectors.db',
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      embeddingModel: config.embeddingModel || 'sentence-transformers/all-MiniLM-L6-v2',
      ...config
    };
    
    this.knowledgeBases = new Map();
    this.agentKnowledge = new Map(); // agent_id -> [kb_ids]
    this.ensureStorageDir();
  }

  async ensureStorageDir() {
    try {
      await fs.mkdir(this.config.storageDir, { recursive: true });
      await fs.mkdir(path.join(this.config.storageDir, 'pdfs'), { recursive: true });
      await fs.mkdir(path.join(this.config.storageDir, 'chunks'), { recursive: true });
    } catch (error) {
      logger.error('Failed to create RAG storage directories:', error);
    }
  }

  // Create knowledge base for agent
  async createKnowledgeBase(agentId, name, description = '') {
    const kbId = `kb_${Date.now()}_${agentId}`;
    
    const knowledgeBase = {
      id: kbId,
      agentId,
      name,
      description,
      documents: [],
      chunks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.knowledgeBases.set(kbId, knowledgeBase);
    
    // Link to agent
    if (!this.agentKnowledge.has(agentId)) {
      this.agentKnowledge.set(agentId, []);
    }
    this.agentKnowledge.get(agentId).push(kbId);
    
    logger.info(`Knowledge base created: ${kbId} for agent ${agentId}`);
    return knowledgeBase;
  }

  // Upload PDF to knowledge base
  async uploadPDF(kbId, pdfPath, metadata = {}) {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${kbId}`);
    }

    logger.info(`Processing PDF for knowledge base ${kbId}: ${pdfPath}`);

    // Extract text from PDF
    const extractionResult = await this.extractPDFText(pdfPath);
    
    // Create document record
    const docId = `doc_${Date.now()}`;
    const document = {
      id: docId,
      filename: path.basename(pdfPath),
      originalPath: pdfPath,
      text: extractionResult.text,
      pages: extractionResult.pages,
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString(),
        wordCount: extractionResult.text.split(' ').length
      }
    };

    // Chunk the document
    const chunks = this.chunkDocument(document);
    
    // Generate embeddings for chunks (placeholder - would use real embedding model)
    for (const chunk of chunks) {
      chunk.embedding = await this.generateEmbedding(chunk.text);
    }

    // Store document and chunks
    kb.documents.push(document);
    kb.chunks.push(...chunks);
    kb.updatedAt = new Date().toISOString();

    // Save to disk
    await this.saveKnowledgeBase(kb);

    logger.info(`PDF uploaded and processed: ${document.filename} (${chunks.length} chunks)`);
    
    return {
      documentId: docId,
      chunks: chunks.length,
      wordCount: document.metadata.wordCount
    };
  }

  // Extract text from PDF (simplified - would use pdf-parse in production)
  async extractPDFText(pdfPath) {
    try {
      // In production: const pdfParse = require('pdf-parse');
      // const data = await pdfParse(await fs.readFile(pdfPath));
      
      // Placeholder implementation
      logger.info(`Would extract text from: ${pdfPath}`);
      
      return {
        text: `[PDF content would be extracted here]\n\nThis is a placeholder. In production, use pdf-parse library.\n\nFile: ${path.basename(pdfPath)}`,
        pages: Math.floor(Math.random() * 50) + 5 // Placeholder
      };
    } catch (error) {
      logger.error(`Failed to extract PDF text: ${pdfPath}`, error);
      throw error;
    }
  }

  // Chunk document into smaller pieces
  chunkDocument(document) {
    const { chunkSize, chunkOverlap } = this.config;
    const text = document.text;
    const chunks = [];
    
    let position = 0;
    let chunkIndex = 0;
    
    while (position < text.length) {
      const end = Math.min(position + chunkSize, text.length);
      const chunkText = text.substring(position, end);
      
      chunks.push({
        id: `${document.id}_chunk_${chunkIndex}`,
        documentId: document.id,
        text: chunkText,
        startIndex: position,
        endIndex: end,
        embedding: null // Will be generated later
      });
      
      position += chunkSize - chunkOverlap;
      chunkIndex++;
    }
    
    return chunks;
  }

  // Generate embedding for text (placeholder)
  async generateEmbedding(text) {
    // In production, this would call an embedding API like:
    // - OpenAI text-embedding-ada-002
    // - Hugging Face sentence-transformers
    // - Local model
    
    // Placeholder: generate random vector
    const dimensions = 384; // MiniLM-L6 dimension
    const embedding = Array(dimensions).fill(0).map(() => 
      (Math.random() - 0.5) * 2
    );
    
    // Normalize (make unit vector)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  // Query knowledge base
  async query(kbId, query, options = {}) {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) {
      throw new Error(`Knowledge base not found: ${kbId}`);
    }

    const { topK = 5, threshold = 0.5 } = options;

    logger.info(`Querying knowledge base ${kbId}: "${query.substring(0, 50)}..."`);

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Find most similar chunks
    const similarities = kb.chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Sort by similarity and filter
    const results = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .filter(r => r.similarity >= threshold)
      .slice(0, topK);

    logger.info(`Query returned ${results.length} results`);

    return {
      query,
      results: results.map(r => ({
        text: r.chunk.text,
        similarity: r.similarity,
        document: kb.documents.find(d => d.id === r.chunk.documentId)?.filename,
        chunkId: r.chunk.id
      })),
      context: results.map(r => r.chunk.text).join('\n\n---\n\n')
    };
  }

  // Query all knowledge bases for an agent
  async queryAgent(agentId, query, options = {}) {
    const kbIds = this.agentKnowledge.get(agentId) || [];
    
    if (kbIds.length === 0) {
      return {
        query,
        results: [],
        context: '',
        message: 'Agent has no knowledge bases'
      };
    }

    // Query all KBs and merge results
    const allResults = [];
    
    for (const kbId of kbIds) {
      const result = await this.query(kbId, query, { ...options, topK: 3 });
      allResults.push(...result.results);
    }

    // Sort by similarity and take top K
    const mergedResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.topK || 5);

    return {
      query,
      results: mergedResults,
      context: mergedResults.map(r => r.text).join('\n\n---\n\n'),
      sourcesKb: kbIds.length
    };
  }

  // Cosine similarity between two vectors
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Save knowledge base to disk
  async saveKnowledgeBase(kb) {
    const filepath = path.join(this.config.storageDir, `${kb.id}.json`);
    await fs.writeFile(filepath, JSON.stringify(kb, null, 2));
  }

  // Load knowledge base from disk
  async loadKnowledgeBase(kbId) {
    const filepath = path.join(this.config.storageDir, `${kbId}.json`);
    const data = await fs.readFile(filepath, 'utf8');
    const kb = JSON.parse(data);
    this.knowledgeBases.set(kbId, kb);
    return kb;
  }

  // Get knowledge base stats
  getStats(kbId) {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) return null;

    return {
      id: kb.id,
      name: kb.name,
      documents: kb.documents.length,
      chunks: kb.chunks.length,
      totalWords: kb.documents.reduce((sum, d) => sum + d.metadata.wordCount, 0),
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt
    };
  }

  // List knowledge bases for agent
  listAgentKnowledgeBases(agentId) {
    const kbIds = this.agentKnowledge.get(agentId) || [];
    return kbIds.map(id => this.getStats(id)).filter(Boolean);
  }

  // Delete knowledge base
  async deleteKnowledgeBase(kbId) {
    const kb = this.knowledgeBases.get(kbId);
    if (!kb) return false;

    // Remove from agent link
    const agentKbs = this.agentKnowledge.get(kb.agentId) || [];
    const index = agentKbs.indexOf(kbId);
    if (index > -1) agentKbs.splice(index, 1);

    // Delete file
    try {
      const filepath = path.join(this.config.storageDir, `${kbId}.json`);
      await fs.unlink(filepath);
    } catch (e) { /* ignore */ }

    // Remove from memory
    this.knowledgeBases.delete(kbId);

    logger.info(`Knowledge base deleted: ${kbId}`);
    return true;
  }
}

// Document Processing Agent with RAG
class DocumentAgent extends require('./agents').BaseAgent {
  constructor(config = {}) {
    super({
      name: config.name || 'Document Expert',
      role: 'documents',
      description: 'Expert in processing documents, PDFs, and knowledge retrieval',
      talents: ['Input', 'Learner', 'Context', 'Intellection'],
      ...config
    });

    this.rag = new RAGSystem();
    this.registerSkill('upload_pdf', this.uploadPDF.bind(this));
    this.registerSkill('query_knowledge', this.queryKnowledge.bind(this));
    this.registerSkill('create_kb', this.createKnowledgeBase.bind(this));
    this.registerSkill('learn_from_pdf', this.learnFromPDF.bind(this));
  }

  async createKnowledgeBase(data) {
    const { name, description } = data;
    return this.rag.createKnowledgeBase(this.id, name, description);
  }

  async uploadPDF(data) {
    const { kbId, pdfPath, metadata } = data;
    return this.rag.uploadPDF(kbId, pdfPath, metadata);
  }

  async learnFromPDF(data) {
    const { pdfPath, metadata = {} } = data;
    
    // Create KB if not exists
    let kbId = this.recall('default_kb');
    if (!kbId) {
      const kb = await this.rag.createKnowledgeBase(
        this.id,
        `${this.name}'s Knowledge`,
        'Auto-created knowledge base'
      );
      kbId = kb.id;
      this.remember('default_kb', kbId);
    }

    // Upload and process
    const result = await this.rag.uploadPDF(kbId, pdfPath, metadata);
    
    return {
      learned: true,
      knowledgeBaseId: kbId,
      documentId: result.documentId,
      chunksProcessed: result.chunks,
      wordCount: result.wordCount
    };
  }

  async queryKnowledge(data) {
    const { query, kbId, options = {} } = data;
    
    if (kbId) {
      return this.rag.query(kbId, query, options);
    } else {
      return this.rag.queryAgent(this.id, query, options);
    }
  }

  async getStats() {
    const kbIds = this.rag.agentKnowledge.get(this.id) || [];
    return kbIds.map(id => this.rag.getStats(id));
  }

  async execute(taskType, data) {
    switch (taskType) {
      case 'learn': return this.executeSkill('learn_from_pdf', data);
      case 'query': return this.executeSkill('query_knowledge', data);
      case 'upload': return this.executeSkill('upload_pdf', data);
      case 'create_kb': return this.executeSkill('create_kb', data);
      default: throw new Error(`Unknown document task: ${taskType}`);
    }
  }
}

module.exports = { RAGSystem, DocumentAgent };