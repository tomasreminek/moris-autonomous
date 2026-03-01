/**
 * 🎫 License Manager — Freemium Tier Control
 * Kontrola oprávnění podle subscription tieru
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LicenseManager {
  constructor(config = {}) {
    this.tier = config.TIER || 'free';
    this.trialUntil = config.TRIAL_UNTIL || null;
    
    // Limity podle tieru
    this.limits = {
      free: {
        agents: 2,
        projects: 3,
        tasksPerProject: 10,
        documents: 0,
        features: ['basic_agents', 'basic_tasks']
      },
      starter: {
        agents: 5,
        projects: 10,
        tasksPerProject: 50,
        documents: 10,
        features: ['basic_agents', 'basic_tasks', 'rag', 'email_support']
      },
      pro: {
        agents: 12,
        projects: Infinity,
        tasksPerProject: Infinity,
        documents: 100,
        features: ['basic_agents', 'basic_tasks', 'rag', 'api_access', 'reports', 'priority_support']
      },
      enterprise: {
        agents: 21,
        projects: Infinity,
        tasksPerProject: Infinity,
        documents: Infinity,
        features: ['all', 'whitelabel', 'sso', 'sla', 'on_premise']
      }
    };
    
    this.watermark = this.tier === 'free';
  }
  
  /**
   * Zkontrolovat, zda je aktivní trial
   */
  isTrialActive() {
    if (!this.trialUntil) return false;
    return new Date(this.trialUntil) > new Date();
  }
  
  /**
   * Získat efektivní tier (trial = vyšší tier)
   */
  getEffectiveTier() {
    if (this.isTrialActive()) {
      return 'pro'; // Trial dává PRO features
    }
    return this.tier;
  }
  
  /**
   * Zkontrolovat limit
   */
  canAdd(resource, currentCount) {
    const effective = this.getEffectiveTier();
    const limit = this.limits[effective]?.[resource];
    
    if (limit === Infinity) return { allowed: true };
    if (limit === undefined) return { allowed: false, reason: 'Unknown resource' };
    
    const allowed = currentCount < limit;
    return {
      allowed,
      current: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      reason: allowed ? null : `Limit dosažen: ${limit} ${resource}`
    };
  }
  
  /**
   * Zkontrolovat feature
   */
  hasFeature(featureName) {
    const effective = this.getEffectiveTier();
    const features = this.limits[effective]?.features || [];
    
    // Enterprise má všechno
    if (features.includes('all')) return true;
    
    // Basic features jsou ve všech plánech
    if (featureName.startsWith('basic_')) return true;
    
    return features.includes(featureName);
  }
  
    /**
   * Seznam dostupných agentů
   */
  getAvailableAgents(allAgents) {
    const effective = this.getEffectiveTier();
    const limit = this.limits[effective]?.agents || 2;
    
    // Vždy dostupní: Moris + Dahlia (core)
    const core = allAgents.filter(a => ['moris', 'dahlia'].includes(a.id));
    
    // Další agenti podle limitu
    const extras = allAgents
      .filter(a => !['moris', 'dahlia'].includes(a.id))
      .slice(0, limit - core.length);
    
    return [...core, ...extras];
  }
  
  /**
   * Získat upgrade cestu
    */
  getUpgradePath() {
    const tiers = ['free', 'starter', 'pro', 'enterprise'];
    const currentIdx = tiers.indexOf(this.tier);
    
    if (currentIdx < tiers.length - 1) {
      return {
        canUpgrade: true,
        next: tiers[currentIdx + 1],
        current: this.tier
      };
    }
    
    return { canUpgrade: false, current: this.tier };
  }
  
  /**
   * Verze response pro watermark
   */
  decorateResponse(data) {
    if (!this.watermark) return data;
    
    if (typeof data === 'object' && data !== null) {
      return {
        ...data,
        _watermark: 'MORIS Free — moris-autonomous.com'
      };
    }
    return data;
  }
  
  /**
   * Status licence
   */
  getStatus() {
    return {
      tier: this.tier,
      effectiveTier: this.getEffectiveTier(),
      isTrial: this.isTrialActive(),
      trialUntil: this.trialUntil,
      limits: this.limits[this.getEffectiveTier()],
      canUpgrade: this.getUpgradePath().canUpgrade,
      watermark: this.watermark
    };
  }
  
  // --- Statické metody ---
  
  /**
   * Vytvořit trial licenci
   */
  static createTrial(email, tier = 'pro', days = 14) {
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    
    return {
      email,
      tier: tier.toLowerCase(),
      trial: true,
      trialStarted: new Date().toISOString(),
      trialUntil: expires.toISOString(),
      licenseKey: this.generateKey()
    };
  }
  
  /**
   * Vygenerovat licenční klíč
   */
  static generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const parts = [];
    for (let i = 0; i < 4; i++) {
      let part = '';
      for (let j = 0; j < 4; j++) {
        part += chars[Math.floor(Math.random() * chars.length)];
      }
      parts.push(part);
    }
    return parts.join('-');
  }
  
  /**
   * Validovat licenční klíč
   */
  static validateKey(key) {
    // Jednoduchá validace formátu
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(key);
  }
}

module.exports = { LicenseManager };
