# Deployment Guide - Modal

This guide explains how to deploy the SAP Endpoint Generator to Modal for production use with pilot customers.

## Overview

The Modal deployment provides:
- **Ephemeral sandboxes** - Spin up on-demand, shut down when done
- **HTTP API** - RESTful endpoint for web apps
- **Persistent storage** - Generated code saved to Modal volumes
- **Session management** - Resume and fork long-running generations
- **Cost efficiency** - Only pay when generating (~$0.05/hour + API costs)

## Prerequisites

1. **Modal Account & CLI**
   ```bash
   # Install Modal CLI (Python-based CLI tool)
   pip install modal
   modal setup
   ```

2. **Modal JavaScript SDK**
   ```bash
   # Already installed in this project
   npm install modal
   ```

3. **Anthropic API Key**
   ```bash
   # Create secret in Modal (do this once)
   modal secret create anthropic-api-key ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Build and Test Locally**
   ```bash
   npm install
   npm run build
   npm test
   ```

## Deployment Approaches

### Approach 1: TypeScript SDK (Recommended)

Run Modal sandboxes directly from your TypeScript/Node.js application. Best for:
- Integrating with existing Node.js backends
- Full control over sandbox lifecycle
- Type-safe API

**Start the API server:**
```bash
# Build the project
npm run build

# Start the HTTP server (uses Modal sandboxes internally)
node dist/modal-deployment.js serve 3000
```

This starts an HTTP API at `http://localhost:3000` that creates Modal sandboxes on-demand.

**Test the API:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "acme",
    "sap_version": "ECC6",
    "config_files": {
      "VBAK_structure.txt": "Table: VBAK\nField Data Type Length Description\nVBELN CHAR 10 Document Number"
    },
    "quote_fields": ["customer_id", "quote_date", "total_amount"]
  }'
```

**Download generated code:**
```bash
curl http://localhost:3000/api/download/acme -o acme-code.tar.gz
```

### Approach 2: Simple Script

For one-off generations or testing:

```bash
# Run the example
npx ts-node examples/modal-simple.ts
```

This creates a sandbox, generates code, and cleans up.

### 3. Monitor Usage

```bash
# View running sandboxes
modal app list

# List sandboxes for specific app
modal app logs sap-endpoint-generator

# View storage usage
modal volume list
```

## Integration with Your Web App

### Frontend Upload Flow

```typescript
// Example React component
import { useState } from 'react';

export function SAPGenerator() {
  const [files, setFiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function generateCode() {
    setLoading(true);

    try {
      const response = await fetch('https://your-org--sap-endpoint-generator-api-generate.modal.run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'acme',
          sap_version: 'ECC6',
          config_files: files,
          quote_fields: ['customer_id', 'quote_date', 'total_amount'],
          custom_fields: { ZZPRIORITY: 'Priority level' },
        }),
      });

      const data = await response.json();
      setResult(data);

      // Download generated code
      if (data.session_id) {
        console.log('Session ID for resumption:', data.session_id);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>SAP Endpoint Generator</h2>

      {/* File upload UI */}
      <input
        type="file"
        multiple
        onChange={(e) => {
          // Read files and add to state
        }}
      />

      <button onClick={generateCode} disabled={loading}>
        {loading ? 'Generating...' : 'Generate SAP Code'}
      </button>

      {result && (
        <div>
          <h3>Generation Complete!</h3>
          <p>Session ID: {result.session_id}</p>
          <p>Files Generated: {result.files.length}</p>
          <ul>
            {result.files.map(file => <li key={file}>{file}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Backend API (Optional - for auth/validation)

```python
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

MODAL_ENDPOINT = "https://your-org--sap-endpoint-generator-api-generate.modal.run"

@app.post("/api/generate-sap-endpoint")
async def generate_sap_endpoint(request: dict, user_id: str):
    """
    Proxy to Modal with authentication and rate limiting
    """
    # Validate user permissions
    if not await check_user_access(user_id):
        raise HTTPException(403, "Not authorized")

    # Rate limit check
    if not await check_rate_limit(user_id):
        raise HTTPException(429, "Rate limit exceeded")

    # Forward to Modal
    async with httpx.AsyncClient() as client:
        response = await client.post(
            MODAL_ENDPOINT,
            json=request,
            timeout=1800.0,  # 30 minutes
        )
        return response.json()
```

## Cost Estimation

### For Pilot Customer (Assuming 10 generations/day)

**Infrastructure (Modal):**
- Average generation time: 10 minutes
- Total daily compute: 10 generations × 10 min = 100 minutes
- Cost: 100/60 hours × $0.05/hour = **$0.08/day**
- Monthly: **~$2.40/month**

**AI API (Anthropic):**
- Per generation: ~$1-3 depending on complexity
- Daily: 10 × $2 = **$20/day**
- Monthly: **~$600/month**

**Storage (Modal Volumes):**
- ~10MB per customer
- 10 customers = 100MB
- Cost: **Negligible** (<$0.01/month)

**Total Monthly Cost: ~$600** (dominated by API costs, not infrastructure)

### Cost Optimization Tips

1. **Reuse sessions** - Resume instead of starting fresh saves tokens
2. **Cache common results** - Same config → same code
3. **Set token limits** - Use `maxTokens` in query options
4. **Idle timeouts** - Shut down inactive sandboxes quickly

## Session Management in Production

### Resume Interrupted Generation

```bash
curl -X POST https://your-endpoint.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "acme",
    "resume_session_id": "abc-123-xyz",
    "fork_session": false
  }'
```

### Fork to Try Different Approach

```bash
curl -X POST https://your-endpoint.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "acme",
    "resume_session_id": "abc-123-xyz",
    "fork_session": true,
    "special_logic": "Try a different validation approach"
  }'
```

## Monitoring and Observability

### Logging

Modal automatically captures:
- stdout/stderr from your code
- Sandbox lifecycle events
- API call costs and durations

Access logs via:
```bash
modal app logs sap-endpoint-generator --follow
```

### Metrics to Track

1. **Generation success rate** - How many complete successfully?
2. **Average generation time** - 5-15 minutes expected
3. **API costs per generation** - Track by customer
4. **Error types** - What causes failures?

### Alerts to Set Up

- Generation taking >20 minutes (might be stuck)
- Daily API costs exceed $100 (unexpected usage)
- Error rate >10% (quality issue)

## Security Considerations

### 1. Input Validation

Always validate customer inputs:
- Customer name: alphanumeric + hyphens only
- SAP version: Must be R3, ECC6, or S4HANA
- Config files: Check file sizes (<10MB each)

### 2. API Key Protection

Never expose your Modal endpoint without:
- Authentication (JWT, API keys)
- Rate limiting (e.g., 10 requests/hour per user)
- Request validation

### 3. Output Sanitization

Generated ABAP code should be:
- Scanned for secrets before delivery
- Validated for SAP syntax
- Reviewed for security issues (SQL injection, auth bypass)

## Pilot Customer Checklist

- [ ] Deploy to Modal
- [ ] Test with real SAP config files
- [ ] Set up monitoring and alerts
- [ ] Create customer documentation
- [ ] Implement authentication
- [ ] Set rate limits
- [ ] Create feedback collection mechanism
- [ ] Establish support process
- [ ] Document known limitations
- [ ] Set up backup/disaster recovery

## Next Steps

1. **Week 1**: Deploy and test with internal team
2. **Week 2**: Onboard first pilot customer
3. **Week 3**: Gather feedback, iterate
4. **Week 4**: Scale to 3-5 pilot customers

## Support

For issues with:
- **Modal deployment**: https://modal.com/docs
- **Claude Agent SDK**: https://docs.anthropic.com/agent-sdk
- **This generator**: Contact your development team
