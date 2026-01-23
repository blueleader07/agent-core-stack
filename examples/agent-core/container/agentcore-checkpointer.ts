/**
 * AgentCore Memory Checkpoint Saver for TypeScript/JavaScript
 * 
 * This implements a LangGraph checkpointer that stores conversation state
 * in AWS Bedrock AgentCore Memory, enabling conversation persistence across
 * multiple requests.
 * 
 * Based on the Python implementation pattern from langchain-ai/langchain-aws
 */

import { 
  BedrockAgentCoreClient, 
  CreateEventCommand, 
  ListEventsCommand,
  DeleteEventCommand 
} from '@aws-sdk/client-bedrock-agentcore';
import { 
  BaseCheckpointSaver, 
  Checkpoint, 
  CheckpointTuple, 
  CheckpointMetadata,
  type SerializerProtocol
} from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';

interface CheckpointerConfig {
  thread_id: string;
  actor_id: string;
  checkpoint_ns?: string;
  checkpoint_id?: string;
}

interface CheckpointEvent {
  checkpoint_id: string;
  checkpoint_data: Partial<Checkpoint>;
  metadata: CheckpointMetadata;
  parent_checkpoint_id?: string;
  thread_id: string;
  checkpoint_ns: string;
}

interface WritesEvent {
  checkpoint_id: string;
  writes: Array<{ task_id: string; channel: string; value: unknown; task_path: string }>;
}

type EventType = CheckpointEvent | WritesEvent;

/**
 * AgentCore Memory Checkpoint Saver
 * 
 * Persists LangGraph checkpoints to AWS Bedrock AgentCore Memory.
 * 
 * @example
 * ```typescript
 * const checkpointer = new AgentCoreMemorySaver({
 *   memoryId: 'langgraph_agent_memory-QaYdO09lxb',
 *   region: 'us-east-1'
 * });
 * 
 * const graph = buildGraph();
 * const compiled = graph.compile({ checkpointer });
 * 
 * const config = {
 *   configurable: {
 *     thread_id: 'user-session-123',
 *     actor_id: 'agent-1'
 *   }
 * };
 * 
 * await compiled.invoke({ messages: [...] }, config);
 * ```
 */
export class AgentCoreMemorySaver extends BaseCheckpointSaver {
  private client: BedrockAgentCoreClient;
  private memoryId: string;

  constructor(params: {
    memoryId: string;
    region?: string;
    serde?: SerializerProtocol;
  }) {
    super(params.serde);
    this.memoryId = params.memoryId;
    this.client = new BedrockAgentCoreClient({
      region: params.region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Extract config from RunnableConfig
   */
  private getCheckpointerConfig(config: RunnableConfig): CheckpointerConfig {
    const configurable = config.configurable || {};
    
    if (!configurable.thread_id) {
      throw new Error('thread_id is required in config.configurable');
    }
    if (!configurable.actor_id) {
      throw new Error('actor_id is required in config.configurable');
    }

    return {
      thread_id: configurable.thread_id as string,
      actor_id: configurable.actor_id as string,
      checkpoint_ns: (configurable.checkpoint_ns as string) || '',
      checkpoint_id: configurable.checkpoint_id as string | undefined
    };
  }

  /**
   * Serialize event to blob for storage
   */
  private serializeEvent(event: EventType): Uint8Array {
    const json = JSON.stringify(event);
    return new TextEncoder().encode(json);
  }

  /**
   * Deserialize blob from storage to event
   */
  private deserializeEvent(blob: Uint8Array): EventType {
    const json = new TextDecoder().decode(blob);
    return JSON.parse(json);
  }

  /**
   * Store an event in AgentCore Memory
   */
  private async storeEvent(
    event: EventType,
    sessionId: string,
    actorId: string
  ): Promise<void> {
    const serialized = this.serializeEvent(event);
    
    // Convert Uint8Array to base64 string for DocumentType
    const base64 = Buffer.from(serialized).toString('base64');
    
    await this.client.send(
      new CreateEventCommand({
        memoryId: this.memoryId,
        actorId,
        sessionId,
        eventTimestamp: new Date(),
        payload: [{
          blob: base64 as any
        }]
      })
    );
  }

  /**
   * Retrieve events from AgentCore Memory
   */
  private async getEvents(
    sessionId: string,
    actorId: string,
    limit?: number
  ): Promise<EventType[]> {
    const events: EventType[] = [];
    let nextToken: string | undefined;
    let count = 0;

    do {
      const response = await this.client.send(
        new ListEventsCommand({
          memoryId: this.memoryId,
          actorId,
          sessionId,
          maxResults: Math.min(limit ?? 100, 100),
          nextToken,
          includePayloads: true
        })
      );

      for (const event of response.events || []) {
        if (event.payload && event.payload[0]?.blob) {
          // blob is a base64 string, convert back to Uint8Array
          const base64 = event.payload[0].blob as string;
          const bytes = Buffer.from(base64, 'base64');
          events.push(this.deserializeEvent(bytes));
          count++;
          if (limit && count >= limit) {
            return events;
          }
        }
      }

      nextToken = response.nextToken;
    } while (nextToken);

    return events;
  }

  /**
   * Process events and organize by type
   */
  private processEvents(events: EventType[]): {
    checkpoints: Map<string, CheckpointEvent>;
    writes: Map<string, WritesEvent[]>;
  } {
    const checkpoints = new Map<string, CheckpointEvent>();
    const writes = new Map<string, WritesEvent[]>();

    for (const event of events) {
      if ('checkpoint_data' in event) {
        // This is a CheckpointEvent
        checkpoints.set(event.checkpoint_id, event);
      } else if ('writes' in event) {
        // This is a WritesEvent
        const existing = writes.get(event.checkpoint_id) || [];
        existing.push(event);
        writes.set(event.checkpoint_id, existing);
      }
    }

    return { checkpoints, writes };
  }

  /**
   * Build a checkpoint tuple from stored data
   */
  private buildCheckpointTuple(
    checkpointEvent: CheckpointEvent,
    writesEvents: WritesEvent[]
  ): CheckpointTuple {
    const checkpoint: Checkpoint = {
      v: 1,
      id: checkpointEvent.checkpoint_id,
      ts: new Date().toISOString(),
      ...checkpointEvent.checkpoint_data
    } as Checkpoint;

    // Reconstruct pending writes
    const pendingWrites: [string, string, unknown][] = [];
    for (const writesEvent of writesEvents) {
      for (const write of writesEvent.writes) {
        pendingWrites.push([
          write.task_id,
          write.channel,
          write.value
        ]);
      }
    }

    // Get actor_id from metadata (we added it there)
    const actorId = (checkpointEvent.metadata as any).actor_id || 'unknown';

    const config: RunnableConfig = {
      configurable: {
        thread_id: checkpointEvent.thread_id,
        actor_id: actorId,
        checkpoint_ns: checkpointEvent.checkpoint_ns,
        checkpoint_id: checkpointEvent.checkpoint_id
      }
    };

    const parentConfig = checkpointEvent.parent_checkpoint_id
      ? {
          configurable: {
            thread_id: checkpointEvent.thread_id,
            actor_id: actorId,
            checkpoint_ns: checkpointEvent.checkpoint_ns,
            checkpoint_id: checkpointEvent.parent_checkpoint_id
          }
        }
      : undefined;

    return {
      config,
      checkpoint,
      metadata: checkpointEvent.metadata,
      parentConfig,
      pendingWrites
    };
  }

  /**
   * Get a checkpoint tuple from AgentCore Memory
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const checkpointerConfig = this.getCheckpointerConfig(config);
    
    const events = await this.getEvents(
      checkpointerConfig.thread_id,
      checkpointerConfig.actor_id
    );

    const { checkpoints, writes } = this.processEvents(events);

    if (checkpoints.size === 0) {
      return undefined;
    }

    // If checkpoint_id is specified, return that specific checkpoint
    if (checkpointerConfig.checkpoint_id) {
      const checkpointEvent = checkpoints.get(checkpointerConfig.checkpoint_id);
      if (!checkpointEvent) {
        return undefined;
      }
      const writesEvents = writes.get(checkpointerConfig.checkpoint_id) || [];
      return this.buildCheckpointTuple(checkpointEvent, writesEvents);
    }

    // Otherwise, return the latest checkpoint
    const latestId = Array.from(checkpoints.keys()).sort().reverse()[0];
    const checkpointEvent = checkpoints.get(latestId)!;
    const writesEvents = writes.get(latestId) || [];
    return this.buildCheckpointTuple(checkpointEvent, writesEvents);
  }

  /**
   * List checkpoints from AgentCore Memory
   */
  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig; filter?: Record<string, unknown> }
  ): AsyncGenerator<CheckpointTuple> {
    const checkpointerConfig = this.getCheckpointerConfig(config);
    
    const events = await this.getEvents(
      checkpointerConfig.thread_id,
      checkpointerConfig.actor_id,
      options?.limit
    );

    const { checkpoints, writes } = this.processEvents(events);

    // Sort checkpoints by ID in descending order (most recent first)
    const sortedIds = Array.from(checkpoints.keys()).sort().reverse();

    let count = 0;
    for (const checkpointId of sortedIds) {
      if (options?.limit && count >= options.limit) {
        break;
      }

      const checkpointEvent = checkpoints.get(checkpointId)!;
      const writesEvents = writes.get(checkpointId) || [];
      
      yield this.buildCheckpointTuple(checkpointEvent, writesEvents);
      count++;
    }
  }

  /**
   * Save a checkpoint to AgentCore Memory
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const checkpointerConfig = this.getCheckpointerConfig(config);

    // Add actor_id to metadata
    const enrichedMetadata = {
      ...metadata,
      actor_id: checkpointerConfig.actor_id
    };

    const checkpointEvent: CheckpointEvent = {
      checkpoint_id: checkpoint.id,
      checkpoint_data: {
        v: checkpoint.v,
        channel_values: checkpoint.channel_values,
        channel_versions: checkpoint.channel_versions,
        versions_seen: checkpoint.versions_seen
      },
      metadata: enrichedMetadata,
      parent_checkpoint_id: checkpointerConfig.checkpoint_id,
      thread_id: checkpointerConfig.thread_id,
      checkpoint_ns: checkpointerConfig.checkpoint_ns || ''
    };

    await this.storeEvent(
      checkpointEvent,
      checkpointerConfig.thread_id,
      checkpointerConfig.actor_id
    );

    return {
      configurable: {
        thread_id: checkpointerConfig.thread_id,
        actor_id: checkpointerConfig.actor_id,
        checkpoint_ns: checkpointerConfig.checkpoint_ns || '',
        checkpoint_id: checkpoint.id
      }
    };
  }

  /**
   * Save pending writes to AgentCore Memory
   */
  async putWrites(
    config: RunnableConfig,
    writes: [string, unknown][],
    taskId: string
  ): Promise<void> {
    const checkpointerConfig = this.getCheckpointerConfig(config);

    if (!checkpointerConfig.checkpoint_id) {
      throw new Error('checkpoint_id is required for putWrites');
    }

    const writesEvent: WritesEvent = {
      checkpoint_id: checkpointerConfig.checkpoint_id,
      writes: writes.map(([channel, value]) => ({
        task_id: taskId,
        channel,
        value,
        task_path: ''
      }))
    };

    await this.storeEvent(
      writesEvent,
      checkpointerConfig.thread_id,
      checkpointerConfig.actor_id
    );
  }

  /**
   * Delete all checkpoints and writes for a thread
   */
  async deleteThread(threadId: string, actorId?: string): Promise<void> {
    if (!actorId) {
      throw new Error('actor_id is required for deleteThread');
    }

    let nextToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListEventsCommand({
          memoryId: this.memoryId,
          actorId,
          sessionId: threadId,
          maxResults: 100,
          nextToken,
          includePayloads: false
        })
      );

      for (const event of response.events || []) {
        await this.client.send(
          new DeleteEventCommand({
            memoryId: this.memoryId,
            sessionId: threadId,
            eventId: event.eventId!,
            actorId
          })
        );
      }

      nextToken = response.nextToken;
    } while (nextToken);
  }
}
