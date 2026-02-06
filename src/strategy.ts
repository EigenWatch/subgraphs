import {
  StrategyTokenSet,
  ExchangeRateEmitted,
} from "../generated/templates/Strategy/Strategy";
import { Strategy } from "../generated/schema";
import { log, BigInt } from "@graphprotocol/graph-ts";
import { incrementEventCounter } from "./utils";

export function handleStrategyTokenSet(event: StrategyTokenSet): void {
  log.info("Processing StrategyTokenSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let strategy = Strategy.load(event.address.toHexString());
  if (strategy == null) {
    strategy = new Strategy(event.address.toHexString());
    strategy.address = event.address;
  }

  strategy.underlyingToken = event.params.token;
  strategy.tokenDecimals = event.params.decimals;
  strategy.save();
  incrementEventCounter("Strategy", event.block.number, event.block.timestamp);

  log.info("StrategyTokenSet event saved for strategy: {}", [strategy.id]);
}

export function handleExchangeRateEmitted(event: ExchangeRateEmitted): void {
  log.info("Processing ExchangeRateEmitted event: {}", [
    event.transaction.hash.toHexString(),
  ]);
}
