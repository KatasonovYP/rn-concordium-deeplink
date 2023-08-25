import {Buffer} from 'buffer/';
import {
  SendTransactionPayload,
  SmartContractParameters,
} from '@concordium/browser-wallet-api-helpers';
import {
  AccountTransactionSignature,
  AccountTransactionType,
  JsonRpcClient,
  SchemaVersion,
} from '@concordium/node-sdk';
import {GrpcWebOptions} from '@protobuf-ts/grpcweb-transport';
import {toBuffer} from '@concordium/web-sdk';

export type ModuleSchema = {
  type: 'ModuleSchema';
  value: Buffer;
  version?: SchemaVersion;
};
export type TypeSchema = {
  type: 'TypeSchema';
  value: Buffer;
};

/**
 * Discriminated union type for contract invocation schemas.
 * Is used to select the correct method for encoding the invocation parameters using the schema.
 */
export type Schema = ModuleSchema | TypeSchema;

/**
 * {@link Schema} constructor for a module schema.
 * @param schemaBase64 The raw module schema in base64 encoding.
 * @param version The schema spec version. Omit if the version is embedded into the schema.
 * @throws Error if {@link schemaBase64} is not valid base64.
 */
export function moduleSchemaFromBase64(
  schemaBase64: string,
  version?: SchemaVersion,
): ModuleSchema {
  return moduleSchema(schemaAsBuffer(schemaBase64), version);
}

/**
 * {@link Schema} constructor for a module schema.
 * @param schema The raw module schema in binary.
 * @param version The schema spec version. Omit if the version is embedded into the schema.
 */
export function moduleSchema(
  schema: Buffer,
  version?: SchemaVersion,
): ModuleSchema {
  return {
    type: 'ModuleSchema',
    value: schema,
    version: version,
  };
}

/**
 * {@link Schema} constructor for a type schema.
 * @param schemaBase64 The raw parameter schema in base64 encoding.
 * @throws Error if {@link schemaBase64} is not valid base64.
 */
export function typeSchemaFromBase64(schemaBase64: string): TypeSchema {
  return typeSchema(schemaAsBuffer(schemaBase64));
}

/**
 * {@link Schema} constructor for a type schema.
 * @param schema The raw parameter schema in binary.
 */
export function typeSchema(schema: Buffer): TypeSchema {
  return {
    type: 'TypeSchema',
    value: schema,
  };
}

function schemaAsBuffer(schemaBase64: string) {
  const res = toBuffer(schemaBase64, 'base64');
  // Check round-trip. This requires the provided schema to be properly padded.
  if (res.toString('base64') !== schemaBase64) {
    throw new Error(`provided schema '${schemaBase64}' is not valid base64`);
  }
  return res;
}

export type TypedSmartContractParameters = {
  parameters: SmartContractParameters;
  schema: Schema;
};

export type StringMessage = {
  type: 'StringMessage';
  value: string;
};
export type BinaryMessage = {
  type: 'BinaryMessage';
  value: Buffer;
  schema: TypeSchema;
};

/**
 * Discriminated union type for signable messages.
 */
export type SignableMessage = StringMessage | BinaryMessage;

/**
 * {@link SignableMessage} constructor for a string message.
 * @param msg The message as a plain string.
 */
export function stringMessage(msg: string): StringMessage {
  return {
    type: 'StringMessage',
    value: msg,
  };
}

/**
 * {@link SignableMessage} constructor for binary message.
 * @param msgHex The message represented in hexadecimal notation.
 * @param schema The schema describing the type of the binary message.
 */
export function binaryMessageFromHex(
  msgHex: string,
  schema: TypeSchema,
): BinaryMessage {
  return {
    type: 'BinaryMessage',
    value: messageAsBuffer(msgHex),
    schema,
  };
}

function messageAsBuffer(msgHex: string) {
  const res = toBuffer(msgHex, 'hex');
  // Check round-trip.
  if (res.toString('hex') !== msgHex) {
    throw new Error(`provided message '${msgHex}' is not valid hex`);
  }
  return res;
}

/**
 * Interface for interacting with a wallet backend through a connection that's already been established.
 * The connected account (and in turn connected network/chain) is managed by the wallet
 * and should therefore not generally be considered fixed for a given connection.
 * Even though some protocols support connecting to multiple accounts at the same time,
 * this interface assumes that only one of them is active at any given time.
 * To listen for changes to the connection parameters a {@link WalletConnectionDelegate} implementation
 * should be registered on the {@link WalletConnector} responsible for the concrete protocol.
 */
export interface WalletConnection {
  /**
   * @return The connector that instantiated this connection.
   */
  getConnector(): WalletConnector;

  /**
   * Ping the connection.
   */
  ping(): Promise<void>;

  /**
   * Returns a JSON-RPC client that is ready to perform requests against some Concordium Node connected to network/chain
   * that the connected account lives on.
   *
   * This method is included because it's part of the Browser Wallet API.
   * It should be used with care as it's hard to guarantee that it actually connects to the expected network.
   * As explained in {@link Network.jsonRpcUrl}, the application may easily instantiate its own client and use that instead.
   *
   * Implementation detail: The method cannot be moved to {@link WalletConnector}
   * as the Browser Wallet's internal client doesn't work until a connection has been established.
   *
   * The client implements version 1 of the Node's API which is deprecated in favor of
   * <code>ConcordiumGRPCClient</code> from {@link https://www.npmjs.com/package/@concordium/web-sdk @concordium/web-sdk}.
   *
   * The method {@link BrowserWalletConnector.getGrpcClient} exists for exposing the wallet's internal gRPC Web client for API version 2,
   * but it's not recommended for use in most cases as there's no need for the client to be associated with a particular connection.
   *
   * Instead, instantiate the client manually or using a hook (for React) as described in {@link Network.grpcOpts}.
   *
   * @return A JSON-RPC client for performing requests against a Concordium Node connected to the appropriate network.
   * @throws If the connection uses {@link Network.jsonRpcUrl} and that value is undefined.
   * @throws If the connection is to the Browser Wallet and the installed version doesn't support the method.
   * @deprecated Use <code>ConcordiumGRPCClient<code> instead.
   */
  getJsonRpcClient(): JsonRpcClient;

  /**
   * Assembles a transaction and sends it off to the wallet for approval and submission.
   *
   * The returned promise resolves to the hash of the transaction once the request is approved in the wallet and successfully submitted.
   * If this doesn't happen, the promise rejects with an explanatory error message.
   *
   * If the transaction is a contract init/update, then any contract parameters and a corresponding schema
   * must be provided in {@link typedParams} and parameters must be omitted from {@link payload}.
   * It's an error to provide {@link typedParams} for non-contract transactions and for contract transactions with empty parameters.
   *
   * @param accountAddress The account whose keys are used to sign the transaction.
   * @param type Type of the transaction (i.e. {@link AccountTransactionType.InitContract} or {@link AccountTransactionType.Update}.
   * @param payload The payload of the transaction *not* including the parameters of the contract invocation.
   * @param typedParams The parameters of the contract invocation and a schema describing how to serialize them. The parameters must be given as a plain JavaScript object.
   * @return A promise for the hash of the submitted transaction.
   */
  signAndSendTransaction(
    accountAddress: string,
    type: AccountTransactionType,
    payload: SendTransactionPayload,
    typedParams?: TypedSmartContractParameters,
  ): Promise<string>;

  /**
   * Request the wallet to sign a message using the keys of the given account.
   *
   * The returned promise resolves to the signatures once the wallet approves the request and successfully signs the message.
   * If this doesn't happen, the promise rejects with an explanatory error message.
   *
   * @param accountAddress The account whose keys are used to sign the message.
   * @param msg The message to sign.
   * @return A promise for the signatures of the message.
   */
  signMessage(
    accountAddress: string,
    msg: SignableMessage,
  ): Promise<AccountTransactionSignature>;

  /**
   * Close the connection and clean up relevant resources.
   * There's no guarantee that the wallet will consider the connection closed
   * even after the returned promise resolves successfully,
   * but it should ensure that the app stops using the connection.
   * See the documentation for the concrete implementations for details on what guarantees they provide.
   *
   * @return A promise that resolves once the disconnect has completed.
   */
  disconnect(): Promise<void>;
}

/**
 * Collection of fields corresponding to a particular network/chain.
 */
export interface Network {
  /**
   * The name of the network (i.e. "testnet", "mainnet", etc.).
   */
  name: string;

  /**
   * The hash of the genesis block.
   */
  genesisHash: string;

  /**
   * The connection configuration for a gRPC Web endpoint for performing API (v2) queries against a
   * Concordium Node instance connected to this network.
   *
   * The initialization is straightforward:
   * <pre>
   *   import { ConcordiumGRPCClient } from '@concordium/web-sdk';
   *   import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
   *   ...
   *   const client = new ConcordiumGRPCClient(new GrpcWebFetchTransport(network.grpcOpts!));
   * </pre>
   *
   * For React projects, the hook <code>useGrpcClient</code> in
   * {@link https://www.npmjs.com/package/@concordium/react-components @concordium/react-components}
   * makes it very easy to obtain a client that's always connecting to the expected network.
   */
  grpcOpts: GrpcWebOptions | undefined;

  /**
   * The URL of a {@link https://github.com/Concordium/concordium-json-rpc Concordium JSON-RPC proxy} instance
   * for performing API (v1) queries against a Concordium Node instance connected to this network.
   *
   * The value is currently used only for {@link WalletConnectConnection WalletConnect connections}
   * as {@link BrowserWalletConnector Browser Wallet connections} use the Browser Wallet's internal client.
   *
   * Setting the URL to the empty string disables the automatic initialization of the client returned by
   * {@link WalletConnection.getJsonRpcClient} for WalletConnect connections.
   * The concrete implementation {@link WalletConnectConnection.getJsonRpcClient} will then throw an exception
   * as there is no client instance to return.
   *
   * There is no fundamental difference between using a client belonging to a connection compared to one that is initialized directly.
   * Keeping it separate from connections gives the dApp more control and allows the client to be used even if no connections have been established.
   *
   * Initializing a separate client is straightforward:
   * <pre>
   *   import { HttpProvider, JsonRpcClient } from '@concordium/web-sdk';
   *   ...
   *   const client = new JsonRpcClient(new HttpProvider(network.jsonRpcUrl));
   * </pre>
   */
  jsonRpcUrl: string;

  /**
   * The base URL of a {@link https://github.com/Concordium/concordium-scan CCDScan} instance
   * connected to this network.
   * While CCDScan supports queries against its backend,
   * the main use of this URL is to construct links to the frontend.
   */
  ccdScanBaseUrl: string;
}

/**
 * Interface for receiving events in a standardized set of callbacks.
 * As the relevant {@link WalletConnection} is passed into the callback,
 * apps will usually create a single delegate to be reused across all {@link WalletConnector}s
 * over the entire lifetime of the application.
 * The methods could be called redundantly,
 * so implementations should check the argument values against the current state and only react if they differ.
 */
export interface WalletConnectionDelegate {
  /**
   * Notification that the network/chain of the given {@link WalletConnection} has changed, as reported by the wallet.
   * @param connection Affected connection.
   * @param genesisHash The hash of the genesis block corresponding to the current chain.
   */
  onChainChanged(connection: WalletConnection, genesisHash: string): void;

  /**
   * Notification that the account selected on the given {@link WalletConnection} has changed, as reported by the wallet.
   * @param connection Affected connection.
   * @param address The address of the currently connected account.
   */
  onAccountChanged(
    connection: WalletConnection,
    address: string | undefined,
  ): void;

  /**
   * Notification that the given {@link WalletConnection} has been established.
   * @param connection Affected connection.
   * @param address The address of the initially connected account.
   */
  onConnected(connection: WalletConnection, address: string | undefined): void;

  /**
   * Notification that the given {@link WalletConnection} has been disconnected.
   * @param connection Affected connection.
   */
  onDisconnected(connection: WalletConnection): void;
}

/**
 * Interface for wrapping a client for a concrete protocol and handle events emitted by this client:
 * A {@link WalletConnectionDelegate} is usually passed to the connector on construction
 * to receive events in a standardized format.
 * The implementation may support multiple connections being instantiated from a single connector.
 */
export interface WalletConnector {
  /**
   * Request a connected to be initiated over the underlying protocol.
   *
   * Once the wallet approves the connection, the returned promise resolves to the connection object.
   * If the user cancels the connection before it's established, then the promise resolves to undefined.
   * Not all connectors support cancellation.
   *
   * If the wallet rejects the connection (or establishing it fails for other reasons),
   * then the promise rejects with an explanatory error message.
   *
   * @return A promise resolving to the resulting connection object.
   */
  connect(): Promise<WalletConnection | undefined>;

  /**
   * Get a list of all connections initiated by this connector that have not been disconnected.
   * @return A promise resolving to all the connector's connections.
   */
  getConnections(): WalletConnection[];

  /**
   * Ensure that all connections initiated by this connector are disconnected
   * and clean up resources associated to the connector.
   * See the documentation for the concrete implementations for details on what guarantees they provide.
   */
  disconnect(): Promise<void>;
}

/**
 * Convenience function for invoking an async function with the JSON-RPC proxy client of the given {@link WalletConnection}.
 *
 * @param connection The connected used to resolve the RPC client.
 * @param f The async function to invoke.
 * @return The promise returned by {@link f}.
 */
export async function withJsonRpcClient<T>(
  connection: WalletConnection,
  f: (c: JsonRpcClient) => Promise<T>,
) {
  return f(connection.getJsonRpcClient());
}