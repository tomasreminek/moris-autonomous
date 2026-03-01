/**
 * RAG (Retrieval-Augmented Generation) System
 * PDF upload, document processing, vector search for agents
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');

class RAGSystem {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      uploadDir: config.uploadDir || './data/documents',
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      allowedTypes: config.allowedTypes || ['.pdf', '.txt', '.md', '.doc', '.docx'],
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      ...config
    };
    this.documents = new Map();
    this.initialized = false;
  }

  async init() {
    // Ensure upload directory exists
    try {
      await fs.mkdir(this.config.uploadDir, { recursive: true });
      logger.info('RAG system initialized, documents directory ready');
    } catch (error) {
      logger.error('Failed to initialize RAG system:', error);
      throw error;
    }
    this.initialized = true;
    return this;
  }

  // Upload document for agent
  async uploadDocument(agentId, userId, fileBuffer, originalName, mimeType) {
    if (!this.initialized) {
      throw new Error('RAG system not initialized');
    }

    const ext = path.extname(originalName).toLowerCase();
    if (!this.config.allowedTypes.includes(ext)) {
      throw new Error(`File type ${ext} not allowed. Allowed: ${this.config.allowedTypes.join(', ')}`);
    }

    if (fileBuffer.length > this.config.maxFileSize) {
      throw new Error(`File too large. Max: ${this.config.maxFileSize / 1024 / 1024}MB`);
    }

    // Check agent document limit
    const agentDocs = await this.getAgentDocuments(agentId);
    const agentConfig = await this.getAgentConfig(agentId);
    if (agentDocs.length >= (agentConfig?.maxDocuments || 50)) {
      throw new Error(`Agent ${agentId} has reached maximum document limit`);
    }

    // Generate unique ID
    const docId = `doc_${crypto.randomBytes(8).toString('hex')}`;
    const fileName = `${docId}_${originalName}`;
    const filePath = path.join(this.config.uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    // Extract and chunk content
    const content = await this.extractContent(filePath, ext, mimeType);
    const chunks = this.chunkContent(content);

    // Create embeddings (simplified - in production use OpenAI or local embeddings)
    const embedding = await this.createEmbedding(chunks.join(' '));

    // Store document metadata
    const document = {
      id: docId,
      agentId,
      userId,
      originalName,
      fileName,
      filePath,
      mimeType,
      size: fileBuffer.length,
      chunks: chunks.length,
      embedding: JSON.stringify(embedding),
      uploadedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
      status: 'active'
    };

    // Save to database
    this.db.addRAGDocument(document);

    logger.info(`Document uploaded: ${docId} for agent ${agentId}`);
    return {
      success: true,
      documentId: docId,
      chunks: chunks.length,
      message: `Document ${originalName} uploaded and processed successfully`
    };
  }

  // Extract content from different file types
  async extractContent(filePath, extension, mimeType) {
    // For MVP, support basic text extraction
    // In production, add PDF parsing, DOCX parsing, etc.
    
    if (extension === '.txt' || extension === '.md') {
      return await fs.readFile(filePath, 'utf-8');
    }
    
    if (extension === '.pdf') {
      // Return placeholder for PDF - real implementation needs pdf-parse
      return `[PDF content extracted from ${path.basename(filePath)}]`;
    }
    
    if (['.doc', '.docx'].includes(extension)) {
      return `[Document content extracted from ${path.basename(filePath)}]`;
    }
    
    // Try to read as text anyway
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return `[Binary content: ${path.basename(filePath)}]`;
    }
  }

  // Chunk content for embedding
  chunkContent(content) {
    const chunks = [];
    const words = content.split(/\s+/);
    let currentChunk = [];
    let currentSize = 0;

    for (const word of words) {
      currentChunk.push(word);
      currentSize += word.length + 1;
      
      if (currentSize >= this.config.chunkSize) {
        chunks.push(currentChunk.join(' '));
        // Keep overlap
        currentChunk = currentChunk.slice(-Math.floor(this.config.chunkOverlap / 10));
        currentSize = currentChunk.join(' ').length;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  // Create embedding for content
  async createEmbedding(text) {
    // Simplified embedding - in production use OpenAI embeddings or local model
    // Returns a 384-dimensional vector (simulated for MVP)
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    const embedding = [];
    for (let i = 0; i < 384; i++) {
      // Generate pseudo-random but consistent values from hash
      const hexByte = hash.substr((i * 2) % hash.length, 2);
      embedding.push((parseInt(hexByte, 16) / 255) * 2 - 1); // Normalize to -1, 1
    }
    return embedding;
  }

  // Search documents for agent
  async searchDocuments(agentId, query, limit = 5) {
    if (!this.initialized) {
      throw new Error('RAG system not initialized');
    }

    const queryEmbedding = await this.createEmbedding(query);
    const documents = await this.getAgentDocuments(agentId);
    
    if (documents.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const results = documents
      .map(doc => ({
        ...doc,
        similarity: this.calculateSimilarity(queryEmbedding, JSON.parse(doc.embedding || '[]'))
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Update access stats
    for (const doc of results) {
      this.db.updateRAGDocumentAccess(doc.id);
    }

    return results.map(r => ({
      id: r.id,
      originalName: r.originalName,
      similarity: r.similarity,
      uploadedAt: r.uploadedAt,
      chunks: r.chunks
    }));
  }

  // Calculate cosine similarity
  calculateSimilarity(embeddingA, embeddingB) {
    if (embeddingA.length !== embeddingB.length || embeddingA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      normA += embeddingA[i] * embeddingA[i];
      normB += embeddingB[i] * embeddingB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  // Get agent documents
  async getAgentDocuments(agentId) {
    return this.db.getRAGDocumentsByAgent(agentId);
  }

  // Delete document
  async deleteDocument(docId, userId) {
    const doc = this.db.getRAGDocument(docId);
    if (!doc) {
      throw new Error('Document not found');
    }

    // Check ownership or admin
    if (doc.userId !== userId && doc.agentId !== 'admin') {
      throw new Error('Unauthorized to delete this document');
    }

    // Delete file
    try {
      await fs.unlink(doc.filePath);
    } catch (error) {
      logger.warn('File already deleted or not found:', doc.filePath);
    }

    // Delete from database
    this.db.deleteRAGDocument(docId);
    
    logger.info(`Document deleted: ${docId}`);
    return { success: true, message: 'Document deleted' };
  }

  // Get agent RAG stats
  async getAgentRAGStats(agentId) {
    const docs = await this.getAgentDocuments(agentId);
    const totalSize = docs.reduce((sum, d) => sum + (d.size || 0), 0);
    
    return {
      totalDocuments: docs.length,
      totalChunks: docs.reduce((sum, d) => sum + (d.chunks || 0), 0),
      totalSize: totalSize,
      avgDocumentSize: docs.length > 0 ? totalSize / docs.length : 0,
      lastDocument: docs.length > 0 ? docs[docs.length - 1].uploadedAt : null
    };
  }

  // Get context for agent query
  async getContextForAgent(agentId, query, maxTokens = 2000) {
    const relevantDocs = await this.searchDocuments(agentId, query, 3);
    
    if (relevantDocs.length === 0) {
      return '';
    }

    const context = relevantDocs
      .map(d => `[Document: ${d.originalName} (relevance: ${(d.similarity * 100).toFixed(1)}%)]`)
      .join('\n');

    return context;
  }
}

module.exports = { RAGSystem };
