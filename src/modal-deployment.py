"""
Modal Deployment for SAP Endpoint Generator
Provides a serverless endpoint for generating SAP code on-demand
"""

import modal
import os
import json
from pathlib import Path

# Create Modal app
app = modal.App("sap-endpoint-generator")

# Define the container image with all dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("nodejs", "npm", "git")
    .run_commands(
        # Install Claude Code CLI
        "npm install -g @anthropic-ai/claude-code",
        # Install Node.js 18+ for the TypeScript SDK
        "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
        "apt-get install -y nodejs",
    )
    .copy_local_dir(".", "/app")
    .workdir("/app")
    .run_commands(
        # Install dependencies and build
        "npm install",
        "npm run build",
    )
)

# Create a volume for persisting generated code
volume = modal.Volume.from_name("sap-generated-code", create_if_missing=True)

# Define the API key secret
secrets = [modal.Secret.from_name("anthropic-api-key")]


@app.function(
    image=image,
    volumes={"/output": volume},
    secrets=secrets,
    timeout=30 * 60,  # 30 minutes max per generation
    memory=2048,  # 2GB RAM
    cpu=2,  # 2 CPUs for faster generation
)
def generate_endpoint(
    customer_name: str,
    sap_version: str,
    config_files_content: dict[str, str],  # filename -> content
    quote_fields: list[str],
    custom_fields: dict[str, str] | None = None,
    special_logic: str | None = None,
    resume_session_id: str | None = None,
    fork_session: bool = False,
):
    """
    Generate SAP endpoint code using Claude Agent SDK

    Args:
        customer_name: Customer identifier (lowercase, no spaces)
        sap_version: SAP version (R3, ECC6, or S4HANA)
        config_files_content: Dictionary of config file names to their contents
        quote_fields: List of required quote fields
        custom_fields: Optional custom field definitions
        special_logic: Optional business logic description
        resume_session_id: Optional session ID to resume from
        fork_session: Whether to fork the resumed session

    Returns:
        Dictionary with:
        - session_id: Session ID for resumption
        - output_dir: Path to generated code
        - files: List of generated file paths
        - cost_usd: Total API cost
        - duration_seconds: Generation time
    """
    import subprocess
    import tempfile
    import shutil
    from pathlib import Path

    # Create temporary directory for config files
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        config_dir = temp_path / "config"
        config_dir.mkdir()

        # Write config files
        config_paths = []
        for filename, content in config_files_content.items():
            file_path = config_dir / filename
            file_path.write_text(content)
            config_paths.append(str(file_path))

        # Build command
        cmd = [
            "node",
            "/app/dist/cli.js",
            "quote",
            "--customer", customer_name,
            "--sap-version", sap_version,
            "--config-files", *config_paths,
            "--output", "/output",
            "--fields", *quote_fields,
        ]

        # Add optional parameters
        if custom_fields:
            cmd.extend(["--custom-fields", json.dumps(custom_fields)])

        if special_logic:
            cmd.extend(["--special-logic", special_logic])

        if resume_session_id:
            cmd.extend(["--resume", resume_session_id])
            if fork_session:
                cmd.append("--fork")

        # Run generation
        print(f"Starting SAP endpoint generation for {customer_name}...")
        print(f"Command: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env={
                **os.environ,
                "ANTHROPIC_API_KEY": os.environ["ANTHROPIC_API_KEY"],
            },
        )

        # Parse output for session ID
        session_id = None
        for line in result.stdout.split("\n"):
            if "Session ID:" in line:
                session_id = line.split("Session ID:")[-1].strip()
                break

        # Get generated files
        output_dir = Path(f"/output/{customer_name}")
        generated_files = []
        if output_dir.exists():
            generated_files = [
                str(f.relative_to("/output"))
                for f in output_dir.rglob("*")
                if f.is_file()
            ]

        # Commit volume changes
        volume.commit()

        return {
            "session_id": session_id,
            "output_dir": str(output_dir),
            "files": generated_files,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }


@app.function(
    volumes={"/output": volume},
    timeout=60,
)
def download_generated_code(customer_name: str):
    """
    Download all generated code for a customer as a zip file

    Args:
        customer_name: Customer identifier

    Returns:
        Bytes of zip file containing all generated code
    """
    import zipfile
    import io
    from pathlib import Path

    output_dir = Path(f"/output/{customer_name}")

    if not output_dir.exists():
        raise FileNotFoundError(f"No generated code found for {customer_name}")

    # Create zip file in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in output_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(output_dir)
                zip_file.write(file_path, arcname)

    zip_buffer.seek(0)
    return zip_buffer.read()


@app.function(
    volumes={"/output": volume},
    timeout=60,
)
def list_customers():
    """
    List all customers with generated code

    Returns:
        List of customer names with generation timestamps
    """
    from pathlib import Path
    import os

    output_dir = Path("/output")
    customers = []

    if output_dir.exists():
        for customer_dir in output_dir.iterdir():
            if customer_dir.is_dir():
                stat = os.stat(customer_dir)
                customers.append({
                    "name": customer_dir.name,
                    "modified": stat.st_mtime,
                    "file_count": len(list(customer_dir.rglob("*"))),
                })

    return sorted(customers, key=lambda x: x["modified"], reverse=True)


# Web endpoint for HTTP access
@app.function(
    image=image,
    secrets=secrets,
)
@modal.web_endpoint(method="POST")
def api_generate(item: dict):
    """
    HTTP endpoint for generating SAP code

    POST /api_generate
    Body: {
        "customer_name": "acme",
        "sap_version": "ECC6",
        "config_files": {
            "VBAK_structure.txt": "...",
            "custom_fields.txt": "..."
        },
        "quote_fields": ["customer_id", "quote_date", ...],
        "custom_fields": {"ZZFIELD": "Description"} (optional),
        "special_logic": "..." (optional),
        "resume_session_id": "..." (optional),
        "fork_session": false (optional)
    }
    """
    result = generate_endpoint.remote(
        customer_name=item["customer_name"],
        sap_version=item["sap_version"],
        config_files_content=item["config_files"],
        quote_fields=item["quote_fields"],
        custom_fields=item.get("custom_fields"),
        special_logic=item.get("special_logic"),
        resume_session_id=item.get("resume_session_id"),
        fork_session=item.get("fork_session", False),
    )

    return result


@app.local_entrypoint()
def main(customer: str = "test-customer"):
    """
    Test the deployment locally
    """
    # Example config files
    config_files = {
        "VBAK_structure.txt": """Table: VBAK
Sales Document Header Data

Field       Data Type  Length  Description
MANDT       CLNT       3       Client
VBELN       CHAR       10      Sales Document Number
ERDAT       DATS       8       Date on which record was created
KUNNR       CHAR       10      Sold-to party
WAERK       CUKY       5       SD document currency
NETWR       CURR       15,2    Net Value of the Sales Order
""",
        "custom_fields.txt": """Table: VBAK
Custom Fields

ZZPRIORITY  NUMC       1       Priority Level (1-5)
ZZREFERRAL  CHAR       20      Referral Source
""",
    }

    # Generate code
    result = generate_endpoint.remote(
        customer_name=customer,
        sap_version="ECC6",
        config_files_content=config_files,
        quote_fields=["customer_id", "quote_date", "total_amount"],
        custom_fields={"ZZPRIORITY": "Priority level"},
        special_logic="Apply 10% discount for VIP customers",
    )

    print("\n" + "=" * 70)
    print("GENERATION RESULT")
    print("=" * 70)
    print(f"Session ID: {result['session_id']}")
    print(f"Output Dir: {result['output_dir']}")
    print(f"Files Generated: {len(result['files'])}")
    print(f"Exit Code: {result['exit_code']}")
    print("\nGenerated Files:")
    for file in result['files']:
        print(f"  - {file}")

    if result['exit_code'] != 0:
        print("\nERROR OUTPUT:")
        print(result['stderr'])
