import { BigInt } from "@graphprotocol/graph-ts";
import { EventCounter } from "../generated/schema";

export function incrementEventCounter(
  entityType: string,
  blockNumber: BigInt,
  blockTimestamp: BigInt
): void {
  let counter = EventCounter.load(entityType);
  if (counter == null) {
    counter = new EventCounter(entityType);
    counter.count = BigInt.fromI32(0);
  }
  counter.count = counter.count.plus(BigInt.fromI32(1));
  counter.lastUpdatedBlock = blockNumber;
  counter.lastUpdatedTimestamp = blockTimestamp;
  counter.save();
}
