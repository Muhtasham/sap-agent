# Hosting the Agent SDK

> Deploy and host Claude Agent SDK in production environments

The Claude Agent SDK differs from traditional stateless LLM APIs in that it maintains conversational state and executes commands in a persistent environment. This guide covers the architecture, hosting considerations, and best practices for deploying SDK-based agents in production.

## Hosting Requirements

### Container-Based Sandboxing

For security and isolation, the SDK should run inside a **sandboxed container environment**. This provides:

* **Process isolation** - Separate execution environment per session
* **Resource limits** - CPU, memory, and storage constraints
* **Network control** - Restrict outbound connections
* **Ephemeral filesystems** - Clean state for each session

### System Requirements

Each SDK instance requires:

* **Runtime dependencies**
  * Python 3.10+ (for Python SDK) or Node.js 18+ (for TypeScript SDK)
  * Node.js (required by Claude Code CLI)
  * Claude Code CLI: `npm install -g @anthropic-ai/claude-code`

* **Resource allocation**
  * Recommended: 1GiB RAM, 5GiB of disk, and 1 CPU (vary this based on your task as needed)

* **Network access**
  * Outbound HTTPS to `api.anthropic.com`
  * Optional: Access to MCP servers or external tools

## Understanding the SDK Architecture

Unlike stateless API calls, the Claude Agent SDK operates as a **long-running process** that:

* **Executes commands** in a persistent shell environment
* **Manages file operations** within a working directory
* **Handles tool execution** with context from previous interactions

## Sandbox Provider Options

Several providers specialize in secure container environments for AI code execution:

* **[Cloudflare Sandboxes](https://github.com/cloudflare/sandbox-sdk)**
* **[Modal Sandboxes](https://modal.com/docs/guide/sandbox)**
* **[Daytona](https://www.daytona.io/)**
* **[E2B](https://e2b.dev/)**
* **[Fly Machines](https://fly.io/docs/machines/)**
* **[Vercel Sandbox](https://vercel.com/docs/functions/sandbox)**

## Production Deployment Patterns

### Pattern 1: Ephemeral Sessions

Create a new container for each user task, then destroy it when complete.

Best for one-off tasks, the user may still interact with the AI while the task is completing, but once completed the container is destroyed.

**Examples:**

* Bug Investigation & Fix: Debug and resolve a specific issue with relevant context
* Invoice Processing: Extract and structure data from receipts/invoices for accounting systems
* Translation Tasks: Translate documents or content batches between languages
* Image/Video Processing: Apply transformations, optimizations, or extract metadata from media files

### Pattern 2: Long-Running Sessions

Maintain persistent container instances for long running tasks. Often times running *multiple* Claude Agent processes inside of the container based on demand.

Best for proactive agents that take action without the users input, agents that serve content or agents that process high amounts of messages.

**Examples:**

* Email Agent: Monitors incoming emails and autonomously triages, responds, or takes actions based on content
* Site Builder: Hosts custom websites per user with live editing capabilities served through container ports
* High-Frequency Chat Bots: Handles continuous message streams from platforms like Slack where rapid response times are critical

### Pattern 3: Hybrid Sessions

Ephemeral containers that are hydrated with history and state, possibly from a database or from the SDK's session resumption features.

Best for containers with intermittent interaction from the user that kicks off work and spins down when the work is completed but can be continued.

**Examples:**

* Personal Project Manager: Helps manage ongoing projects with intermittent check-ins, maintains context of tasks, decisions, and progress
* Deep Research: Conducts multi-hour research tasks, saves findings and resumes investigation when user returns
* Customer Support Agent: Handles support tickets that span multiple interactions, loads ticket history and customer context

### Pattern 4: Single Containers

Run multiple Claude Agent SDK processes in one global container.

Best for agents that must collaborate closely together. This is likely the least popular pattern because you will have to prevent agents from overwriting each other.

**Examples:**

* **Simulations**: Agents that interact with each other in simulations such as video games.

# FAQ

### How do I communicate with my sandboxes?

When hosting in containers, expose ports to communicate with your SDK instances. Your application can expose HTTP/WebSocket endpoints for external clients while the SDK runs internally within the container.

### What is the cost of hosting a container?

We have found that the dominant cost of serving agents is the tokens, containers vary based on what you provision but a minimum cost is roughly 5 cents per hour running.

### When should I shut down idle containers vs. keeping them warm?

This is likely provider dependent, different sandbox providers will let you set different criteria for idle timeouts after which a sandbox might spin down.
You will want to tune this timeout based on how frequent you think user response might be.

### How often should I update the Claude Code CLI?

The Claude Code CLI is versioned with semver, so any breaking changes will be versioned.

### How do I monitor container health and agent performance?

Since containers are just servers the same logging infrastructure you use for the backend will work for containers.

### How long can an agent session run before timing out?

An agent session will not timeout, but we recommend setting a 'maxTurns' property to prevent Claude from getting stuck in a loop.

## Next Steps

* [Sessions Guide](/en/docs/agent-sdk/sessions) - Learn about session management
* [Permissions](/en/docs/agent-sdk/permissions) - Configure tool permissions
* [Cost Tracking](/en/docs/agent-sdk/cost-tracking) - Monitor API usage
* [MCP Integration](/en/docs/agent-sdk/mcp) - Extend with custom tools

# Modal SDKs for JavaScript and Go

Modal also provides SDKs (currently in beta) that enable using Modal Functions and Sandboxes from JavaScript/TypeScript and Go projects.

While Python is the primary language for building Modal applications and implementing Modal Functions, these SDKs enable use cases like:

- Using Sandboxes in JS/Go projects, to safely execute arbitrary commands, run untrusted user code, or as a safe environment for AI agents.
- Directly calling Modal Functions without having to go through a web endpoint.
- Interacting with Modal resources like Volumes, Secrets, Queues, etc. directly from JS/Go.

We're working towards feature parity with the main Modal Python SDK, although defining Modal Functions will likely remain exclusive to Python.

## Installation

For installation instructions, see the READMEs for [JavaScript](https://github.com/modal-labs/libmodal/tree/main/modal-js) and [Go](https://github.com/modal-labs/libmodal/tree/main/modal-go) on GitHub.

## JavaScript/TypeScript

The `modal` package is [distributed via npm](https://www.npmjs.org/package/modal). See the [JS API reference documentation](https://modal-labs.github.io/libmodal/) for details.

### Simple JavaScript Example

```ts
import { ModalClient } from "modal";

const modal = new ModalClient();

const app = await modal.apps.fromName("libmodal-example", {
  createIfMissing: true,
});

// Create a Sandbox with the specified Image, and mount a Volume
const volume = await modal.volumes.fromName("libmodal-example-volume", {
  createIfMissing: true,
});
const image = modal.images.fromRegistry("alpine:3.21");
const sb = await modal.sandboxes.create(app, image, {
  volumes: { "/mnt/volume": volume },
});
const p = await sb.exec(["cat", "/mnt/volume/message.txt"]);
console.log(`Message: ${await p.stdout.readText()}`);
await sb.terminate();

// Call a previously deployed Modal Function
const echo = await modal.functions.fromName("libmodal-example", "echo");
console.log(await echo.remote(["Hello world!"]));
```

There are [many more examples available on GitHub](https://github.com/modal-labs/libmodal/blob/main/modal-js/README.md#documentation).

## Go

The `modal-go` package is [installed via go get](https://pkg.go.dev/github.com/modal-labs/libmodal/modal-go). See the [Go API reference documentation](https://pkg.go.dev/github.com/modal-labs/libmodal/modal-go#section-documentation) for details.

### Simple Go Example

```go
package main

import (
	"context"
	"fmt"
	"io"

	"github.com/modal-labs/libmodal/modal-go"
)

func main() {
	// Skipping err handling throughout for brevity
	ctx := context.Background()

	mc, _ := modal.NewClient()

	app, _err := mc.Apps.FromName(ctx, "libmodal-example", &modal.AppFromNameParams{CreateIfMissing: true})

	// Create a Sandbox with the specified Image, and mount a Volume
	volume, _ := mc.Volumes.FromName(ctx, "libmodal-example-volume", &modal.VolumeFromNameParams{CreateIfMissing: true})
	image := mc.Images.FromRegistry("alpine:3.21", nil)
	sb, _ := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
		Volumes: map[string]*modal.Volume{"/mnt/volume": volume},
	})
	defer sb.Terminate(context.Background())
	p, _ := sb.Exec(ctx, []string{"cat", "/mnt/volume/message.txt"}, nil)
	stdout, _ := io.ReadAll(p.Stdout)
	fmt.Printf("Message: %s\n", stdout)

	// Call a previously deployed Modal Function
	echo, _ := mc.Functions.FromName(ctx, "libmodal-example", "echo", nil)
	result, _ := echo.Remote(ctx, []any{"Hello world!"}, nil)
	fmt.Println(result)
}
```

There are [many more examples available on GitHub](https://github.com/modal-labs/libmodal/blob/main/modal-go/README.md#documentation).

## Support

The JS and Go Modal SDKs are in active development, and we love to hear your feedback. If you have questions or suggestions, please reach out on the [Modal Community Slack](https://modal.com/slack).

# Sandboxes

In addition to the Function interface, Modal has a direct
interface for defining containers _at runtime_ and securely running arbitrary code
inside them.

This can be useful if, for example, you want to:

- Execute code generated by a language model.
- Create isolated environments for running untrusted code.
- Check out a git repository and run a command against it, like a test suite, or
  `npm lint`.
- Run containers with arbitrary dependencies and setup scripts.

Each individual job is called a **Sandbox** and can be created using the
[`Sandbox.create`](/docs/reference/modal.Sandbox#create) constructor:

<CodeTabs>
  {#snippet python()}

```python notest
import modal

app = modal.App.lookup("my-app", create_if_missing=True)

sb = modal.Sandbox.create(app=app)

p = sb.exec("python", "-c", "print('hello')", timeout=3)
print(p.stdout.read())

p = sb.exec("bash", "-c", "for i in {1..10}; do date +%T; sleep 0.5; done", timeout=5)
for line in p.stdout:
    # Avoid double newlines by using end="".
    print(line, end="")

sb.terminate()
```

{/snippet}

{#snippet javascript()}

```javascript notest
import { ModalClient } from "modal";

const modal = new ModalClient();
const app = await modal.apps.fromName("my-app", {
  createIfMissing: true,
});
const image = modal.images.fromRegistry("python:3.13-slim");

const sb = await modal.sandboxes.create(app, image);

const p = await sb.exec(["python", "-c", "print('hello')"], {
  timeout: 3 * 1000,
});
console.log(await p.stdout.readText());

const p2 = await sb.exec(
  ["bash", "-c", "for i in {1..10}; do date +%T; sleep 0.5; done"],
  { timeout: 5 * 1000 },
);
for await (const line of p2.stdout) {
  process.stdout.write(line);
}

await sb.terminate();
```

{/snippet}

{#snippet go()}

```go notest
package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/modal-labs/libmodal/modal-go"
)

func main() {
	ctx := context.Background()
	mc, _ := modal.NewClient()

	app, _ := mc.Apps.FromName(ctx, "my-app", &modal.AppFromNameParams{
		CreateIfMissing: true,
	})
	image := mc.Images.FromRegistry("python:3.13-slim", nil)

	sb, _ := mc.Sandboxes.Create(ctx, app, image, nil)
	defer sb.Terminate(context.Background())

	p, _ := sb.Exec(ctx, []string{"python", "-c", "print('hello')"}, &modal.SandboxExecParams{
		Timeout: 3 * time.Second,
	})
	stdout, _ := io.ReadAll(p.Stdout)
	fmt.Println(string(stdout))

	p2, _ := sb.Exec(ctx, []string{"bash", "-c", "for i in {1..10}; do date +%T; sleep 0.5; done"}, &modal.SandboxExecParams{
		Timeout: 5 * time.Second,
	})
	io.Copy(os.Stdout, p2.Stdout)
}
```

{/snippet}
</CodeTabs>

**Note:** you can run the above example as a script directly with `python my_script.py`. `modal run` is not needed here since there is no [entrypoint](/docs/guide/apps#entrypoints-for-ephemeral-apps).

Sandboxes require an [`App`](/docs/guide/apps) to be passed when spawned from outside
of a Modal container. You may pass in a regular `App` object or look one up by name with
[`App.lookup`](/docs/reference/modal.App#lookup). The `create_if_missing` flag on `App.lookup`
will create an `App` with the given name if it doesn't exist.

## Lifecycle

### Timeouts

Sandboxes have a default maximum lifetime of 5 minutes. You can change this by passing
a `timeout` of up to 24 hours to the `Sandbox.create(...)` function.

<CodeTabs>
  {#snippet python()}

```python notest
sb = modal.Sandbox.create(app=my_app, timeout=10*60)  # 10 minutes
```

{/snippet}

{#snippet javascript()}

```javascript notest
const sb = await modal.sandboxes.create(app, image, {
  timeout: 10 * 60 * 1000, // 10 minutes
});
```

{/snippet}

{#snippet go()}

```go notest
sb, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
	Timeout: 10 * time.Minute,
})
```

{/snippet}
</CodeTabs>

If you need a Sandbox to run for more than 24 hours, we recommend using
[Filesystem Snapshots](/docs/guide/sandbox-snapshots) to preserve its state,
and then restore from that snapshot with a subsequent Sandbox.

### Idle Timeouts

Sandboxes can also be automatically terminated after a period of inactivity - you can do this by setting the `idle_timeout` parameter. A Sandbox is considered active if any of the following are true:

1. It has an active [command](/docs/guide/sandbox-spawn) running (via [`sb.exec(...)`](/docs/reference/modal.Sandbox#exec))
2. Its stdin is being written to (via [`sb.stdin.write()`](/docs/reference/modal.Sandbox#stdin))
3. It has an open TCP connection over one of its [Tunnels](/docs/guide/tunnels)

## Configuration

Sandboxes support nearly all configuration options found in regular `modal.Function`s.
Refer to [`Sandbox.create`](/docs/reference/modal.Sandbox#create) for further documentation
on Sandbox configs.

For example, Images and Volumes can be used just as with functions:

<CodeTabs>
  {#snippet python()}

```python notest
sb = modal.Sandbox.create(
    image=modal.Image.debian_slim().pip_install("pandas"),
    volumes={"/data": modal.Volume.from_name("my-volume")},
    workdir="/repo",
    app=my_app,
)
```

{/snippet}

{#snippet javascript()}

```javascript notest
const image = modal.images.fromRegistry("python:3.13-slim");
const volume = modal.volumes.fromName("my-volume");
const sb = await modal.sandboxes.create(app, image, {
  volumes: { "/data": volume },
  workdir: "/repo",
});
```

{/snippet}

{#snippet go()}

```go notest
image := mc.Images.FromRegistry("python:3.13-slim", nil)
volume := mc.Volumes.FromName("my-volume", nil)
sb, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Volumes: map[string]*modal.Volume{"/data": volume},
  Workdir: "/repo",
})
```

{/snippet}
</CodeTabs>

## Environments

### Environment variables

You can set environment variables using inline secrets:

<CodeTabs>
  {#snippet python()}

```python notest
secret = modal.Secret.from_dict({"MY_SECRET": "hello"})

sb = modal.Sandbox.create(
    secrets=[secret],
    app=my_app,
)
p = sb.exec("bash", "-c", "echo $MY_SECRET")
print(p.stdout.read())
```

{/snippet}

{#snippet javascript()}

```javascript notest
const secret = modal.secrets.fromObject({ MY_SECRET: "hello" });
const image = modal.images.fromRegistry("python:3.13-slim");

const sb = await modal.sandboxes.create(app, image, {
  secrets: [secret],
});
const p = await sb.exec(["bash", "-c", "echo $MY_SECRET"]);
console.log(await p.stdout.readText());
```

{/snippet}

{#snippet go()}

```go notest
secret, err := mc.Secrets.FromMap(ctx, map[string]string{"MY_SECRET": "hello"}, nil)
image := mc.Images.FromRegistry("python:3.13-slim", nil)

sb, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Secrets: []*modal.Secret{secret},
})
p, err := sb.Exec(ctx, []string{"bash", "-c", "echo $MY_SECRET"}, nil)
stdout, err := io.ReadAll(p.Stdout)
fmt.Println(string(stdout))
```

{/snippet}
</CodeTabs>

### Custom Images

Sandboxes support custom images just as Functions do. However, while you'll typically
invoke a Modal Function with the `modal run` cli, you typically spawn a Sandbox
with a simple script call. As such, you may need to manually enable output streaming
to see your image build logs:

<CodeTabs>
  {#snippet python()}

```python notest
image = modal.Image.debian_slim().pip_install("pandas", "numpy")

with modal.enable_output():
    sb = modal.Sandbox.create(image=image, app=my_app)
```

{/snippet}

{#snippet javascript()}

```javascript notest
const image = modal.images
  .fromRegistry("python:3.13-slim")
  .dockerfileCommands(["RUN pip install pandas numpy"]);

const sb = await modal.sandboxes.create(app, image);
```

{/snippet}

{#snippet go()}

```go notest
image := mc.Images.FromRegistry("python:3.13-slim", nil).
  DockerfileCommands([]string{"RUN pip install pandas numpy"}, nil)

// Note: Image build logs are automatically streamed in Go
sb, err := mc.Sandboxes.Create(ctx, app, image, nil)
```

{/snippet}
</CodeTabs>

### Dynamically defined environments

Note that any valid `Image` or `Mount` can be used with a Sandbox, even if those
images or mounts have not previously been defined. This also means that Images and
Mounts can be built from requirements at **runtime**. For example, you could
use a language model to write some code and define your image, and then spawn a
Sandbox with it. Check out [devlooper](https://github.com/modal-labs/devlooper)
for a concrete example of this.

## Running a Sandbox with an entrypoint

In most cases, Sandboxes are treated as a generic container that can run arbitrary
commands. However, in some cases, you may want to run a single command or script
as the entrypoint of the Sandbox. You can do this by passing command arguments to the
Sandbox constructor:

<CodeTabs>
  {#snippet python()}

```python notest
sb = modal.Sandbox.create("python", "-m", "http.server", "8080", app=my_app, timeout=10)
for line in sb.stdout:
    print(line, end="")
```

{/snippet}

{#snippet javascript()}

```javascript notest
const sb = await modal.sandboxes.create(app, image, {
  entrypoint: ["python", "-m", "http.server", "8080"],
  timeout: 10 * 1000,
});
```

{/snippet}

{#snippet go()}

```go notest
sb, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Entrypoint: []string{"python", "-m", "http.server", "8080"},
  Timeout:    10 * time.Second,
})
```

{/snippet}
</CodeTabs>

This functionality is most useful for running long-lived services that you want
to keep running in the background. See our [Jupyter notebook example](/docs/examples/jupyter_sandbox)
for a more concrete example of this.

## Referencing Sandboxes from other code

If you have a running Sandbox, you can retrieve it using the `from_id` method.

<CodeTabs>
  {#snippet python()}

```python notest
sb = modal.Sandbox.create(app=my_app)
sb_id = sb.object_id

# ... later in the program ...

sb2 = modal.Sandbox.from_id(sb_id)

p = sb2.exec("echo", "hello")
print(p.stdout.read())
sb2.terminate()
```

{/snippet}

{#snippet javascript()}

```javascript notest
const sb = await modal.sandboxes.create(app, image);
const sbId = sb.sandboxId;

// ... later in the program ...

const sb2 = await modal.sandboxes.fromId(sbId);

const p = await sb2.exec(["echo", "hello"]);
console.log(await p.stdout.readText());
await sb2.terminate();
```

{/snippet}

{#snippet go()}

```go notest
sb, err := mc.Sandboxes.Create(ctx, app, image, nil)
sbId := sb.SandboxID

// ... later in the program ...

sb2, err := mc.Sandboxes.FromID(ctx, sbId)

p, err := sb2.Exec(ctx, []string{"echo", "hello"}, nil)
stdout, err := io.ReadAll(p.Stdout)
fmt.Println(string(stdout))
sb2.Terminate(ctx)
```

{/snippet}
</CodeTabs>

A common use case for this is keeping a pool of Sandboxes available for executing tasks
as they come in. You can keep a list of `object_id`s of Sandboxes that are "open" and
reuse them, closing over the `object_id` in whatever function is using them.

## Logging

You can see Sandbox execution logs using the `verbose` option. For example:

<CodeTabs>
  {#snippet python()}

```python notest
sb = modal.Sandbox.create(app=my_app, verbose=True)

p = sb.exec("python", "-c", "print('hello')")
print(p.stdout.read())

with sb.open("test.txt", "w") as f:
    f.write("Hello World\n")
```

{/snippet}

{#snippet javascript()}

```javascript notest
const sb = await modal.sandboxes.create(app, image, { verbose: true });
```

{/snippet}

{#snippet go()}

```go notest
sb, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Verbose: true,
})
```

{/snippet}
</CodeTabs>

shows Sandbox logs:

```
Sandbox exec started: python -c print('hello')
Opened file 'test.txt': fd-yErSQzGL9sig6WAjyNgTPR
Wrote to file: fd-yErSQzGL9sig6WAjyNgTPR
Closed file: fd-yErSQzGL9sig6WAjyNgTPR
```

## Named Sandboxes

You can assign a name to a Sandbox when creating it. Each name must be unique within an app -
only one _running_ Sandbox can use a given name at a time. Note that the associated app must be
a deployed app. Once a Sandbox completely stops running, its name becomes available for reuse.
Some applications find Sandbox Names to be useful for ensuring that no more than one Sandbox is
running per resource or project. If a Sandbox with the given name is already running, `create()`
will raise an error.

<CodeTabs>
  {#snippet python()}

```python notest
sb1 = modal.Sandbox.create(app=my_app, name="my-name")
# This will raise a modal.exception.AlreadyExistsError.
sb2 = modal.Sandbox.create(app=my_app, name="my-name")
```

{/snippet}

{#snippet javascript()}

```javascript notest
const sb1 = await modal.sandboxes.create(app, image, { name: "my-name" });
// this will raise an AlreadyExistsError
const sb2 = await modal.sandboxes.create(app, image, { name: "my-name" });
```

{/snippet}

{#snippet go()}

```go notest
sb1, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Name: "my-name",
})
// this will return an error
sb2, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Name: "my-name",
})
```

{/snippet}
</CodeTabs>

A named Sandbox may be fetched from a deployed app using `from_name()` _but only
if the Sandbox is currently running_. If no running Sandbox is found, `from_name()` will raise
an error.

<CodeTabs>
  {#snippet python()}

```python notest
my_app = modal.App.lookup("my-app", create_if_missing=True)
sb1 = modal.Sandbox.create(app=my_app, name="my-name")
# Returns the currently running Sandbox with the name "my-name" from the
# deployed app named "my-app".
sb2 = modal.Sandbox.from_name("my-app", "my-name")
assert sb1.object_id == sb2.object_id # sb1 and sb2 refer to the same Sandbox
```

{/snippet}

{#snippet javascript()}

```javascript notest
const app = await modal.apps.fromName("my-app", { createIfMissing: true });
const sb1 = await modal.sandboxes.create(app, image, { name: "my-name" });
// returns the currently running Sandbox with the name "my-name" from the
// deployed app named "my-app".
const sb2 = await modal.sandboxes.fromName("my-app", "my-name");
console.assert(sb1.sandboxId === sb2.sandboxId); // sb1 and sb2 refer to the same Sandbox
```

{/snippet}

{#snippet go()}

```go notest
app, err := mc.Apps.FromName(ctx, "my-app", &modal.AppFromNameParams{
  CreateIfMissing: true,
})
sb1, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Name: "my-name",
})
// returns the currently running Sandbox with the name "my-name" from the
// deployed app named "my-app".
sb2, err := mc.Sandboxes.FromName(ctx, "my-app", "my-name", nil)
// sb1 and sb2 refer to the same Sandbox
fmt.Println(sb1.SandboxID == sb2.SandboxID)
```

{/snippet}
</CodeTabs>

Sandbox Names may contain only alphanumeric characters, dashes, periods, and underscores, and must
be shorter than 64 characters.

## Tagging

Sandboxes can also be tagged with arbitrary key-value pairs. These tags can be used
to filter results in `Sandbox.list`.

<CodeTabs>
  {#snippet python()}

```python notest
sandbox_v1_1 = modal.Sandbox.create("sleep", "10", app=my_app)
sandbox_v1_2 = modal.Sandbox.create("sleep", "20", app=my_app)

sandbox_v1_1.set_tags({"major_version": "1", "minor_version": "1"})
sandbox_v1_2.set_tags({"major_version": "1", "minor_version": "2"})

for sandbox in modal.Sandbox.list(app_id=my_app.app_id):  # All sandboxes.
    print(sandbox.object_id)

for sandbox in modal.Sandbox.list(
    app_id=my_app.app_id,
    tags={"major_version": "1"},
):  # Also all sandboxes.
    print(sandbox.object_id)

for sandbox in modal.Sandbox.list(
    app_id=app.app_id,
    tags={"major_version": "1", "minor_version": "2"},
):  # Just the latest sandbox.
    print(sandbox.object_id)
```

{/snippet}

{#snippet javascript()}

```javascript notest
const sandboxV1_1 = await modal.sandboxes.create(app, image, {
  command: ["sleep", "10"],
});
const sandboxV1_2 = await modal.sandboxes.create(app, image, {
  command: ["sleep", "20"],
});

await sandboxV1_1.setTags({ major_version: "1", minor_version: "1" });
await sandboxV1_2.setTags({ major_version: "1", minor_version: "2" });

// All sandboxes.
for await (const sandbox of modal.sandboxes.list({ appId: app.appId })) {
  console.log(sandbox.sandboxId);
}

// Also all sandboxes.
for await (const sandbox of modal.sandboxes.list({
  appId: app.appId,
  tags: { major_version: "1" },
})) {
  console.log(sandbox.sandboxId);
}

// Just the latest sandbox.
for await (const sandbox of modal.sandboxes.list({
  appId: app.appId,
  tags: { major_version: "1", minor_version: "2" },
})) {
  console.log(sandbox.sandboxId);
}
```

{/snippet}

{#snippet go()}

```go notest
sandboxV1_1, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Command: []string{"sleep", "10"},
})
sandboxV1_2, err := mc.Sandboxes.Create(ctx, app, image, &modal.SandboxCreateParams{
  Command: []string{"sleep", "20"},
})

sandboxV1_1.SetTags(ctx, map[string]string{"major_version": "1", "minor_version": "1"})
sandboxV1_2.SetTags(ctx, map[string]string{"major_version": "1", "minor_version": "2"})

// All sandboxes.
it, _ := mc.Sandboxes.List(ctx, &modal.SandboxListParams{
  AppID: app.AppID,
})
for sandbox := range it {
  fmt.Println(sandbox.SandboxID)
}

// Also all sandboxes.
it, _ = mc.Sandboxes.List(ctx, &modal.SandboxListParams{
  AppID: app.AppID,
  Tags:  map[string]string{"major_version": "1"},
})
for sandbox := range it {
  fmt.Println(sandbox.SandboxID)
}

// Just the latest sandbox.
it, _ = mc.Sandboxes.List(ctx, &modal.SandboxListParams{
  AppID: app.AppID,
  Tags:  map[string]string{"major_version": "1", "minor_version": "2"},
})
for sandbox := range it {
  fmt.Println(sandbox.SandboxID)
}
```

{/snippet}
</CodeTabs>

# Running commands in Sandboxes

Once you have created a Sandbox, you can run commands inside it using the
[`Sandbox.exec`](/docs/reference/modal.Sandbox#exec) method.

```python notest
sb = modal.Sandbox.create(app=my_app)

process = sb.exec("echo", "hello", timeout=3)
print(process.stdout.read())

process = sb.exec("python", "-c", "print(1 + 1)", timeout=3)
print(process.stdout.read())

process = sb.exec(
    "bash",
    "-c",
    "for i in $(seq 1 10); do echo foo $i; sleep 0.1; done",
    timeout=5,
)
for line in process.stdout:
    print(line, end="")

sb.terminate()
```

`Sandbox.exec` returns a [`ContainerProcess`](/docs/reference/modal.container_process#modalcontainer_processcontainerprocess)
object, which allows access to the process's `stdout`, `stderr`, and `stdin`.
The `timeout` parameter ensures that the `exec` command will run for at most
`timeout` seconds.

## Input

The Sandbox and ContainerProcess `stdin` handles are [`StreamWriter`](/docs/reference/modal.io_streams#modalio_streamsstreamwriter)
objects. This object supports flushing writes with both synchronous and asynchronous APIs:

```python notest
import asyncio

sb = modal.Sandbox.create(app=my_app)

p = sb.exec("bash", "-c", "while read line; do echo $line; done")
p.stdin.write(b"foo bar\n")
p.stdin.write_eof()
p.stdin.drain()
p.wait()
sb.terminate()

async def run_async():
    sb = await modal.Sandbox.create.aio(app=my_app)
    p = await sb.exec.aio("bash", "-c", "while read line; do echo $line; done")
    p.stdin.write(b"foo bar\n")
    p.stdin.write_eof()
    await p.stdin.drain.aio()
    await p.wait.aio()
    await sb.terminate.aio()

asyncio.run(run_async())
```

## Output

The Sandbox and ContainerProcess `stdout` and `stderr` handles are [`StreamReader`](/docs/reference/modal.io_streams#modalio_streamsstreamreader)
objects. These objects support reading from the stream in both synchronous and asynchronous manners.
These handles also respect the timeout given to `Sandbox.exec`.

To read from a stream after the underlying process has finished, you can use the `read`
method, which blocks until the process finishes and returns the entire output stream.

```python notest
sb = modal.Sandbox.create(app=my_app)
p = sb.exec("echo", "hello")
print(p.stdout.read())
sb.terminate()
```

To stream output, take advantage of the fact that `stdout` and `stderr` are
iterable:

```python notest
import asyncio

sb = modal.Sandbox.create(app=my_app)

p = sb.exec("bash", "-c", "for i in $(seq 1 10); do echo foo $i; sleep 0.1; done")

for line in p.stdout:
    # Lines preserve the trailing newline character, so use end="" to avoid double newlines.
    print(line, end="")
p.wait()
sb.terminate()

async def run_async():
    sb = await modal.Sandbox.create.aio(app=my_app)
    p = await sb.exec.aio("bash", "-c", "for i in $(seq 1 10); do echo foo $i; sleep 0.1; done")
    async for line in p.stdout:
        # Avoid double newlines by using end="".
        print(line, end="")
    await p.wait.aio()
    await sb.terminate.aio()

asyncio.run(run_async())
```

### Stream types

By default, all streams are buffered in memory, waiting to be consumed by the
client. You can control this behavior with the `stdout` and `stderr` parameters.
These parameters are conceptually similar to the `stdout` and `stderr`
parameters of the [`subprocess`](https://docs.python.org/3/library/subprocess.html#subprocess.DEVNULL) module.

```python notest
from modal.stream_type import StreamType

sb = modal.Sandbox.create(app=my_app)

# Default behavior: buffered in memory.
p = sb.exec(
    "bash",
    "-c",
    "echo foo; echo bar >&2",
    stdout=StreamType.PIPE,
    stderr=StreamType.PIPE,
)
print(p.stdout.read())
print(p.stderr.read())

# Print the stream to STDOUT as it comes in.
p = sb.exec(
    "bash",
    "-c",
    "echo foo; echo bar >&2",
    stdout=StreamType.STDOUT,
    stderr=StreamType.STDOUT,
)
p.wait()

# Discard all output.
p = sb.exec(
    "bash",
    "-c",
    "echo foo; echo bar >&2",
    stdout=StreamType.DEVNULL,
    stderr=StreamType.DEVNULL,
)
p.wait()

sb.terminate()
```

# Networking and security

Sandboxes are built to be secure-by-default, meaning that a default Sandbox has
no ability to accept incoming network connections or access your Modal resources.

## Networking

Since Sandboxes may run untrusted code, they have options to restrict their network access.
To block all network access, set `block_network=True` on [`Sandbox.create`](/docs/reference/modal.Sandbox#create).

For more fine-grained networking control, a Sandbox's outbound network access
can be restricted using the `cidr_allowlist` parameter. This parameter takes a
list of CIDR ranges that the Sandbox is allowed to access, blocking all other
outbound traffic.

### Connecting to Sandboxes with HTTP and WebSockets

You can make authenticated HTTP and WebSocket requests to a Sandbox by generating
Sandbox Connect Tokens. They work like this:

```python notest
# Start a Sandbox with a server running on port 8080.
sb = modal.Sandbox.create(
    "bash", "-c", "python3 -m http.server 8080",
    app=my_app,
)

# Create a connect token, optionally including arbitrary user metadata.
creds = sb.create_connect_token(user_metadata={"user_id": "foo"})

# Make an HTTP request, passing the token in the Authorization header.
requests.get(creds.url, headers={"Authorization": f"Bearer {creds.token}"})

# You can also put the token in a `_modal_connect_token` query param.
url = f"{creds.url}/?_modal_connect_token={creds.token}"
ws_url = url.replace("https://", "wss://")
with websockets.connect(ws_url) as socket:
    socket.send("Hello world!")
```

The server running on port 8080 in the container will receive an authenticated
request with an unspoofable `X-Verified-User-Data` header whose value is the
JSON-serialized Python dict that was passed as `user_metadata` to the
`create_connect_token()` function. This can be used by the application to
determine access control, for example.

There are a few things to remember with Sandbox Connect Tokens:

1. The server inside the container must be listening on port 8080.
2. The token may be sent in an `Authorization` header, in a `_modal_connect_token`
   query param, or in a `_modal_connect_token` cookie.
3. If `_modal_connect_token` is set as a query param, the resulting response will
   include a `Set-Cookie` header that sets it as a cookie.
4. The `user_metadata` must be JSON-serializable and must be less than 512
   characters after serialization.

### Forwarding ports

While it is recommended to use [Sandbox Connect Tokens](#connecting-to-sandboxes-with-http-and-websockets)
for HTTP requests and WebSocket connections to the container, you can also expose
raw TCP ports to the internet. This is useful if, for example, you want to run a
server inside the Sandbox that expects a raw TCP connection and handles
authentication itself.

Use the `encrypted_ports` and `unencrypted_ports` parameters of `Sandbox.create`
to specify which ports to forward. You can then access the public URL of a tunnel
using the [`Sandbox.tunnels`](/docs/reference/modal.Sandbox#tunnels) method:

```python notest
import requests
import time

sb = modal.Sandbox.create(
    "python",
    "-m",
    "http.server",
    "12345",
    encrypted_ports=[12345],
    app=my_app,
)

tunnel = sb.tunnels()[12345]

time.sleep(1)  # Wait for server to start.

print(f"Connecting to {tunnel.url}...")
print(requests.get(tunnel.url, timeout=5).text)
```

It is also possible to create an encrypted port that uses `HTTP/2` rather than `HTTP/1.1` with the `h2_ports` option. This will return
a URL that you can make H2 (HTTP/2 + TLS) requests to. If you want to run an `HTTP/2` server inside a sandbox, this feature may be useful.
Here is an example:

```python notest
import time

port = 4359
sb = modal.Sandbox.create(
    app=my_app,
    image=my_image,
    h2_ports = [port],
)
p = sb.exec("python", "my_http2_server.py")

tunnel = sb.tunnels()[port]
time.sleep(1)
print(f"Tunnel URL: {tunnel.url}")
```

For more details on how tunnels work, see the [tunnels guide](/docs/guide/tunnels).

## Security model

In a typical Modal Function, the Function code can call other Modal APIs allowing
it to spawn containers, create and destroy Volumes, read from Dicts and Queues, etc.
Sandboxes, by contrast, are isolated from the main Modal workspace. They have no API
access, meaning the blast radius of any malicious code is limited to the Sandbox
environment.

Sandboxes are built on top of [gVisor](https://gvisor.dev/), a container runtime
by Google that provides strong isolation properties. gVisor has custom logic to
prevent Sandboxes from making malicious system calls, giving you stronger isolation
than standard [runc](https://github.com/opencontainers/runc) containers.

# Filesystem Access

There are multiple options for uploading files to a Sandbox and accessing them
from outside the Sandbox.

## Efficient file syncing

To efficiently upload local files to a Sandbox, you can use the
[`add_local_file`](/docs/reference/modal.Image#add_local_file) and
[`add_local_dir`](/docs/reference/modal.Image#add_local_dir) methods on the
[`Image`](/docs/reference/modal.Image) class:

```python notest
sb = modal.Sandbox.create(
    app=my_app,
    image=modal.Image.debian_slim().add_local_dir(
        local_path="/home/user/my_dir",
        remote_path="/app"
    )
)
p = sb.exec("ls", "/app")
print(p.stdout.read())
p.wait()
```

Alternatively, it's possible to use Modal [Volume](/docs/reference/modal.Volume)s or
[CloudBucketMount](/docs/guide/cloud-bucket-mounts)s. These have the benefit that
files created from inside the Sandbox can easily be accessed outside the
Sandbox.

To efficiently upload files to a Sandbox using a Volume, you can use the
[`batch_upload`](/docs/reference/modal.Volume#batch_upload) method on the
`Volume` class - for instance, using an ephemeral Volume that
will be garbage collected when the App finishes:

```python notest
with modal.Volume.ephemeral() as vol:
    import io
    with vol.batch_upload() as batch:
        batch.put_file("local-path.txt", "/remote-path.txt")
        batch.put_directory("/local/directory/", "/remote/directory")
        batch.put_file(io.BytesIO(b"some data"), "/foobar")

    sb = modal.Sandbox.create(
        volumes={"/cache": vol},
        app=my_app,
    )
    p = sb.exec("cat", "/cache/remote-path.txt")
    print(p.stdout.read())
    p.wait()
    sb.terminate()
```

The caller also can access files created in the Volume from the Sandbox, even after the Sandbox is terminated:

```python notest
with modal.Volume.ephemeral() as vol:
    sb = modal.Sandbox.create(
        volumes={"/cache": vol},
        app=my_app,
    )
    p = sb.exec("bash", "-c", "echo foo > /cache/a.txt")
    p.wait()
    sb.terminate()
    sb.wait(raise_on_termination=False)
    for data in vol.read_file("a.txt"):
        print(data)
```

Alternatively, if you want to persist files between Sandbox invocations (useful
if you're building a stateful code interpreter, for example), you can use create
a persisted `Volume` with a dynamically assigned label:

```python notest
session_id = "example-session-id-123abc"
vol = modal.Volume.from_name(f"vol-{session_id}", create_if_missing=True)
sb = modal.Sandbox.create(
    volumes={"/cache": vol},
    app=my_app,
)
p = sb.exec("bash", "-c", "echo foo > /cache/a.txt")
p.wait()
sb.terminate()
sb.wait(raise_on_termination=False)
for data in vol.read_file("a.txt"):
    print(data)
```

File syncing behavior differs between Volumes and CloudBucketMounts. For
Volumes, files are only synced back to the Volume when the Sandbox terminates.
For CloudBucketMounts, files are synced automatically.

## Filesystem API (Alpha)

If you're less concerned with efficiency of uploads and want a convenient way
to pass data in and out of the Sandbox during execution, you can use our
filesystem API to easily read and write files. The API supports reading
files up to 100 MiB and writes up to 1 GiB in size.

This API is currently in Alpha, and we don't recommend using it for production
workloads.

```python
import modal

app = modal.App.lookup("sandbox-fs-demo", create_if_missing=True)

sb = modal.Sandbox.create(app=app)

with sb.open("test.txt", "w") as f:
    f.write("Hello World\n")

f = sb.open("test.txt", "rb")
print(f.read())
f.close()
```

The filesystem API is similar to Python's built-in [io.FileIO](https://docs.python.org/3/library/io.html#io.FileIO) and supports many of the same methods, including `read`, `readline`, `readlines`, `write`, `flush`, `seek`, and `close`.

We also provide the special methods `replace_bytes` and `delete_bytes`, which may be useful for LLM-generated code.

```python notest
from modal.file_io import delete_bytes, replace_bytes

with sb.open("example.txt", "w") as f:
    f.write("The quick brown fox jumps over the lazy dog")

with sb.open("example.txt", "r+") as f:
    # The quick brown fox jumps over the lazy dog
    print(f.read())

    # The slow brown fox jumps over the lazy dog
    replace_bytes(f, b"slow", start=4, end=9)

    # The slow red fox jumps over the lazy dog
    replace_bytes(f, b"red", start=9, end=14)

    # The slow red fox jumps over the dog
    delete_bytes(f, start=32, end=37)

    f.seek(0)
    print(f.read())

sb.terminate()
```

We additionally provide commands [`mkdir`](/docs/reference/modal.Sandbox#mkdir), [`rm`](/docs/reference/modal.Sandbox#rm), and [`ls`](/docs/reference/modal.Sandbox#ls) to make interacting with the filesystem more ergonomic.

<!-- TODO(WRK-956) -->
<!-- ## File Watching

You can watch files or directories for changes using [`watch`](/docs/reference/modal.Sandbox#watch), which is conceptually similar to [`fsnotify`](https://pkg.go.dev/github.com/fsnotify/fsnotify).

```python notest
from modal.file_io import FileWatchEventType

async def watch(sb: modal.Sandbox):
    event_stream = sb.watch.aio(
        "/watch",
        recursive=True,
        filter=[FileWatchEventType.Create, FileWatchEventType.Modify],
    )
    async for event in event_stream:
        print(event)

async def main():
    app = modal.App.lookup("sandbox-file-watch", create_if_missing=True)
    sb = await modal.Sandbox.create.aio(app=app)
    asyncio.create_task(watch(sb))

    await sb.mkdir.aio("/watch")
    for i in range(10):
        async with await sb.open.aio(f"/watch/bar-{i}.txt", "w") as f:
            await f.write.aio(f"hello-{i}")
``` -->

# Snapshots

Sandboxes support snapshotting, allowing you to save your Sandbox's state
and restore it later. This is useful for:

- Creating custom environments for your Sandboxes to run in
- Backing up your Sandbox's state for debugging
- Running large-scale experiments with the same initial state
- Branching your Sandbox's state to test different code changes independently

## Filesystem Snapshots

Filesystem Snapshots are copies of the Sandbox's filesystem at a given point in time.
These Snapshots are [Images](/docs/reference/modal.Image) and can be used to create
new Sandboxes.

To create a Filesystem Snapshot, you can use the
[`Sandbox.snapshot_filesystem()`](/docs/reference/modal.Sandbox#snapshot_filesystem) method:

```python notest
import modal

app = modal.App.lookup("sandbox-fs-snapshot-test", create_if_missing=True)

sb = modal.Sandbox.create(app=app)
p = sb.exec("bash", "-c", "echo 'test' > /test")
p.wait()
assert p.returncode == 0, "failed to write to file"
image = sb.snapshot_filesystem()
sb.terminate()

sb2 = modal.Sandbox.create(image=image, app=app)
p2 = sb2.exec("bash", "-c", "cat /test")
assert p2.stdout.read().strip() == "test"
sb2.terminate()
```

Filesystem Snapshots are optimized for performance: they are calculated as the difference
from your base image, so only modified files are stored. Restoring a Filesystem Snapshot
utilizes the same infrastructure we use to get fast cold starts for your Sandboxes.

Filesystem Snapshots will generally persist indefinitely.

## Memory Snapshots

[Sandboxes memory snapshots](/docs/guide/sandbox-memory-snapshots) are in early preview.
Contact us if this is something you're interested in!
