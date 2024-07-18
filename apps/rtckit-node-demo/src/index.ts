import {
  ApiKey,
  type AuthKey,
  GcoreApi,
  parseAuth,
} from "@gcorevideo/rtckit-node";

async function main() {
  const config = configure();
  const command = parseCommand();
  const api = new GcoreApi(config.auth);
  command.execute(api);
}

function parseCommand() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    throw new Error(
      "No command provided",
    );
  }
  const cmd = args[0];
  switch (cmd) {
    case "create":
    case "c":
      return parseCreateCommand(
        args.slice(1),
      );
    case "delete":
    case "d":
      return parseDeleteCommand(
        args.slice(1),
      );
    default:
      throw new Error(
        `Unknown command: ${cmd}`,
      );
  }
}

function parseDeleteCommand(
  args: string[],
) {
  if (!args.length) {
    throw new Error(
      "Delete command requires a stream ID argument",
    );
  }
  const id = parseInt(args[0].replace(/^#/, ""));
  if (!id) {
    throw new Error(
      "Invalid stream ID, an integer is expected",
    );
  }
  return new DeleteCommand(id);
}

function parseCreateCommand(
  args: string[],
) {
  const name = args.join(" ").trim();
  if (name.length === 0) {
    throw new Error(
      "Create command requires a stream name argument",
    );
  }
  return new CreateCommand(name);
}

interface ApiCommand {
  execute(api: GcoreApi): Promise<void>;
}

class DeleteCommand
  implements ApiCommand
{
  constructor(private id: number) {}

  async execute(api: GcoreApi) {
    await api.webrtc.deleteStream(
      this.id,
    );
    console.log(
      `Stream #${this.id} deleted`,
    );
  }
}

class CreateCommand
  implements ApiCommand
{
  constructor(private name: string) {}

  async execute(api: GcoreApi) {
    const stream =
      await api.webrtc.createStream(
        this.name,
      );
    console.log(
      `Stream #${stream.id} created:
  WHIP endpoint: ${stream.whipEndpoint}
  WHEP endpoint: ${stream.whepEndpoint}`,
    );
  }
}

function printUsage() {
  process.stderr
    .write(`Usage: node ${process.argv[1]} <command> [args...]
    Commands:
      create <name>
        creates a stream and returns its attributes, including ID
      delete <id>
    `);
}

type Configuration = {
  auth: AuthKey;
};

function configure(): Configuration {
  return {
    auth: getAuthKey(),
  };
}

function getAuthKey(): AuthKey {
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    return new ApiKey(apiKey);
  }
  const auth = process.env.AUTH;
  if (!auth) {
    throw new Error(
      "AUTH environment variable is required",
    );
  }
  return parseAuth(auth);
}

// TODO move to the rtckit-node/utils

main();
