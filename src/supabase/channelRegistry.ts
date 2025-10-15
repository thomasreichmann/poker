type ClientLike = {
  removeChannel: (ch: unknown) => Promise<unknown> | unknown;
};

type ChannelRef = {
  channel: unknown;
  refCount: number;
};

class ChannelRegistry {
  private registry = new Map<string, ChannelRef>();

  acquire<TChannel>(topic: string, create: () => TChannel): TChannel {
    const existing = this.registry.get(topic);
    if (existing) {
      existing.refCount += 1;
      return existing.channel as TChannel;
    }
    const channel = create();
    this.registry.set(topic, { channel, refCount: 1 });
    return channel;
  }

  async release(client: ClientLike, topic: string) {
    const ref = this.registry.get(topic);
    if (!ref) return;
    ref.refCount -= 1;
    if (ref.refCount <= 0) {
      try {
        await client.removeChannel(ref.channel);
      } catch {}
      this.registry.delete(topic);
    } else {
      this.registry.set(topic, ref);
    }
  }

  get<TChannel>(topic: string): TChannel | undefined {
    return this.registry.get(topic)?.channel as TChannel | undefined;
  }
}

export const channelRegistry = new ChannelRegistry();
