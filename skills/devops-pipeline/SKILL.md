# DevOps Pipeline Skill Pack

## Description
Self-healing infrastructure with security-first deployment pipeline.

## Agents Involved
- Pro Coder (code review)
- Security Auditor (vulnerability scan)
- DevOps Engineer (deployment)
- QA Tester (validation)

## Workflow
1. **Pro Coder** reviews commits → identifies issues
2. **Security Auditor** scans for vulnerabilities
3. **DevOps** deploys to staging → validates
4. **QA Tester** runs test suite
5. **Security** final review → production deploy

## Features
- Auto-rollback on failure
- Security report with every deploy
- SSH access to all machines
- k3s/kubernetes support

## Usage
```
@devops-pipeline "Deploy latest to production"
@devops-pipeline "Security audit current codebase"
```

## Configuration
- SSH keys for target machines
- 1Password credentials reference
- k3s config
- Deployment targets

## Tags
devops, deployment, security, automation, infrastructure
