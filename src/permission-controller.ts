import {
  AdminSet,
  AdminRemoved,
  PendingAdminAdded,
  PendingAdminRemoved,
  AppointeeSet,
  AppointeeRemoved,
} from "../generated/PermissionController/PermissionController";

import {
  PermissionAdminEvent,
  PermissionAppointeeEvent,
} from "../generated/schema";

import { log } from "@graphprotocol/graph-ts";

// ========================================
// ADMIN EVENTS
// ========================================

export function handleAdminSet(event: AdminSet): void {
  log.info("Processing AdminSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new PermissionAdminEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.account = event.params.account;
  entity.admin = event.params.admin;
  entity.eventType = "ADMIN_SET";

  entity.save();
  log.info("AdminSet event saved: {}", [entity.id]);
}

export function handleAdminRemoved(event: AdminRemoved): void {
  log.info("Processing AdminRemoved event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new PermissionAdminEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.account = event.params.account;
  entity.admin = event.params.admin;
  entity.eventType = "ADMIN_REMOVED";

  entity.save();
  log.info("AdminRemoved event saved: {}", [entity.id]);
}

export function handlePendingAdminAdded(event: PendingAdminAdded): void {
  log.info("Processing PendingAdminAdded event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new PermissionAdminEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.account = event.params.account;
  entity.admin = event.params.admin;
  entity.eventType = "PENDING_ADMIN_ADDED";

  entity.save();
  log.info("PendingAdminAdded event saved: {}", [entity.id]);
}

export function handlePendingAdminRemoved(event: PendingAdminRemoved): void {
  log.info("Processing PendingAdminRemoved event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new PermissionAdminEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.account = event.params.account;
  entity.admin = event.params.admin;
  entity.eventType = "PENDING_ADMIN_REMOVED";

  entity.save();
  log.info("PendingAdminRemoved event saved: {}", [entity.id]);
}

// ========================================
// APPOINTEE EVENTS
// ========================================

export function handleAppointeeSet(event: AppointeeSet): void {
  log.info("Processing AppointeeSet event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new PermissionAppointeeEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.account = event.params.account;
  entity.appointee = event.params.appointee;
  entity.target = event.params.target;
  entity.selector = event.params.selector;
  entity.eventType = "APPOINTEE_SET";

  entity.save();
  log.info("AppointeeSet event saved: {}", [entity.id]);
}

export function handleAppointeeRemoved(event: AppointeeRemoved): void {
  log.info("Processing AppointeeRemoved event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let entity = new PermissionAppointeeEvent(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.account = event.params.account;
  entity.appointee = event.params.appointee;
  entity.target = event.params.target;
  entity.selector = event.params.selector;
  entity.eventType = "APPOINTEE_REMOVED";

  entity.save();
  log.info("AppointeeRemoved event saved: {}", [entity.id]);
}
